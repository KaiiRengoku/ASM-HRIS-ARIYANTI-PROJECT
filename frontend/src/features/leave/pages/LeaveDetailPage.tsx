import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/stores/authStore';

const fetchLeave = async (id: number) => {
    const response = await api.get(`/leaves/${id}`);
    return response.data.data;
};

export default function LeaveDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const { data: leave, isLoading, error } = useQuery({
        queryKey: ['leave', id],
        queryFn: () => fetchLeave(Number(id)),
    });
    const { hasRole } = useAuthStore();
    const isHrd = hasRole('HRD');
    const queryClient = useQueryClient();
    const cancelMutation = useMutation({
        mutationFn: async () => (await api.post(`/leaves/${id}/cancel`)).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave', id] });
            toast({ title: 'Berhasil', description: 'Pengajuan dibatalkan.' });
        },
        onError: (e: any) => toast({ title: 'Gagal', description: e.response?.data?.message || 'Terjadi kesalahan.', variant: 'destructive' }),
    });
    const downloadAttachment = async (att: any) => {
        const res = await api.get(`/leave-attachments/${att.id}/download`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', att.file_name || `lampiran_${att.id}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };
    const verifyMutation = useMutation({
        mutationFn: async ({ attId, status }: { attId: number; status: string }) =>
            (await api.post(`/leave-attachments/${attId}/verify`, { status })).data,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave', id] });
            toast({ title: 'Berhasil', description: 'Lampiran diverifikasi.' });
        },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });
    const deleteMutation = useMutation({
        mutationFn: async (reason: string) => (await api.delete(`/leaves/${id}`, { data: { reason } })).data,
        onSuccess: () => {
            toast({ title: 'Berhasil', description: 'Histori cuti dihapus permanen.' });
            navigate('/cuti');
        },
        onError: (e: any) => toast({ title: 'Gagal', description: e.response?.data?.message || 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    if (isLoading) return <div className="p-6">Memuat detail...</div>;
    if (error || !leave) return <div className="p-6 text-destructive">Data tidak ditemukan.</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold">Detail Pengajuan Cuti</h1>
          <div className="flex flex-wrap gap-2">
          <Link to="/cuti">
            <Button variant="outline">Kembali</Button>
          </Link>
          {isHrd && ['Pending', 'Disetujui Kepala Bagian'].includes(leave.status) && (
            <Link to={`/cuti/${id}/edit`}>
              <Button>Edit</Button>
            </Link>
          )}
          {['Pending', 'Disetujui Kepala Bagian', 'Disetujui HRD'].includes(leave.status) && (
            <Button variant="outline" onClick={() => { if (confirm('Batalkan pengajuan cuti ini?')) cancelMutation.mutate(); }}>Batalkan</Button>
          )}
          {isHrd && (
            <Button variant="destructive" onClick={() => { setDeleteReason(''); setDeleteOpen(true); }}>Hapus</Button>
          )}
          </div>
            </div>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Hapus Histori Cuti</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Data dihapus permanen dari database dan tidak dapat dikembalikan. Saldo cuti yang terpotong akan dikembalikan bila pengajuan sudah final.</p>
                        <div className="space-y-2">
                            <Label>Alasan Penghapusan</Label>
                            <Textarea placeholder="Tulis alasan penghapusan..." value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteReason)} disabled={deleteMutation.isPending || !deleteReason.trim()}>
                                {deleteMutation.isPending ? 'Menghapus...' : 'Hapus Permanen'}
                            </Button>
                            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Batal</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            <Card>
                <CardHeader>
                    <CardTitle>{leave.employee?.nama_lengkap}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div><span className="font-medium">Jenis:</span> {leave.leave_type?.name}</div>
                    <div><span className="font-medium">Tanggal:</span> {leave.start_date} s.d {leave.end_date}</div>
                    <div><span className="font-medium">Total Hari:</span> {leave.total_days}</div>
                    <div><span className="font-medium">Status:</span> {leave.status}</div>
                    <div><span className="font-medium">Alasan:</span> {leave.reason || '-'}</div>
                    <div><span className="font-medium">Diajukan:</span> {new Date(leave.submitted_at).toLocaleString()}</div>
                    {leave.attachments?.length > 0 && (
                        <div>
                            <span className="font-medium">Lampiran:</span>
                            {leave.attachments.map((att: any) => (
                                <div key={att.id} className="flex items-center gap-2 text-sm">
                                    <button onClick={() => downloadAttachment(att)} className="text-primary underline">
                                        {att.file_name}
                                    </button>
                                    <span className="text-muted-foreground">({att.verification_status || 'PENDING'})</span>
                                    {hasRole('HRD') && att.verification_status === 'PENDING' && (
                                        <>
                                            <Button size="sm" onClick={() => verifyMutation.mutate({ attId: att.id, status: 'VERIFIED' })}>Verifikasi</Button>
                                            <Button size="sm" variant="destructive" onClick={() => verifyMutation.mutate({ attId: att.id, status: 'REJECTED' })}>Tolak</Button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {leave.approvals?.length > 0 && (
                        <div>
                            <span className="font-medium">Riwayat Approval:</span>
                            {leave.approvals.map((app: any) => (
                                <div key={app.id} className="text-sm">
                                    {app.status} oleh {app.approver?.name || 'User'} pada {new Date(app.acted_at).toLocaleString()}
                                    {app.reason && ` (Alasan: ${app.reason})`}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}