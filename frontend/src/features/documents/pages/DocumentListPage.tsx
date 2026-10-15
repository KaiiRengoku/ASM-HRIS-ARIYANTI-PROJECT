import { useState } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/services/api';
import { extractErrorMessage } from '@/services/apiError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PdfPreview } from '@/components/ui/pdf-preview';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuthStore } from '@/stores/authStore';

// Plafon ukuran dokumen — harus sama dengan validasi backend (max:51200 = 50 MB).
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = '50 MB';

const fetchDocuments = async (params: { page?: number; search?: string; employee_id?: number }) => {
    const response = await api.get('/documents', { params });
    return response.data;
};

const uploadDocument = async (data: FormData) => {
    const response = await api.post('/documents', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

const deleteDocument = async (id: number) => {
    await api.delete(`/documents/${id}`);
};

export default function DocumentListPage() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [open, setOpen] = useState(false);
    const [employeeId, setEmployeeId] = useState('');
    const [documentType, setDocumentType] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const queryClient = useQueryClient();
    const { hasPermission, hasRole, user } = useAuthStore();
    const canDelete = hasPermission('document.delete');
    const canUpload = hasPermission('document.upload');
    // Hanya role berikut yang boleh melihat dokumen SELURUH pegawai (sama seperti backend).
    // KABAG/PEGAWAI/DOSEN hanya melihat dokumennya sendiri.
    const canViewAll = ['HRD', 'DIREKTUR', 'PD_I', 'PD_II', 'PD_III'].some((r) => hasRole(r));

    const [filterEmployeeId, setFilterEmployeeId] = useState('');
    const [previewDoc, setPreviewDoc] = useState<{ id: number; file_name: string; document_type: string; mime_type: string | null } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const debouncedSearch = useDebounce(search);

    const { data, isLoading, error } = useQuery({
        queryKey: ['documents', page, debouncedSearch, filterEmployeeId],
        queryFn: () => fetchDocuments({ page, search: debouncedSearch || undefined, employee_id: filterEmployeeId ? Number(filterEmployeeId) : undefined }),
        placeholderData: keepPreviousData,
    });

    const downloadDocument = async (doc: any) => {
        const res = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', doc.file_name || `dokumen_${doc.id}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    const closePreview = () => {
        setPreviewDoc(null);
        setPreviewError(null);
        setPreviewUrl((current) => {
            if (current) window.URL.revokeObjectURL(current);
            return null;
        });
    };

    const openPreview = async (doc: { id: number; file_name: string; document_type: string; mime_type: string | null }) => {
        setPreviewDoc(doc);
        setPreviewError(null);
        // Lepaskan URL pratinjau lama sebelum menimpa, supaya blob tidak menumpuk.
        setPreviewUrl((current) => {
            if (current) window.URL.revokeObjectURL(current);
            return null;
        });
        setPreviewLoading(true);
        try {
            const res = await api.get(`/documents/${doc.id}/preview`, { responseType: 'blob' });
            const data = res.data as Blob;
            const headerType = String(res.headers['content-type'] || '').split(';')[0].trim();
            const type = headerType && headerType !== 'application/json' ? headerType : (doc.mime_type || 'application/octet-stream');
            // Respons error (401/403/404) datang sebagai JSON; jangan dirender sebagai PDF.
            if (type === 'application/json' || data.type === 'application/json') {
                setPreviewError('Pratinjau tidak tersedia. Silakan unduh untuk membuka.');
            } else {
                setPreviewUrl(window.URL.createObjectURL(new Blob([data], { type })));
            }
        } catch {
            setPreviewError('Gagal memuat pratinjau dokumen.');
        } finally {
            setPreviewLoading(false);
        }
    };

    const previewKind = (doc: { mime_type: string | null; file_name: string }): 'image' | 'pdf' | 'other' => {
        const mime = doc.mime_type || '';
        const name = (doc.file_name || '').toLowerCase();
        if (mime.startsWith('image/') || /\.(jpe?g|png)$/.test(name)) return 'image';
        if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
        return 'other';
    };

    // Bila hanya boleh melihat dokumen sendiri, daftar pegawai untuk filter/dialog upload tidak diperlukan.
    const selfEmployeeId = user?.employee_id ? String(user.employee_id) : '';
    const { data: employees } = useQuery({
        queryKey: ['employees-list'],
        queryFn: async () => (await api.get('/employees?per_page=100')).data.data,
        enabled: canViewAll,
    });

    const uploadMutation = useMutation({
        mutationFn: uploadDocument,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            toast({ title: 'Berhasil', description: 'Dokumen berhasil diunggah.' });
            setOpen(false);
            setFile(null);
            setEmployeeId('');
            setDocumentType('');
        },
        onError: (e: unknown) => toast({ title: 'Gagal', description: extractErrorMessage(e), variant: 'destructive' }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteDocument,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            toast({ title: 'Berhasil', description: 'Dokumen dihapus.' });
        },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });
    const [confirmDoc, setConfirmDoc] = useState<{ id: number; file_name: string } | null>(null);

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        // Bila terbatas pada dokumen sendiri, unggahan selalu untuk dirinya (dropdown pegawai disembunyikan).
        const targetEmployeeId = canViewAll ? employeeId : selfEmployeeId;
        if (!targetEmployeeId || !documentType || !file) {
            toast({ title: 'Gagal', description: 'Semua field wajib diisi.', variant: 'destructive' });
            return;
        }
        // Cegah unggahan besar sebelum dikirim: pengguna dapat pesan jelas, server tidak dibebani.
        if (file.size > MAX_FILE_SIZE) {
            toast({
                title: 'File terlalu besar',
                description: `Ukuran file melebihi ${MAX_FILE_SIZE_LABEL}. Silakan kompres atau pilih file lebih kecil.`,
                variant: 'destructive',
            });
            return;
        }
        const formData = new FormData();
        formData.append('employee_id', targetEmployeeId);
        formData.append('document_type', documentType);
        formData.append('file', file);
        uploadMutation.mutate(formData);
    };

    if (error) return <div className="p-6 text-destructive">Gagal memuat dokumen.</div>;

    const documents = data?.data || [];
    const meta = data?.meta;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Dokumen Pegawai</h1>
                    <p className="text-muted-foreground">Kelola dokumen pegawai</p>
                </div>
                {canUpload && (
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>+ Upload Dokumen</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Upload Dokumen</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleUpload} className="space-y-4">
                            {canViewAll ? (
                            <div>
                                <Label>Pegawai</Label>
                                <Select value={employeeId} onValueChange={setEmployeeId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih pegawai (nama - Nomor Induk Kepegawaian)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees?.map((emp: any) => (
                                            <SelectItem key={emp.id} value={String(emp.id)}>
                                                {emp.nama_lengkap} - {emp.nik}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            ) : (
                            <div>
                                <Label>Pegawai</Label>
                                <Input value={user?.name || ''} disabled readOnly />
                                <p className="text-xs text-muted-foreground">Dokumen diunggah untuk akun Anda sendiri.</p>
                            </div>
                            )}
                            <div>
                                <Label>Jenis Dokumen</Label>
                                <Select value={documentType} onValueChange={setDocumentType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih jenis" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="KTP">KTP</SelectItem>
                                        <SelectItem value="Ijazah">Ijazah</SelectItem>
                                        <SelectItem value="Sertifikat">Sertifikat</SelectItem>
                                        <SelectItem value="Surat Tugas">Surat Tugas</SelectItem>
                                        <SelectItem value="KK">KK</SelectItem>
                                        <SelectItem value="NPWP">NPWP</SelectItem>
                                        <SelectItem value="SK Pengangkatan">SK Pengangkatan</SelectItem>
                                        <SelectItem value="Foto">Foto</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>File</Label>
                                <Input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">Maksimal {MAX_FILE_SIZE_LABEL}, format PDF/JPG/PNG</p>
                            </div>
                            <Button type="submit" disabled={uploadMutation.isPending}>
                                {uploadMutation.isPending ? 'Mengunggah...' : 'Upload'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
                )}
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Cari Dokumen</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4 flex-wrap">
                    <Input
                        placeholder="Cari berdasarkan nama pegawai atau Nomor Induk Kepegawaian..."
                        value={search}
                        autoComplete="off"
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="max-w-md"
                    />
                    {canViewAll && (
                    <Select value={filterEmployeeId || 'all'} onValueChange={(v) => { setFilterEmployeeId(v === 'all' ? '' : v); setPage(1); }}>
                        <SelectTrigger className="w-64"><SelectValue placeholder="Semua pegawai" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua pegawai</SelectItem>
                            {employees?.map((emp: any) => (
                                <SelectItem key={emp.id} value={String(emp.id)}>{emp.nama_lengkap} - {emp.nik}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    {/* Mobile: kartu per dokumen — tabel 6 kolom tak muat di layar sempit. */}
                    <div className="divide-y md:hidden">
                        {isLoading ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">Memuat dokumen...</p>
                        ) : documents.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada dokumen</p>
                        ) : (
                            documents.map((doc: any) => (
                                <div key={doc.id} className="space-y-3 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium" title={doc.file_name}>{doc.file_name}</p>
                                            <p className="text-xs text-muted-foreground">{doc.document_type}</p>
                                        </div>
                                    </div>
                                    {canViewAll && (
                                        <p className="truncate text-xs" title={doc.employee?.nama_lengkap || ''}>
                                            <span className="text-muted-foreground">Pegawai: </span>{doc.employee?.nama_lengkap || '-'}
                                        </p>
                                    )}
                                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                                        <div><dt className="text-muted-foreground">Ukuran</dt><dd>{(doc.file_size / 1024).toFixed(1)} KB</dd></div>
                                        <div><dt className="text-muted-foreground">Diunggah</dt><dd>{new Date(doc.created_at).toLocaleDateString()}</dd></div>
                                    </dl>
                                    <div className="flex flex-wrap gap-2">
                                        <Button variant="outline" size="sm" onClick={() => openPreview(doc)}>Preview</Button>
                                        <Button variant="outline" size="sm" onClick={() => downloadDocument(doc)}>Unduh</Button>
                                        {canDelete && (
                                            <Button variant="destructive" size="sm" onClick={() => setConfirmDoc({ id: doc.id, file_name: doc.file_name })}>Hapus</Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {canViewAll && <TableHead>Pegawai</TableHead>}
                                <TableHead>Jenis</TableHead>
                                <TableHead>Nama File</TableHead>
                                <TableHead>Ukuran</TableHead>
                                <TableHead>Diunggah</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={canViewAll ? 6 : 5} className="text-center text-muted-foreground">Memuat dokumen...</TableCell>
                                </TableRow>
                            ) : documents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={canViewAll ? 6 : 5} className="text-center text-muted-foreground">Belum ada dokumen</TableCell>
                                </TableRow>
                            ) : (
                                documents.map((doc: any) => (
                                    <TableRow key={doc.id}>
                                        {canViewAll && <TableCell>{doc.employee?.nama_lengkap || '-'}</TableCell>}
                                        <TableCell>{doc.document_type}</TableCell>
                                        <TableCell>{doc.file_name}</TableCell>
                                        <TableCell>{(doc.file_size / 1024).toFixed(1)} KB</TableCell>
                                        <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-wrap justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => openPreview(doc)}>Preview</Button>
                                            <Button variant="outline" size="sm" onClick={() => downloadDocument(doc)}>Unduh</Button>
                                            {canDelete && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => setConfirmDoc({ id: doc.id, file_name: doc.file_name })}
                                            >
                                                Hapus
                                            </Button>
                                            )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
            </Card>

            {meta && meta.last_page > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                        Halaman {meta.current_page} dari {meta.last_page}
                    </p>
                    <div className="space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Sebelumnya
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                            disabled={page === meta.last_page}
                        >
                            Selanjutnya
                        </Button>
                    </div>
                </div>
            )}

            <Dialog open={!!previewDoc} onOpenChange={(v) => { if (!v) closePreview(); }}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>
                            {previewDoc ? `${previewDoc.document_type} — ${previewDoc.file_name}` : 'Pratinjau Dokumen'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="min-h-[50vh] flex items-center justify-center rounded-md border bg-muted/30 p-2">
                        {previewLoading ? (
                            <p className="text-muted-foreground">Memuat pratinjau...</p>
                        ) : previewError ? (
                            <p className="text-destructive">{previewError}</p>
                        ) : previewUrl && previewDoc ? (
                            previewKind(previewDoc) === 'image' ? (
                                <img src={previewUrl} alt={previewDoc.file_name} className="max-h-[70vh] w-auto rounded object-contain" />
                            ) : previewKind(previewDoc) === 'pdf' ? (
                                <PdfPreview url={previewUrl} fileName={previewDoc.file_name} />
                            ) : (
                                <p className="text-muted-foreground">Pratinjau tidak tersedia untuk jenis file ini. Silakan unduh untuk membuka.</p>
                            )
                        ) : null}
                    </div>
                    <div className="flex justify-end gap-2">
                        {previewDoc && (
                            <Button variant="outline" onClick={() => downloadDocument(previewDoc)}>Unduh</Button>
                        )}
                        <Button variant="outline" onClick={closePreview}>Tutup</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!confirmDoc}
                onOpenChange={(v) => { if (!v) setConfirmDoc(null); }}
                title="Hapus Dokumen"
                description={`Hapus dokumen "${confirmDoc?.file_name ?? ''}"? Tindakan ini permanen dan tidak bisa dibatalkan.`}
                confirmLabel="Hapus"
                destructive
                onConfirm={() => { if (confirmDoc) deleteMutation.mutate(confirmDoc.id); }}
            />
        </div>
    );
}
