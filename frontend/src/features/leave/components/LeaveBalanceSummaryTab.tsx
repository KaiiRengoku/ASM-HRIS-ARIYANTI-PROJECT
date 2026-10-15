import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Tabel ringkasan saldo cuti PER PEGAWAI, memperlihatkan SEMUA jenis cuti apa adanya
// (termasuk yang tidak memotong saldo) supaya HRD/pimpinan dapat memeriksa sendiri
// aturan mana yang memotong saldo lewat kolom "Memotong Saldo".
// Halaman ini READ-ONLY — tidak ada aksi Setujui/Tolak di sini.

interface BalanceRow {
    id: number;
    employee_id: number;
    employee?: { id?: number | null; nama_lengkap?: string | null; nik?: string | null; nip?: string | null } | null;
    leave_type?: { id?: number | null; name?: string | null; is_leave_balance_deducted?: boolean } | null;
    period_year: number;
    entitled_days: number;
    adjustment_days: number;
    used_days: number;
    remaining_days: number;
    remaining_days_is_consistent?: boolean;
}

interface LeaveTypeOption {
    id: number;
    code?: string;
    name: string;
    is_leave_balance_deducted?: boolean;
}

const ALL = '__all__';

const fmtDays = (value?: number | null) => {
    if (value === null || value === undefined) return '-';
    const n = Number(value);
    if (Number.isNaN(n)) return '-';
    // Buang desimal .00 agar rapi, sisakan bila memang pecahan (mis. 0.5).
    return n % 1 === 0 ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

const fetchBalances = async (params: { year?: string; leave_type_id?: string; search?: string }): Promise<BalanceRow[]> => {
    const response = await api.get<{ data: BalanceRow[] }>('/leave-balances', { params });
    return response.data.data ?? [];
};

const fetchLeaveTypes = async (): Promise<LeaveTypeOption[]> => {
    const response = await api.get<{ data: LeaveTypeOption[] }>('/leave-types');
    return response.data.data ?? [];
};

export default function LeaveBalanceSummaryTab() {
    const navigate = useNavigate();
    const { hasPermission } = useAuthStore();
    const canAdjust = hasPermission('leave.adjust_balance');

    const [year, setYear] = useState<string>(ALL);
    const [leaveTypeId, setLeaveTypeId] = useState<string>(ALL);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search);

    const { data: leaveTypes = [] } = useQuery({
        queryKey: ['leave-types', 'balance-summary'],
        queryFn: fetchLeaveTypes,
    });

    const { data: rows = [], isLoading, error } = useQuery({
        queryKey: ['leave-balances', year, leaveTypeId, debouncedSearch],
        queryFn: () => fetchBalances({
            year: year === ALL ? undefined : year,
            leave_type_id: leaveTypeId === ALL ? undefined : leaveTypeId,
            search: debouncedSearch || undefined,
        }),
        placeholderData: keepPreviousData,
    });

    // Opsi tahun diturunkan dari data yang benar-benar ada (tanpa filter tahun).
    const { data: allRows = [] } = useQuery({
        queryKey: ['leave-balances', 'years'],
        queryFn: () => fetchBalances({}),
        placeholderData: keepPreviousData,
    });
    const years = Array.from(new Set(allRows.map((r) => r.period_year))).sort((a, b) => b - a);

    if (error) return <div className="p-6 text-destructive">Gagal memuat ringkasan saldo cuti.</div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Input
                        placeholder="Cari pegawai (nama/NIK/NIP)..."
                        value={search}
                        autoComplete="off"
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-xs"
                    />
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tahun" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Semua Tahun</SelectItem>
                            {years.map((y) => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                        <SelectTrigger className="w-[190px]"><SelectValue placeholder="Jenis Cuti" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Semua Jenis Cuti</SelectItem>
                            {leaveTypes.map((t) => (
                                <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {canAdjust && (
                    <Button variant="outline" onClick={() => navigate('/cuti/saldo/adjust')}>
                        Atur Saldo
                    </Button>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    {/* Mobile: kartu per saldo — tabel 8 kolom tak muat di layar sempit. */}
                    <div className="divide-y md:hidden">
                        {isLoading ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">Memuat data...</p>
                        ) : rows.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                Belum ada data saldo cuti. Saldo dapat diatur HRD lewat tombol Atur Saldo.
                            </p>
                        ) : (
                            rows.map((row) => (
                                <div key={row.id} className="space-y-3 p-4">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium" title={row.employee?.nama_lengkap ?? ''}>{row.employee?.nama_lengkap ?? '-'}</p>
                                        <p className="text-xs text-muted-foreground">{row.leave_type?.name ?? '-'} · {row.period_year}</p>
                                    </div>
                                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                                        <div><dt className="text-muted-foreground">Jatah</dt><dd>{fmtDays(row.entitled_days)}</dd></div>
                                        <div><dt className="text-muted-foreground">Penyesuaian</dt><dd>{fmtDays(row.adjustment_days)}</dd></div>
                                        <div><dt className="text-muted-foreground">Terpakai</dt><dd>{fmtDays(row.used_days)}</dd></div>
                                        <div>
                                            <dt className="text-muted-foreground">Sisa</dt>
                                            <dd className="font-semibold">
                                                {fmtDays(row.remaining_days)}
                                                {row.remaining_days_is_consistent === false && (
                                                    <span className="ml-1 text-xs text-amber-600" title="Data saldo di database tidak sinkron dengan rumus jatah + penyesuaian - terpakai; yang ditampilkan adalah hasil hitung rumus.">*</span>
                                                )}
                                            </dd>
                                        </div>
                                        <div className="col-span-2">
                                            <dt className="text-muted-foreground">Memotong Saldo</dt>
                                            <dd>{row.leave_type?.is_leave_balance_deducted ? 'Ya' : 'Tidak'}</dd>
                                        </div>
                                    </dl>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Pegawai</TableHead>
                                <TableHead>Jenis Cuti</TableHead>
                                <TableHead className="whitespace-nowrap">Tahun</TableHead>
                                <TableHead className="whitespace-nowrap">Jatah</TableHead>
                                <TableHead className="whitespace-nowrap">Penyesuaian</TableHead>
                                <TableHead className="whitespace-nowrap">Terpakai</TableHead>
                                <TableHead className="whitespace-nowrap">Sisa</TableHead>
                                <TableHead className="whitespace-nowrap">Memotong Saldo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground">Memuat data...</TableCell>
                                </TableRow>
                            ) : rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                                        Belum ada data saldo cuti. Saldo dapat diatur HRD lewat tombol Atur Saldo.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="whitespace-nowrap font-medium">
                                            {row.employee?.nama_lengkap ?? '-'}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">{row.leave_type?.name ?? '-'}</TableCell>
                                        <TableCell>{row.period_year}</TableCell>
                                        <TableCell>{fmtDays(row.entitled_days)}</TableCell>
                                        <TableCell>{fmtDays(row.adjustment_days)}</TableCell>
                                        <TableCell>{fmtDays(row.used_days)}</TableCell>
                                        <TableCell className="font-semibold">
                                            {/* Sisa = jatah + penyesuaian - terpakai (rumus sama dengan backend).
                                                Bila baris DB tidak konsisten dengan rumus itu, nilai hasil rumus
                                                yang ditampilkan dan diberi penanda agar tidak menyesatkan. */}
                                            {fmtDays(row.remaining_days)}
                                            {row.remaining_days_is_consistent === false && (
                                                <span className="ml-1 text-xs text-amber-600" title="Data saldo di database tidak sinkron dengan rumus jatah + penyesuaian - terpakai; yang ditampilkan adalah hasil hitung rumus.">*</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {row.leave_type?.is_leave_balance_deducted ? 'Ya' : 'Tidak'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
                Sisa dihitung: Jatah + Penyesuaian - Terpakai. Kolom &quot;Memotong Saldo&quot; mengikuti pengaturan jenis cuti.
            </p>
        </div>
    );
}
