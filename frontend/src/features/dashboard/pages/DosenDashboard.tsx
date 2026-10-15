import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/services/api';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarPlus, FileText, FileType, KeyRound, Upload, UserRound } from 'lucide-react';

interface PengajuanItem {
    id: number;
    leave_type: string;
    start_date: string;
    end_date: string;
    status: string;
}

interface Matkul {
    nama_matkul?: string;
    kode_matkul?: string;
    sks?: number;
    kelas?: string;
}

interface Libur {
    name: string;
    date: string;
}

interface DosenStats {
    sisa_cuti?: number;
    total_pengajuan?: number;
    unread_notifications?: number;
    total_cuti?: number;
    employee_id?: number;
    pengajuan_terbaru?: PengajuanItem[];
    mengajar?: { total_sks?: number; matkul?: Matkul[] };
    penelitian?: { terisi?: boolean };
    libur_terdekat?: Libur[];
    profil?: ProfilInfo;
}

interface ProfilInfo {
    nama_lengkap?: string;
    gelar_depan?: string;
    gelar_belakang?: string;
    nik?: string;
    nip?: string;
    nidn?: string;
    jabatan?: string;
    status_kepegawaian?: string;
    tanggal_masuk_kerja?: string;
}

const fetchStats = async (): Promise<DosenStats> => {
    const res = await api.get<{ success: boolean; data: DosenStats }>('/dashboard/stats');
    return res.data.data;
};

const quickActionClass = "group flex w-full items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-left text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent hover:shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

function QuickAction({ to, onClick, disabled, icon, children }: { to?: string; onClick?: () => void; disabled?: boolean; icon: ReactNode; children: ReactNode }) {
    const inner = (
        <>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary [&_svg]:size-4">
                {icon}
            </span>
            <span className="min-w-0 flex-1 truncate">{children}</span>
            <ArrowRight className="size-4 shrink-0 -translate-x-1 text-muted-foreground/50 opacity-0 transition-all group-hover:translate-x-0 group-hover:text-primary group-hover:opacity-100" />
        </>
    );
    if (to) {
        return <Link to={to} className={quickActionClass}>{inner}</Link>;
    }
    return (
        <button className={quickActionClass} onClick={onClick} disabled={disabled}>
            {inner}
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
    window.URL.revokeObjectURL(blobUrl);
};

const statusBadge = (status: string): string => {
    if (status === 'Pending') return 'bg-yellow-100 text-yellow-800';
    if (['Disetujui Atasan Langsung', 'Disetujui Kepala Bagian', 'Disetujui Direktur'].includes(status)) return 'bg-blue-100 text-blue-800';
    if (status === 'Approved' || status === 'Disetujui HRD') return 'bg-green-100 text-green-800';
    if (['Rejected', 'Ditolak Atasan Langsung', 'Ditolak Kepala Bagian', 'Ditolak Direktur', 'Ditolak HRD'].includes(status)) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">{value || '-'}</p>
        </div>
    );
}

function namaLengkapDari(p?: ProfilInfo): string {
    if (!p?.nama_lengkap) return '-';
    const depan = p.gelar_depan ? `${p.gelar_depan} ` : '';
    const belakang = p.gelar_belakang ? `, ${p.gelar_belakang}` : '';
    return `${depan}${p.nama_lengkap}${belakang}`;
}

export default function DosenDashboard() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['dashboard-stats', 'dosen'],
        queryFn: fetchStats,
    });

    const namaLengkap = namaLengkapDari(data?.profil);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard Dosen</h1>
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
                <h1 className="text-2xl font-bold">Dashboard Dosen</h1>
                <p className="text-destructive">Gagal memuat data. Coba refresh.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Dashboard Dosen</h1>
                <p className="text-muted-foreground">Self-service cuti dan profil</p>
            </div>
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Informasi Pribadi</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <InfoRow label="Nama Lengkap" value={namaLengkap} />
                    <InfoRow label="Nomor Induk Kepegawaian" value={data?.profil?.nik} />
                    {data?.profil?.nip && <InfoRow label="NIP" value={data.profil.nip} />}
                    {data?.profil?.nidn && <InfoRow label="NIDN" value={data.profil.nidn} />}
                    <InfoRow label="Jabatan" value={data?.profil?.jabatan} />
                    <InfoRow label="Status Kepegawaian" value={data?.profil?.status_kepegawaian} />
                    <InfoRow label="Tanggal Masuk Kerja" value={data?.profil?.tanggal_masuk_kerja} />
                </CardContent>
            </Card>
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
                                {data.pengajuan_terbaru.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{item.leave_type}</p>
                                            <p className="text-sm text-muted-foreground truncate">{item.start_date} s.d {item.end_date}</p>
                                        </div>
                                        <span className={`shrink-0 text-xs px-2 py-1 rounded-full ${statusBadge(item.status)}`}>
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
                    <CardContent className="space-y-4">
                        <Link
                            to="/cuti/create"
                            className="group flex items-center gap-3 rounded-xl bg-primary px-5 py-4 text-primary-foreground shadow-[0_2px_10px_-2px_rgb(211_0_0/0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#B00000] hover:shadow-[0_6px_18px_-4px_rgb(211_0_0/0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/15">
                                <CalendarPlus className="size-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold leading-tight">Ajukan Cuti</span>
                                <span className="block text-xs text-primary-foreground/80">Isi formulir pengajuan</span>
                            </span>
                            <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
                        </Link>
                        <div className="grid grid-cols-1 gap-2">
                            <QuickAction to="/dokumen" icon={<Upload />}>Unggah Dokumen</QuickAction>
                            <QuickAction to="/profile" icon={<UserRound />}>Profil Saya</QuickAction>
                            <QuickAction
                                disabled={!data?.employee_id}
                                icon={<FileText />}
                                onClick={() => data?.employee_id && downloadBiodata('pdf', data.employee_id, 'saya')}
                            >
                                Unduh Biodata PDF
                            </QuickAction>
                            <QuickAction
                                disabled={!data?.employee_id}
                                icon={<FileType />}
                                onClick={() => data?.employee_id && downloadBiodata('word', data.employee_id, 'saya')}
                            >
                                Unduh Biodata Word
                            </QuickAction>
                            <QuickAction to="/profile/password" icon={<KeyRound />}>Ganti Kata Sandi</QuickAction>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Beban Mengajar — {data?.mengajar?.total_sks ?? 0} SKS</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data?.mengajar?.matkul?.length ? (
                            <div className="space-y-3">
                                {data.mengajar.matkul.map((m, i) => (
                                    <div key={i} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{m.nama_matkul || '-'} ({m.kode_matkul || '-'})</p>
                                            <p className="text-sm text-muted-foreground">Kelas {m.kelas || '-'}</p>
                                        </div>
                                        <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">{m.sks ?? 0} SKS</span>
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
            {data?.libur_terdekat && data.libur_terdekat.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Libur Terdekat</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data.libur_terdekat.map((h, i) => (
                                <div key={i} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
                                    <p className="font-medium truncate min-w-0">{h.name}</p>
                                    <p className="shrink-0 text-sm text-muted-foreground">{h.date}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
