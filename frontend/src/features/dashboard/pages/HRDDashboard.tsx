import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getHRDStats } from '../services/dashboardService';

export default function HRDDashboard() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['hrd-dashboard-stats'],
        queryFn: getHRDStats,
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard HRD</h1>
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
                <h1 className="text-2xl font-bold">Dashboard HRD</h1>
                <p className="text-destructive">Gagal memuat data. Coba refresh.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Dashboard HRD</h1>
                <p className="text-muted-foreground">Pusat administrasi kepegawaian</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pegawai</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.total_pegawai ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Pegawai aktif</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cuti Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.cuti_pending ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Menunggu approval</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Verifikasi HRD</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.verifikasi_hrd ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Perlu diverifikasi</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dokumen</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.dokumen_perlu_ditinjau ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Perlu ditinjau</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pengajuan Cuti Terbaru</CardTitle>
                </CardHeader>
                <CardContent>
                    {data?.pengajuan_terbaru?.length ? (
                        <div className="space-y-3">
                            {data.pengajuan_terbaru.map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-medium">{item.employee_name}</p>
                                        <p className="text-sm text-muted-foreground">{item.leave_type} · {item.start_date} s.d {item.end_date}</p>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">Menunggu</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Belum ada pengajuan cuti</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}