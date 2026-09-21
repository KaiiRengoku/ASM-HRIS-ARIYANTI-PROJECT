import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const fetchApprovals = async (role: string) => {
    // Kabag -> level 1, HRD -> level 2
    const level = role === 'KABAG' ? 1 : 2;
    const res = await api.get(`/leaves?level=${level}`);
    return res.data.data;
};

const approveLeave = async ({ id, level }: { id: number; level: number }) => {
    const res = await api.post(`/leaves/${id}/approve`, { level });
    return res.data;
};

const rejectLeave = async ({ id, reason }: { id: number; reason: string }) => {
    const res = await api.post(`/leaves/${id}/reject`, { reason });
    return res.data;
};

export default function ApprovalPage() {
    const { user } = useAuthStore();
    const role = user?.roles?.[0] || '';
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [openReject, setOpenReject] = useState(false);
    const queryClient = useQueryClient();

    const { data: approvals, isLoading, error } = useQuery({
        queryKey: ['approvals', role],
        queryFn: () => fetchApprovals(role),
        enabled: !!role,
    });

    const approveMutation = useMutation({
        mutationFn: approveLeave,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            toast({ title: 'Berhasil', description: 'Pengajuan disetujui.' });
        },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const rejectMutation = useMutation({
        mutationFn: rejectLeave,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            toast({ title: 'Berhasil', description: 'Pengajuan ditolak.' });
            setOpenReject(false);
        },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const handleApprove = (id: number) => {
        const level = role === 'KABAG' ? 1 : 2;
        approveMutation.mutate({ id, level });
    };

    const handleReject = () => {
        if (!selectedId || !rejectReason.trim()) {
            toast({ title: 'Gagal', description: 'Alasan penolakan wajib diisi.', variant: 'destructive' });
            return;
        }
        rejectMutation.mutate({ id: selectedId, reason: rejectReason });
    };

    if (isLoading) return <div className="p-6">Memuat pengajuan...</div>;
    if (error) return <div className="p-6 text-destructive">Gagal memuat data.</div>;

    const list = approvals || [];

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold">Approval</h1>
                <p className="text-muted-foreground">
                    {role === 'KABAG' ? 'Persetujuan cuti bawahan (Level 1)' : 'Verifikasi akhir cuti (Level 2)'}
                </p>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pegawai</TableHead>
                                <TableHead>Jenis</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Total Hari</TableHead>
                                <TableHead>Alasan</TableHead>
                                <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {list.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">Tidak ada pengajuan menunggu approval</TableCell>
                                </TableRow>
                            ) : (
                                list.map((item: any) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.employee?.nama_lengkap || '-'}</TableCell>
                                        <TableCell>{item.leave_type?.name || '-'}</TableCell>
                                        <TableCell>{item.start_date} s.d {item.end_date}</TableCell>
                                        <TableCell>{item.total_days}</TableCell>
                                        <TableCell>{item.reason || '-'}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleApprove(item.id)}
                                                disabled={approveMutation.isPending}
                                            >
                                                Setujui
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => { setSelectedId(item.id); setOpenReject(true); }}
                                                disabled={rejectMutation.isPending}
                                            >
                                                Tolak
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={openReject} onOpenChange={setOpenReject}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Alasan Penolakan</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Textarea
                            placeholder="Tulis alasan penolakan..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <Button onClick={handleReject} disabled={rejectMutation.isPending}>
                                {rejectMutation.isPending ? 'Mengirim...' : 'Kirim'}
                            </Button>
                            <Button variant="outline" onClick={() => setOpenReject(false)}>Batal</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}