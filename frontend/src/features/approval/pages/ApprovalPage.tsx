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
import { extractErrorMessage } from '@/services/apiError';

const fetchApprovals = async () => {
    const res = await api.get('/leaves', { params: { level: 'queue' } });
    return res.data.data;
};

const approveLeave = async ({ id }: { id: number }) => {
    const res = await api.post(`/leaves/${id}/approve`);
    return res.data;
};

const rejectLeave = async ({ id, reason }: { id: number; reason: string }) => {
    const res = await api.post(`/leaves/${id}/reject`, { reason });
    return res.data;
};

export default function ApprovalPage() {
    const { user, hasPermission } = useAuthStore();
    const role = user?.roles?.[0] || '';
    const canApprove = hasPermission('leave.approve');
    const canReject = hasPermission('leave.reject');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [openReject, setOpenReject] = useState(false);
    const queryClient = useQueryClient();

    const { data: approvals, isLoading, error } = useQuery({
        queryKey: ['approvals', role],
        queryFn: fetchApprovals,
        enabled: !!role,
    });

    // Auto-refresh setelah approval/reject success
    const approveMutation = useMutation({
        mutationFn: approveLeave,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-latest'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            toast({ title: 'Berhasil', description: 'Pengajuan disetujui.' });
        },
        onError: (e: unknown) => {
            toast({
                title: 'Gagal',
                description: extractErrorMessage(e, 'Gagal menyetujui pengajuan. Coba lagi.'),
                variant: 'destructive'
            });
            // Refresh juga saat error agar data tidak stale
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: rejectLeave,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-latest'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            toast({ title: 'Berhasil', description: 'Pengajuan ditolak.' });
            setOpenReject(false);
            setRejectReason('');
        },
        onError: (e: unknown) => {
            toast({
                title: 'Gagal',
                description: extractErrorMessage(e, 'Gagal menolak pengajuan. Coba lagi.'),
                variant: 'destructive'
            });
            queryClient.invalidateQueries({ queryKey: ['approvals'] });
        },
    });

    const handleApprove = (id: number) => {
        if (approveMutation.isPending) return;
        approveMutation.mutate({ id });
    };

    const handleReject = () => {
        if (!selectedId || !rejectReason.trim() || rejectMutation.isPending) {
            toast({
                title: 'Gagal',
                description: rejectMutation.isPending
                    ? 'Sedang memproses...'
                    : 'Alasan penolakan wajib diisi.',
                variant: 'destructive'
            });
            return;
        }
        rejectMutation.mutate({ id: selectedId, reason: rejectReason });
    };

    if (isLoading) return <div className="p-6">Memuat pengajuan...</div>;
    if (error) return <div className="p-6 text-destructive">Gagal memuat data. Coba refresh.</div>;

    const list = approvals || [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Approval</h1>
                <p className="text-muted-foreground">
                    {role === 'HRD'
                        ? 'Verifikasi akhir cuti (menunggu HRD)'
                        : 'Persetujuan cuti/izin yang menunggu tindakan Anda'}
                </p>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div className="divide-y md:hidden">
                        {list.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada pengajuan menunggu approval</p>
                        ) : (
                            list.map((item: any) => (
                                <div key={item.id} className="space-y-3 p-4">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium" title={item.employee?.nama_lengkap || ''}>{item.employee?.nama_lengkap || '-'}</p>
                                        <p className="text-xs text-muted-foreground">{item.leave_type?.name || '-'}</p>
                                    </div>
                                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                                        <div className="col-span-2"><dt className="text-muted-foreground">Tanggal</dt><dd>{item.start_date} s.d {item.end_date}</dd></div>
                                        <div><dt className="text-muted-foreground">Total Hari</dt><dd>{item.total_days}</dd></div>
                                        <div className="col-span-2 min-w-0"><dt className="text-muted-foreground">Alasan</dt><dd className="break-words">{item.reason || '-'}</dd></div>
                                    </dl>
                                    <div className="flex flex-wrap gap-2">
                                        {canApprove && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleApprove(item.id)}
                                                disabled={approveMutation.isPending}
                                            >
                                                {approveMutation.isPending ? 'Mengunggah...' : 'Setujui'}
                                            </Button>
                                        )}
                                        {canReject && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => { setSelectedId(item.id); setOpenReject(true); }}
                                                disabled={rejectMutation.isPending}
                                            >
                                                {rejectMutation.isPending ? 'Prosess...' : 'Tolak'}
                                            </Button>
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
                                        <TableCell className="text-right">
                                            <div className="flex flex-wrap justify-end gap-2">
                                            {canApprove && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleApprove(item.id)}
                                                disabled={approveMutation.isPending}
                                            >
                                                {approveMutation.isPending ? 'Mengunggah...' : 'Setujui'}
                                            </Button>
                                            )}
                                            {canReject && (
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => { setSelectedId(item.id); setOpenReject(true); }}
                                                disabled={rejectMutation.isPending}
                                            >
                                                {rejectMutation.isPending ? 'Mengunggah...' : 'Tolak'}
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

            <Dialog open={openReject} onOpenChange={(v) => { setOpenReject(v); if (!v) setRejectReason(''); }}>
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
                            <Button
                                onClick={handleReject}
                                disabled={rejectMutation.isPending || !rejectReason.trim()}
                            >
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