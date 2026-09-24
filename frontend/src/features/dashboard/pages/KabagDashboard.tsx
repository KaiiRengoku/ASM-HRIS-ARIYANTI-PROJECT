import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/services/api';
import { Link } from 'react-router-dom';

const fetchStats = async () => {
    const res = await api.get('/dashboard/stats');
    return res.data.data;
};

export default function KabagDashboard() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: fetchStats,
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard Kepala Bagian</h1>
                    <p className="text-muted-foreground">Memuat data...</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">...</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold animate-pulse bg-muted h-8 w-12 rounded"></div>
                                <p className="text-xs text-muted-foreground">...</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Dashboard Kepala Bagian</h1>
                <p className="text-destructive">Gagal memuat data. Coba refresh.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Dashboard Kepala Bagian</h1>
                <p className="text-muted-foreground">Approval dan rekap bawahan</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.pending_approval ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Menunggu approval</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pengajuan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.total_pengajuan ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Keseluruhan</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pegawai</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.total_employees ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Bawahan</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aksi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            <Link to="/approval">
                                <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">Lihat</button>
                            </Link>
                        </div>
                        <p className="text-xs text-muted-foreground">Approval</p>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Pengajuan Cuti Bawahan</CardTitle>
                </CardHeader>
                <CardContent>
                    {data?.pengajuan_terbaru?.length ? (
                        <div className="space-y-3">
                            {data.pengajuan_terbaru.map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{item.employee_name}</p>
                                        <p className="text-sm text-muted-foreground truncate">{item.leave_type} · {item.start_date} s.d {item.end_date}</p>
                                    </div>
                                    <span className={`shrink-0 text-xs px-2 py-1 rounded-full ${
                                        item.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                        item.status === 'Disetujui Kepala Bagian' ? 'bg-blue-100 text-blue-800' :
                                        ['Approved', 'Disetujui HRD'].includes(item.status) ? 'bg-green-100 text-green-800' :
                                        ['Rejected', 'Ditolak Kepala Bagian', 'Ditolak HRD'].includes(item.status) ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {item.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Belum ada pengajuan dari bawahan</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}