import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const fetchLogs = async (params: { page?: number }) => {
    const res = await api.get('/audit-logs', { params });
    return res.data;
};

export default function AuditLogPage() {
    const [page, setPage] = useState(1);

    const { data, isLoading, error } = useQuery({
        queryKey: ['audit-logs', page],
        queryFn: () => fetchLogs({ page }),
    });

    if (isLoading) return <div className="p-6">Memuat audit trail...</div>;
    if (error) return <div className="p-6 text-destructive">Gagal memuat data.</div>;

    const logs = data?.data || [];
    const meta = data?.meta;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Audit Trail</h1>
            <p className="text-muted-foreground">Catatan aktivitas sistem</p>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Waktu</TableHead>
                                <TableHead>Pengguna</TableHead>
                                <TableHead>Aksi</TableHead>
                                <TableHead>Target</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada aktivitas tercatat</TableCell>
                                </TableRow>
                            ) : (
                                logs.map((log: any) => (
                                    <TableRow key={log.id}>
                                        <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                                        <TableCell>{log.user?.name || 'Sistem'}</TableCell>
                                        <TableCell>{log.action}</TableCell>
                                        <TableCell>{log.auditable_type.split('\\').pop()} #{log.auditable_id}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {meta && meta.last_page > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
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