import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/services/api';
import { Link } from 'react-router-dom';

const fetchStats = async () => {
    const res = await api.get('/dashboard/stats');
    return res.data.data;
};

const quickActionClass = "w-full px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors disabled:cursor-not-allowed disabled:opacity-50";

function QuickAction({ to, onClick, disabled, children }: { to?: string; onClick?: () => void; disabled?: boolean; children: ReactNode }) {
    if (to) {
        return (
            <Link to={to} className="block">
                <button className={quickActionClass}>{children}</button>
            </Link>
        );
    }
    return (
        <button className={quickActionClass} onClick={onClick} disabled={disabled}>
            {children}
        </button>
    );
}

const downloadBiodata = async (kind: 'pdf' | 'word', employeeId: number, fileName: string) => {
    const url = kind === 'pdf' ? `/reports/biodata-pdf/${employeeId}` : `/reports/biodata-word/${employeeId}`;
    const res = await api.get(url, { responseType: 'blob' });
    const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', kind === 'pdf' ? `biodata_${fileName}.pdf` : `biodata_${fileName}.doc`);
    document.body.appendChild(link);
    link.click();
    link.remove();
};

export default function PegawaiDashboard() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: fetchStats,
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard Pegawai</h1>
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
                <h1 className="text-2xl font-bold">Dashboard Pegawai</h1>
                <p className="text-destructive">Gagal memuat data. Coba refresh.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Dashboard Pegawai</h1>
                <p className="text-muted-foreground">Self-service cuti dan profil</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sisa Cuti Tahunan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.sisa_cuti ?? 0} Hari</div>
                        <p className="text-xs text-muted-foreground">Tersedia</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pengajuan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.total_pengajuan ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Aktif</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Notifikasi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.unread_notifications ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Belum dibaca</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cuti</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.total_cuti ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Terpakai</p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Pengajuan Terbaru</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data?.pengajuan_terbaru?.length ? (
                            <div className="space-y-3">
                                {data.pengajuan_terbaru.map((item: any) => (
                                    <div key={item.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium">{item.leave_type}</p>
                                            <p className="text-sm text-muted-foreground">{item.start_date} s.d {item.end_date}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${
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
                            <p className="text-muted-foreground">Belum ada pengajuan cuti</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Aksi Cepat</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                        <Link to="/cuti/create" className="block col-span-2">
                            <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                                Ajukan Cuti
                            </button>
                        </Link>
                        <QuickAction to="/dokumen">Unggah Dokumen</QuickAction>
                        <QuickAction to="/profile">Profil Saya</QuickAction>
                        <QuickAction to="/profile/password">Ganti Kata Sandi</QuickAction>
                        <QuickAction
                            disabled={!data?.employee_id}
                            onClick={() => data?.employee_id && downloadBiodata('pdf', data.employee_id, 'saya')}
                        >
                            Unduh Biodata PDF
                        </QuickAction>
                        <QuickAction
                            disabled={!data?.employee_id}
                            onClick={() => data?.employee_id && downloadBiodata('word', data.employee_id, 'saya')}
                        >
                            Unduh Biodata Word
                        </QuickAction>
                    </CardContent>
                </Card>
            </div>
            {data?.is_dosen && (
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Beban Mengajar — {data?.mengajar?.total_sks ?? 0} SKS</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {data?.mengajar?.matkul?.length ? (
                                <div className="space-y-3">
                                    {data.mengajar.matkul.map((m: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                                            <div>
                                                <p className="font-medium">{m.nama_matkul || '-'} ({m.kode_matkul || '-'})</p>
                                                <p className="text-sm text-muted-foreground">Kelas {m.kelas || '-'}</p>
                                            </div>
                                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">{m.sks ?? 0} SKS</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground">Belum ada beban mengajar</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Penelitian</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className={`text-xs px-2 py-1 rounded-full ${data?.penelitian?.terisi ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {data?.penelitian?.terisi ? 'Sudah terisi' : 'Belum terisi — lengkapi di Profil'}
                            </span>
                        </CardContent>
                    </Card>
                </div>
            )}
            {data?.libur_terdekat?.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Libur Terdekat</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data.libur_terdekat.map((h: any, i: number) => (
                                <div key={i} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                                    <p className="font-medium">{h.name}</p>
                                    <p className="text-sm text-muted-foreground">{h.date}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}