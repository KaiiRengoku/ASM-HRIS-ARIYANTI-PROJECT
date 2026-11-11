import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

interface PhotoDoc {
    id: number;
    document_type?: string | null;
    file_name?: string | null;
}

/**
 * Unggah/ganti foto pegawai langsung (tanpa lewat menu Dokumen).
 * Foto disimpan sebagai dokumen tipe "Foto" — dipakai export biodata & laporan.
 */
export default function PhotoUploadField({ employeeId }: { employeeId: number }) {
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const { data: docs } = useQuery({
        queryKey: ['photo-doc', employeeId],
        queryFn: async () =>
            (await api.get('/documents', { params: { employee_id: employeeId, per_page: 100 } })).data.data as PhotoDoc[],
    });
    const fotoDoc = docs?.find((d) => d.document_type === 'Foto') ?? null;

    const { data: fotoUrl } = useQuery({
        queryKey: ['photo-preview', fotoDoc?.id],
        enabled: !!fotoDoc,
        queryFn: async () => {
            const res = await api.get(`/documents/${fotoDoc!.id}/preview`, { responseType: 'blob' });
            // ponytail: object URL preview tidak di-revoke (leak kecil, dipakai sepanjang halaman terbuka).
            const contentType = res.headers['content-type'];
            return window.URL.createObjectURL(new Blob([res.data], { type: typeof contentType === 'string' ? contentType : 'image/jpeg' }));
        },
    });

    const onPick = (f: File | null) => {
        setFile(f);
        setFileUrl(f ? window.URL.createObjectURL(f) : null);
    };

    const onUpload = async () => {
        if (!file) return;
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append('employee_id', String(employeeId));
            fd.append('document_type', 'Foto');
            fd.append('file', file);
            await api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast({ title: 'Berhasil', description: 'Foto pegawai berhasil diunggah.' });
            onPick(null);
            queryClient.invalidateQueries({ queryKey: ['photo-doc'] });
            queryClient.invalidateQueries({ queryKey: ['profile-documents'] });
        } catch {
            toast({ title: 'Gagal', description: 'Gagal mengunggah foto.', variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    const preview = fileUrl ?? fotoUrl;

    return (
        <div className="flex items-start gap-4">
            <div className="h-24 w-20 shrink-0 overflow-hidden rounded border bg-muted/40">
                {preview ? (
                    <img src={preview} alt="Foto pegawai" className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        Tanpa Foto
                    </div>
                )}
            </div>
            <div className="space-y-2">
                <Label htmlFor={`foto-input-${employeeId}`}>Foto Pegawai (JPG/PNG, maks 50MB)</Label>
                <div className="space-y-2">
                    <input
                        id={`foto-input-${employeeId}`}
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    <div className="flex items-center gap-2">
                        <Button type="button" size="sm" onClick={onUpload} disabled={!file || busy}>
                            {busy ? 'Mengunggah...' : 'Unggah Foto'}
                        </Button>
                        {fotoDoc && !file && <span className="text-xs text-muted-foreground">Foto saat ini: {fotoDoc.file_name || '-'}</span>}
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">Foto tampil di profil & dokumen export (biodata PDF/Word, laporan data pegawai).</p>
            </div>
        </div>
    );
}
