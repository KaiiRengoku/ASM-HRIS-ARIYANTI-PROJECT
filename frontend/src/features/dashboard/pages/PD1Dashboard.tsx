import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/services/api';

const fetchStats = async () => {
    const res = await api.get('/dashboard/stats');
    return res.data.data;
};

export default function PD1Dashboard({ title = 'Dashboard Pembantu Direktur I' }: { title?: string }) {
    const { data, isLoading, error } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: fetchStats,
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">{title}</h1>
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
                <h1 className="text-2xl font-bold">{title}</h1>
                <p className="text-destructive">Gagal memuat data. Coba refresh.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{title}</h1>
                <p className="text-muted-foreground">Monitoring lingkungan akademik</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Dosen</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.total_dosen ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Di lingkungan akademik</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cuti Dosen</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.total_cuti_dosen ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Periode ini</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.cuti_pending_dosen ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Menunggu approval</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Notifikasi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">Baru</p>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Informasi Akademik</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="p-4 bg-muted/30 rounded-lg">
                            <p className="text-sm text-muted-foreground">Total Dosen</p>
                            <p className="text-2xl font-bold">{data?.total_dosen ?? 0}</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg">
                            <p className="text-sm text-muted-foreground">Cuti Dosen</p>
                            <p className="text-2xl font-bold">{data?.total_cuti_dosen ?? 0}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}