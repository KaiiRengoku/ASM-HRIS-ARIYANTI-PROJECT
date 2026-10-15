import { useEffect, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

/**
 * Renderer PDF di dalam elemen `<canvas>` memakai `pdfjs-dist`.
 *
 * Viewer bawaan browser (iframe/object) menampilkan "Failed to load PDF
 * document" pada sebagian berkas, jadi PDF digambar sendiri di sini.
 */
GlobalWorkerOptions.workerSrc = workerUrl;

type PdfPreviewProps = {
  url: string;
  fileName: string;
};

export function PdfPreview({ url, fileName }: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    setPage(1);
    setPageCount(0);
    setStatus("loading");
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;

    const render = async () => {
      try {
        loaded = await getDocument(url).promise;
        if (cancelled) {
          await loaded.destroy();
          return;
        }
        setPageCount(loaded.numPages);

        const docPage = await loaded.getPage(page);
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        const containerWidth = canvas.parentElement?.clientWidth || canvas.clientWidth || 800;
        const baseViewport = docPage.getViewport({ scale: 1 });
        const viewport = docPage.getViewport({ scale: Math.min(2, containerWidth / baseViewport.width) });
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas 2D context tidak tersedia.");

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await docPage.render({ canvasContext: context, viewport }).promise;
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    void render();

    return () => {
      cancelled = true;
      void loaded?.destroy();
    };
  }, [url, page]);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="max-h-[70vh] w-full overflow-auto rounded border bg-white p-2">
        <canvas ref={canvasRef} className="mx-auto block h-auto max-w-full" aria-label={fileName} />
      </div>
      {status === "error" ? (
        <p className="text-sm text-destructive">Gagal menampilkan pratinjau PDF. Silakan unduh untuk membuka.</p>
      ) : null}
      {pageCount > 1 ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Sebelumnya
          </button>
          <span className="text-sm text-muted-foreground">Halaman {page} dari {pageCount}</span>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount}
          >
            Berikutnya
          </button>
        </div>
      ) : null}
    </div>
  );
}
