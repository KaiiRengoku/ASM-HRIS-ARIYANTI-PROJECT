import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/services/api';
import { toast } from '@/components/ui/use-toast';

const leaveStatuses = ['Pending', 'Disetujui Kepala Bagian', 'Disetujui HRD', 'Ditolak Kepala Bagian', 'Ditolak HRD', 'Cancelled'];

export default function ReportPage() {
    const [leaveStatus, setLeaveStatus] = useState('');
    const [leaveTypeId, setLeaveTypeId] = useState('');
    const [leaveEmployeeId, setLeaveEmployeeId] = useState('');
    const [leaveFrom, setLeaveFrom] = useState('');
    const [leaveTo, setLeaveTo] = useState('');
    const [recapYear, setRecapYear] = useState(String(new Date().getFullYear()));
    const [recapScope, setRecapScope] = useState('all');
    const [recapUnit, setRecapUnit] = useState('');

    const { data: recap } = useQuery({
        queryKey: ['leave-recap', recapYear, recapScope, recapUnit],
        queryFn: async () => (await api.get('/reports/leaves/recap', {
            params: {
                year: recapYear,
                ...(recapScope === 'akademik' ? { scope: 'akademik' } : {}),
                ...(recapUnit ? { organizational_unit_id: recapUnit } : {}),
            },
        })).data.data,
    });
    const { data: units } = useQuery({
        queryKey: ['organizational-units'],
        queryFn: async () => (await api.get('/organizational-units')).data.data,
    });
    const dosenCuti = (recap as any[] | undefined)
        ?.filter((r) => r.is_dosen)
        .flatMap((r) => (r.riwayat_cuti ?? [])
            .filter((c: any) => ['Pending', 'Disetujui Kepala Bagian', 'Disetujui HRD'].includes(c.status))
            .map((c: any) => ({ ...c, nama: r.nama_lengkap })));

    const { data: leaveTypes } = useQuery({
        queryKey: ['leave-types'],
        queryFn: async () => (await api.get('/leave-types')).data.data,
    });

    const leaveQuery = () => {
        const params = new URLSearchParams();
        if (leaveStatus) params.append('status', leaveStatus);
        if (leaveTypeId) params.append('leave_type_id', leaveTypeId);
        if (leaveEmployeeId) params.append('employee_id', leaveEmployeeId);
        if (leaveFrom) params.append('from', leaveFrom);
        if (leaveTo) params.append('to', leaveTo);
        const qs = params.toString();
        return qs ? `?${qs}` : '';
    };

const exportEmployees = async () => {
    try {
        const response = await api.get('/reports/employees/export', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `pegawai_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast({ title: 'Berhasil', description: 'Ekspor pegawai berhasil.' });
    } catch {
        toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' });
    }
};

const exportLeaves = async () => {
    try {
        const response = await api.get(`/reports/leaves/export${leaveQuery()}`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `cuti_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast({ title: 'Berhasil', description: 'Ekspor cuti berhasil.' });
    } catch {
        toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' });
    }
};

const downloadBlob = async (url: string, filename: string) => {
    try {
        const response = await api.get(url, { responseType: 'blob' });
        const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast({ title: 'Berhasil', description: filename + ' diunduh.' });
    } catch {
        toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' });
    }
};

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Laporan</h1>
            <p className="text-muted-foreground">Ekspor data dalam format CSV, Excel, atau PDF</p>
            <Card>
                <CardHeader>
                    <CardTitle>Ekspor Data Pegawai</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                    <Button onClick={exportEmployees}>CSV</Button>
                    <Button variant="outline" onClick={() => downloadBlob('/reports/employees/excel', `pegawai_${new Date().toISOString().slice(0,10)}.xls`)}>Excel</Button>
                    <Button variant="outline" onClick={() => downloadBlob('/reports/employees/pdf', `pegawai_${new Date().toISOString().slice(0,10)}.pdf`)}>PDF</Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Ekspor Data Cuti</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={leaveStatus || 'all'} onValueChange={(v) => setLeaveStatus(v === 'all' ? '' : v)}>
                                <SelectTrigger><SelectValue placeholder="Semua status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua status</SelectItem>
                                    {leaveStatuses.map((s) => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Jenis Cuti</Label>
                            <Select value={leaveTypeId || 'all'} onValueChange={(v) => setLeaveTypeId(v === 'all' ? '' : v)}>
                                <SelectTrigger><SelectValue placeholder="Semua jenis" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua jenis</SelectItem>
                                    {leaveTypes?.map((t: any) => (
                                        <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>ID Pegawai</Label>
                            <Input value={leaveEmployeeId} onChange={(e) => setLeaveEmployeeId(e.target.value)} placeholder="ID Pegawai" inputMode="numeric" />
                        </div>
                        <div className="space-y-2">
                            <Label>Tanggal Mulai</Label>
                            <Input type="date" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Tanggal Selesai</Label>
                            <Input type="date" value={leaveTo} onChange={(e) => setLeaveTo(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={exportLeaves}>CSV</Button>
                        <Button variant="outline" onClick={() => downloadBlob(`/reports/leaves/excel${leaveQuery()}`, `cuti_${new Date().toISOString().slice(0,10)}.xls`)}>Excel</Button>
                        <Button variant="outline" onClick={() => downloadBlob(`/reports/leaves/pdf${leaveQuery()}`, `cuti_${new Date().toISOString().slice(0,10)}.pdf`)}>PDF</Button>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Rekap Sisa Cuti Tahunan per Pegawai</CardTitle>
                    <div className="flex items-center gap-2">
                        <Select value={recapScope} onValueChange={setRecapScope}>
                            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Pegawai</SelectItem>
                                <SelectItem value="akademik">Lingkungan Akademik (Dosen)</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={recapUnit || 'all'} onValueChange={(v) => setRecapUnit(v === 'all' ? '' : v)}>
                            <SelectTrigger className="w-44"><SelectValue placeholder="Semua Unit" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Unit</SelectItem>
                                {units?.map((u: any) => (
                                    <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="w-24">
                            <Input type="number" value={recapYear} onChange={(e) => setRecapYear(e.target.value)} placeholder="Tahun" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>NIK</TableHead>
                                <TableHead>Nama</TableHead>
                                <TableHead>Jabatan</TableHead>
                                <TableHead>Hak</TableHead>
                                <TableHead>Penyesuaian</TableHead>
                                <TableHead>Terpakai</TableHead>
                                <TableHead>Sisa</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!recap?.length ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground">Belum ada data saldo cuti.</TableCell>
                                </TableRow>
                            ) : (
                                recap.map((r: any) => (
                                    <TableRow key={r.employee_id}>
                                        <TableCell>{r.nik}</TableCell>
                                        <TableCell>{r.nama_lengkap}</TableCell>
                                        <TableCell>{r.jabatan || '-'}</TableCell>
                                        <TableCell>{r.entitled_days}</TableCell>
                                        <TableCell>{r.adjustment_days}</TableCell>
                                        <TableCell>{r.used_days}</TableCell>
                                        <TableCell className="font-bold">{r.remaining_days}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {recapScope === 'akademik' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Rencana Penggantian Dosen Pengajar (Cuti Aktif/Disetujui)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Dosen</TableHead>
                                    <TableHead>Jenis</TableHead>
                                    <TableHead>Mulai</TableHead>
                                    <TableHead>Selesai</TableHead>
                                    <TableHead>Lama (hari)</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!dosenCuti?.length ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">Tidak ada dosen cuti pada tahun ini.</TableCell>
                                    </TableRow>
                                ) : (
                                    dosenCuti.map((c: any) => (
                                        <TableRow key={c.id}>
                                            <TableCell>{c.nama}</TableCell>
                                            <TableCell>{c.jenis}</TableCell>
                                            <TableCell>{c.start_date}</TableCell>
                                            <TableCell>{c.end_date}</TableCell>
                                            <TableCell>{c.total_days}</TableCell>
                                            <TableCell>{c.status}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}