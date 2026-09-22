import { useState } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/stores/authStore';

const fetchLeaves = async (params: { page?: number; search?: string; status?: string }) => {
    const response = await api.get('/leaves', { params });
    return response.data;
};

const approveLeave = async (id: number) => { await api.post(`/leaves/${id}/approve`); };
const rejectLeave = async ({ id, reason }: { id: number; reason: string }) => { await api.post(`/leaves/${id}/reject`, { reason }); };
const cancelLeave = async (id: number) => { await api.post(`/leaves/${id}/cancel`); };

export default function LeaveListPage() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [rejectId, setRejectId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [adjustOpen, setAdjustOpen] = useState(false);
    const [createForm, setCreateForm] = useState<any>({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '', emergency_address: '', emergency_contact: '', is_emergency: false, emergency_reason: '' });
    const [createFile, setCreateFile] = useState<File | null>(null);
    const [adjustForm, setAdjustForm] = useState<any>({ employee_id: '', leave_type_id: '', amount: '', reason: '' });
    const queryClient = useQueryClient();
    const { hasRole, user } = useAuthStore();
    const isHrd = hasRole('HRD');
    const canApprove = hasRole('HRD') || hasRole('KABAG');

    const debouncedSearch = useDebounce(search);
    const normalizedStatus = statusFilter === 'all' ? '' : statusFilter;

    const { data, isLoading, error } = useQuery({
        queryKey: ['leaves', page, debouncedSearch, normalizedStatus],
        queryFn: () => fetchLeaves({ page, search: debouncedSearch || undefined, status: normalizedStatus || undefined }),
        placeholderData: keepPreviousData,
    });

    const { data: employees } = useQuery({
        queryKey: ['employees-list'],
        queryFn: async () => (await api.get('/employees?per_page=100')).data.data,
        enabled: isHrd,
    });

    const { data: leaveTypes } = useQuery({
        queryKey: ['leave-types'],
        queryFn: async () => (await api.get('/leave-types')).data.data,
    });

    const approveMutation = useMutation({
        mutationFn: approveLeave,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leaves'] }); toast({ title: 'Berhasil', description: 'Pengajuan disetujui.' }); },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const rejectMutation = useMutation({
        mutationFn: rejectLeave,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leaves'] }); toast({ title: 'Berhasil', description: 'Pengajuan ditolak.' }); setRejectId(null); setRejectReason(''); },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const cancelMutation = useMutation({
        mutationFn: cancelLeave,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leaves'] }); toast({ title: 'Berhasil', description: 'Pengajuan dibatalkan.' }); },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const createMutation = useMutation({
        mutationFn: async (payload: FormData) => api.post('/leaves', payload, { headers: { 'Content-Type': 'multipart/form-data' } }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            toast({ title: 'Berhasil', description: 'Pengajuan cuti berhasil dikirim.' });
            setCreateOpen(false);
            setCreateForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '', emergency_address: '', emergency_contact: '', is_emergency: false, emergency_reason: '' });
            setCreateFile(null);
        },
        onError: (e: any) => toast({ title: 'Gagal', description: e.response?.data?.message || 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const adjustMutation = useMutation({
        mutationFn: async (payload: any) => api.post('/leave-balances/adjust', payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            toast({ title: 'Berhasil', description: 'Saldo cuti disesuaikan.' });
            setAdjustOpen(false);
            setAdjustForm({ employee_id: '', leave_type_id: '', amount: '', reason: '' });
        },
        onError: (e: any) => toast({ title: 'Gagal', description: e.response?.data?.message || 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const submitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('employee_id', createForm.employee_id);
        fd.append('leave_type_id', createForm.leave_type_id);
        fd.append('start_date', createForm.start_date);
        fd.append('end_date', createForm.end_date);
        if (createForm.reason) fd.append('reason', createForm.reason);
        if (createFile) fd.append('attachment', createFile);
        if (createForm.emergency_address) fd.append('emergency_address', createForm.emergency_address);
        if (createForm.emergency_contact) fd.append('emergency_contact', createForm.emergency_contact);
        fd.append('is_emergency', createForm.is_emergency ? '1' : '0');
        if (createForm.is_emergency && createForm.emergency_reason) fd.append('emergency_reason', createForm.emergency_reason);
        createMutation.mutate(fd);
    };

    const daysUntilStart = createForm.start_date
        ? Math.floor((new Date(createForm.start_date).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
        : null;

    if (error) return <div className="p-6 text-destructive">Gagal memuat data.</div>;

    const leaves = data?.data || [];
    const meta = data?.meta;

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Cuti & Izin</h1>
                    <p className="text-muted-foreground">Kelola pengajuan cuti dan izin</p>
                </div>
                <div className="flex gap-2">
                    {isHrd && (
                    <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">+ Sesuaikan Saldo</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Penyesuaian Saldo Cuti</DialogTitle></DialogHeader>
                            <form onSubmit={(e) => { e.preventDefault(); adjustMutation.mutate({ ...adjustForm, amount: Number(adjustForm.amount) }); }} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Pegawai</Label>
                                    <Select value={adjustForm.employee_id} onValueChange={(v) => setAdjustForm((f: any) => ({ ...f, employee_id: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Pilih pegawai" /></SelectTrigger>
                                        <SelectContent>
                                            {employees?.map((emp: any) => (<SelectItem key={emp.id} value={String(emp.id)}>{emp.nama_lengkap}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Jenis Cuti</Label>
                                    <Select value={adjustForm.leave_type_id} onValueChange={(v) => setAdjustForm((f: any) => ({ ...f, leave_type_id: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                                        <SelectContent>
                                            {leaveTypes?.map((t: any) => (<SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Jumlah Hari (+/-)</Label>
                                    <Input type="number" step="0.5" value={adjustForm.amount} onChange={(e) => setAdjustForm((f: any) => ({ ...f, amount: e.target.value }))} placeholder="+2 atau -1" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Alasan</Label>
                                    <Input value={adjustForm.reason} onChange={(e) => setAdjustForm((f: any) => ({ ...f, reason: e.target.value }))} required />
                                </div>
                                <Button type="submit" disabled={adjustMutation.isPending}>{adjustMutation.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                    )}

                    <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) { setCreateForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '', emergency_address: '', emergency_contact: '', is_emergency: false, emergency_reason: '' }); setCreateFile(null); } }}>
                        <DialogTrigger asChild>
                            <Button>+ Ajukan Cuti</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Ajukan Cuti / Izin</DialogTitle></DialogHeader>
                            <form onSubmit={submitCreate} className="space-y-4">
                                {isHrd ? (
                                <div className="space-y-2">
                                    <Label>Pegawai</Label>
                                    <Select value={createForm.employee_id} onValueChange={(v) => setCreateForm((f: any) => ({ ...f, employee_id: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Pilih pegawai" /></SelectTrigger>
                                        <SelectContent>
                                            {employees?.map((emp: any) => (<SelectItem key={emp.id} value={String(emp.id)}>{emp.nama_lengkap}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                ) : (
                                <div className="space-y-2">
                                    <Label>Pegawai</Label>
                                    <p className="text-sm font-medium">{user?.name || '-'}</p>
                                </div>
                                )}
                                <div className="space-y-2">
                                    <Label>Jenis Cuti</Label>
                                    <Select value={createForm.leave_type_id} onValueChange={(v) => setCreateForm((f: any) => ({ ...f, leave_type_id: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                                        <SelectContent>
                                            {leaveTypes?.map((t: any) => (<SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tanggal Mulai</Label>
                                        <Input type="date" value={createForm.start_date} onChange={(e) => setCreateForm((f: any) => ({ ...f, start_date: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tanggal Selesai</Label>
                                        <Input type="date" value={createForm.end_date} onChange={(e) => setCreateForm((f: any) => ({ ...f, end_date: e.target.value }))} required />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Alamat Selama Cuti</Label>
                                    <Input value={createForm.emergency_address} onChange={(e) => setCreateForm((f: any) => ({ ...f, emergency_address: e.target.value }))} placeholder="Alamat yang dapat dihubungi" />
                                </div>
                                <div className="space-y-2">
                                    <Label>No. Kontak Darurat</Label>
                                    <Input value={createForm.emergency_contact} onChange={(e) => setCreateForm((f: any) => ({ ...f, emergency_contact: e.target.value }))} placeholder="Nomor telepon" />
                                </div>
                                {daysUntilStart !== null && daysUntilStart < 7 && (
                                    <div className="space-y-3 p-3 border border-yellow-300 bg-yellow-50 rounded-md">
                                        <label className="flex items-center gap-2 text-sm">
                                            <input type="checkbox" checked={!!createForm.is_emergency} onChange={(e) => setCreateForm((f: any) => ({ ...f, is_emergency: e.target.checked }))} />
                                            Pengajuan Keadaan Darurat / Mendadak (kurang dari H-7)
                                        </label>
                                        {createForm.is_emergency && (
                                            <div className="space-y-2">
                                                <Label>Alasan Keadaan Darurat *</Label>
                                                <Textarea value={createForm.emergency_reason} onChange={(e) => setCreateForm((f: any) => ({ ...f, emergency_reason: e.target.value }))} />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>Alasan (opsional)</Label>
                                    <Input value={createForm.reason} onChange={(e) => setCreateForm((f: any) => ({ ...f, reason: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Lampiran (opsional)</Label>
                                    <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setCreateFile(e.target.files?.[0] || null)} />
                                </div>
                                <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Mengirim...' : 'Ajukan'}</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Filter</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4 flex-wrap">
                    <Input placeholder="Cari pegawai..." value={search} autoComplete="off" onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="max-w-sm" />
                    <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Semua status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua</SelectItem>
                            <SelectItem value="Pending">Menunggu</SelectItem>
                            <SelectItem value="Disetujui Kepala Bagian">Disetujui Kabag</SelectItem>
                            <SelectItem value="Disetujui HRD">Disetujui HRD</SelectItem>
                            <SelectItem value="Ditolak Kepala Bagian">Ditolak Kabag</SelectItem>
                            <SelectItem value="Ditolak HRD">Ditolak HRD</SelectItem>
                            <SelectItem value="Cancelled">Dibatalkan</SelectItem>
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
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Total Hari</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">Memuat data cuti...</TableCell>
                                </TableRow>
                            ) : leaves.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">Belum ada pengajuan</TableCell>
                                </TableRow>
                            ) : (
                                leaves.map((leave: any) => (
                                    <TableRow key={leave.id}>
                                        <TableCell>{leave.employee?.nama_lengkap || '-'}</TableCell>
                                        <TableCell>{leave.leave_type?.name || '-'}</TableCell>
                                        <TableCell>{leave.start_date} s.d {leave.end_date}</TableCell>
                                        <TableCell>{leave.total_days}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                leave.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                                leave.status === 'Disetujui Kepala Bagian' ? 'bg-blue-100 text-blue-800' :
                                                leave.status === 'Disetujui HRD' ? 'bg-green-100 text-green-800' :
                                                ['Rejected', 'Ditolak Kepala Bagian', 'Ditolak HRD'].includes(leave.status) ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>{leave.status}</span>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Link to={`/cuti/${leave.id}`}><Button variant="outline" size="sm">Detail</Button></Link>
                                            {isHrd && ['Pending', 'Disetujui Kepala Bagian'].includes(leave.status) && (
                                                <Link to={`/cuti/${leave.id}/edit`}><Button variant="outline" size="sm">Edit</Button></Link>
                                            )}
                                            {canApprove && leave.status === 'Pending' && (
                                                <>
                                                    <Button size="sm" onClick={() => approveMutation.mutate(leave.id)} className="bg-green-600 hover:bg-green-700 text-white">Setujui</Button>
                                                    <Button variant="destructive" size="sm" onClick={() => { setRejectId(leave.id); setRejectReason(''); }}>Tolak</Button>
                                                </>
                                            )}
                                            {isHrd && leave.status === 'Disetujui Kepala Bagian' && (
                                                <Button size="sm" onClick={() => approveMutation.mutate(leave.id)} className="bg-green-600 hover:bg-green-700 text-white">Finalisasi (HRD)</Button>
                                            )}
                                            {['Pending', 'Disetujui Kepala Bagian', 'Disetujui HRD'].includes(leave.status) && (
                                                <Button variant="outline" size="sm" onClick={() => { if (confirm('Batalkan pengajuan cuti ini?')) cancelMutation.mutate(leave.id); }}>Batalkan</Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={rejectId !== null} onOpenChange={(v) => { if (!v) { setRejectId(null); setRejectReason(''); } }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Alasan Penolakan</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <Textarea placeholder="Tulis alasan penolakan..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                        <div className="flex gap-2">
                            <Button onClick={() => rejectId && rejectMutation.mutate({ id: rejectId, reason: rejectReason })} disabled={rejectMutation.isPending || !rejectReason.trim()}>
                                {rejectMutation.isPending ? 'Mengirim...' : 'Kirim'}
                            </Button>
                            <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(''); }}>Batal</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {meta && meta.last_page > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Halaman {meta.current_page} dari {meta.last_page}</p>
                    <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Sebelumnya</Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}>Selanjutnya</Button>
                    </div>
                </div>
            )}
        </div>
    );
}