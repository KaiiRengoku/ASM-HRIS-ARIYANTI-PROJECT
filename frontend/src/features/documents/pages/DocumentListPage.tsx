import { useState } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

    const [filterEmployeeId, setFilterEmployeeId] = useState('');
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
    };

    const { data: employees } = useQuery({
        queryKey: ['employees-list'],
        queryFn: async () => (await api.get('/employees?per_page=100')).data.data,
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
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteDocument,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            toast({ title: 'Berhasil', description: 'Dokumen dihapus.' });
        },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        if (!employeeId || !documentType || !file) {
            toast({ title: 'Gagal', description: 'Semua field wajib diisi.', variant: 'destructive' });
            return;
        }
        const formData = new FormData();
        formData.append('employee_id', employeeId);
        formData.append('document_type', documentType);
        formData.append('file', file);
        uploadMutation.mutate(formData);
    };

    if (error) return <div className="p-6 text-destructive">Gagal memuat dokumen.</div>;

    const documents = data?.data || [];
    const meta = data?.meta;

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Dokumen Pegawai</h1>
                    <p className="text-muted-foreground">Kelola dokumen pegawai</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>+ Upload Dokumen</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Upload Dokumen</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <Label>Pegawai</Label>
                                <Select value={employeeId} onValueChange={setEmployeeId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih pegawai (nama - NIK)" />
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
                                <p className="text-xs text-muted-foreground">Maksimal 10 MB, format PDF/JPG/PNG</p>
                            </div>
                            <Button type="submit" disabled={uploadMutation.isPending}>
                                {uploadMutation.isPending ? 'Mengunggah...' : 'Upload'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Cari Dokumen</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4 flex-wrap">
                    <Input
                        placeholder="Cari berdasarkan nama pegawai atau NIK..."
                        value={search}
                        autoComplete="off"
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="max-w-md"
                    />
                    <Select value={filterEmployeeId || 'all'} onValueChange={(v) => { setFilterEmployeeId(v === 'all' ? '' : v); setPage(1); }}>
                        <SelectTrigger className="w-64"><SelectValue placeholder="Semua pegawai" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua pegawai</SelectItem>
                            {employees?.map((emp: any) => (
                                <SelectItem key={emp.id} value={String(emp.id)}>{emp.nama_lengkap} - {emp.nik}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pegawai</TableHead>
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
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">Memuat dokumen...</TableCell>
                                </TableRow>
                            ) : documents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">Belum ada dokumen</TableCell>
                                </TableRow>
                            ) : (
                                documents.map((doc: any) => (
                                    <TableRow key={doc.id}>
                                        <TableCell>{doc.employee?.nama_lengkap || '-'}</TableCell>
                                        <TableCell>{doc.document_type}</TableCell>
                                        <TableCell>{doc.file_name}</TableCell>
                                        <TableCell>{(doc.file_size / 1024).toFixed(1)} KB</TableCell>
                                        <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => downloadDocument(doc)}>Unduh</Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => deleteMutation.mutate(doc.id)}
                                            >
                                                Hapus
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {meta && meta.last_page > 1 && (
                <div className="flex items-center justify-between">
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
        </div>
    );
}