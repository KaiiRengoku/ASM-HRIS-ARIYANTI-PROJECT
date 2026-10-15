import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import LeaveSubmitDialog from '@/features/leave/components/LeaveSubmitDialog';
import { useAuthStore } from '@/stores/authStore';

// Daftar pengajuan yang SUDAH TUNTAS (disetujui final HRD) untuk satu kategori.
// Halaman ini read-only: seluruh aksi persetujuan (Setujui/Tolak/Batalkan/Hapus)
// berada di halaman Approval, bukan di sini.

interface LeaveRow {
    id: number;
    start_date?: string | null;
    end_date?: string | null;
    total_days?: number | string | null;
    status?: string | null;
    employee?: { nama_lengkap?: string | null } | null;
    leave_type?: { name?: string | null } | null;
}

interface LeaveMeta {
    current_page: number;
    last_page: number;
}

interface LeaveListResponse {
    data: LeaveRow[];
    meta?: LeaveMeta;
}

type Props = { category: 'cuti' | 'izin' };

const formatTanggal = (value?: string | null) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fetchLeaves = async (params: { category: string; page: number; search?: string }): Promise<LeaveListResponse> => {
    const response = await api.get<LeaveListResponse>('/leaves', {
        params: { ...params, per_page: 20, only: 'approved' },
    });
    return response.data;
};

export default function LeaveCategoryTab({ category }: Props) {
    const navigate = useNavigate();
    const { hasPermission } = useAuthStore();
    const canAdjust = hasPermission('leave.adjust_balance');
    const [search, setSearch] = useState('');
    const [submitOpen, setSubmitOpen] = useState(false);
    const [page, setPage] = useState(1);
    const debouncedSearch = useDebounce(search);

    const { data, isLoading, error } = useQuery({
        queryKey: ['leaves', category, page, debouncedSearch],
        queryFn: () => fetchLeaves({ category, page, search: debouncedSearch || undefined }),
        placeholderData: keepPreviousData,
    });

    const leaves: LeaveRow[] = data?.data ?? [];
    const meta = data?.meta;
    const labelKategori = category === 'izin' ? 'izin' : 'cuti';

    if (error) return <div className="p-6 text-destructive">Gagal memuat data.</div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Input
                    placeholder="Cari pegawai..."
                    value={search}
                    autoComplete="off"
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="max-w-sm"
                />
                <div className="flex flex-wrap items-center gap-2">
                    {canAdjust && (
                        <Button variant="outline" onClick={() => navigate('/cuti/saldo/adjust')}>
                            Saldo Cuti Pegawai
                        </Button>
                    )}
                    <Button onClick={() => setSubmitOpen(true)}>
                        {category === 'izin' ? 'Ajukan Izin' : 'Ajukan Cuti'}
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    {/* Mobile: kartu per pengajuan — tabel 6 kolom tak muat. Klik kartu = buka detail. */}
                    <div className="divide-y md:hidden">
                        {isLoading ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">Memuat data...</p>
                        ) : leaves.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data {labelKategori} yang disetujui.</p>
                        ) : (
                            leaves.map((leave) => (
                                <button
                                    key={leave.id}
                                    type="button"
                                    onClick={() => navigate(`/cuti/${leave.id}`)}
                                    className="block w-full space-y-3 p-4 text-left hover:bg-muted/50"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium" title={leave.employee?.nama_lengkap || ''}>{leave.employee?.nama_lengkap || '-'}</p>
                                            <p className="text-xs text-muted-foreground">{leave.leave_type?.name || '-'}</p>
                                        </div>
                                        <span className="shrink-0 whitespace-nowrap rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">{leave.status}</span>
                                    </div>
                                    <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
                                        <div><dt className="text-muted-foreground">Mulai</dt><dd>{formatTanggal(leave.start_date)}</dd></div>
                                        <div><dt className="text-muted-foreground">Selesai</dt><dd>{formatTanggal(leave.end_date)}</dd></div>
                                        <div><dt className="text-muted-foreground">Total Hari</dt><dd>{leave.total_days}</dd></div>
                                    </dl>
                                </button>
                            ))
                        )}
                    </div>
                    <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pegawai</TableHead>
                                <TableHead>Tipe</TableHead>
                                <TableHead className="whitespace-nowrap">Tanggal Mulai</TableHead>
                                <TableHead className="whitespace-nowrap">Tanggal Selesai</TableHead>
                                <TableHead className="whitespace-nowrap">Total Hari</TableHead>
                                <TableHead className="whitespace-nowrap">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">Memuat data...</TableCell>
                                </TableRow>
                            ) : leaves.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        Belum ada data {labelKategori} yang disetujui.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                leaves.map((leave) => (
                                    <TableRow
                                        key={leave.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => navigate(`/cuti/${leave.id}`)}
                                    >
                                        <TableCell>{leave.employee?.nama_lengkap || '-'}</TableCell>
                                        <TableCell>{leave.leave_type?.name || '-'}</TableCell>
                                        <TableCell className="whitespace-nowrap">{formatTanggal(leave.start_date)}</TableCell>
                                        <TableCell className="whitespace-nowrap">{formatTanggal(leave.end_date)}</TableCell>
                                        <TableCell>{leave.total_days}</TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                {leave.status}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
            </Card>

            {meta && meta.last_page > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">Halaman {meta.current_page} dari {meta.last_page}</p>
                    <div className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Sebelumnya</Button>
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}>Selanjutnya</Button>
                    </div>
                </div>
            )}

            <LeaveSubmitDialog
                open={submitOpen}
                onOpenChange={setSubmitOpen}
                category={category}
            />
        </div>
    );
}
