import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/stores/authStore';

const fetchHolidays = async () => (await api.get('/holidays')).data.data;
const createHoliday = async (data: any) => (await api.post('/holidays', data)).data.data;
const updateHoliday = async ({ id, data }: { id: number; data: any }) => (await api.put(`/holidays/${id}`, data)).data.data;
const deleteHoliday = async (id: number) => { await api.delete(`/holidays/${id}`); };
const toggleHoliday = async (id: number) => (await api.patch(`/holidays/${id}/toggle`)).data.data;

const fetchSchedules = async () => (await api.get('/work-schedules')).data.data;
const bulkSchedules = async (data: any) => (await api.post('/work-schedules/bulk', data)).data.data;
const updateSchedule = async ({ id, data }: { id: number; data: any }) => (await api.put(`/work-schedules/${id}`, data)).data.data;
const toggleSchedule = async (id: number) => (await api.patch(`/work-schedules/${id}/toggle`)).data.data;
const deleteSchedule = async (id: number) => { await api.delete(`/work-schedules/${id}`); };

const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const workdays = [2, 3, 4, 5, 6];

export default function CalendarPage() {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [date, setDate] = useState('');
    const [name, setName] = useState('');
    const [holidayType, setHolidayType] = useState('NATIONAL');
    const [notes, setNotes] = useState('');

    const [wsOpen, setWsOpen] = useState(false);
    const [selectedDays, setSelectedDays] = useState<number[]>(workdays);
    const [wsStart, setWsStart] = useState('08:00');
    const [wsEnd, setWsEnd] = useState('16:00');
    const [editingWsId, setEditingWsId] = useState<number | null>(null);
    const [editStart, setEditStart] = useState('');
    const [editEnd, setEditEnd] = useState('');
    const [bulkUnitId, setBulkUnitId] = useState('');

    const monthStart = new Date();
    monthStart.setDate(1);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const toISODate = (d: Date) => d.toISOString().slice(0, 10);
    const [viewFrom, setViewFrom] = useState(toISODate(monthStart));
    const [viewTo, setViewTo] = useState(toISODate(monthEnd));
    const [viewUnitId, setViewUnitId] = useState('');
    const rangeDays = viewFrom && viewTo ? Math.round((new Date(viewTo).getTime() - new Date(viewFrom).getTime()) / 86400000) + 1 : 0;
    const rangeValid = !!viewFrom && !!viewTo && viewTo >= viewFrom && rangeDays <= 366;

    const queryClient = useQueryClient();
    const { hasRole } = useAuthStore();
    const isHrd = hasRole('HRD');

    const { data: holidays, isLoading, error } = useQuery({ queryKey: ['holidays'], queryFn: fetchHolidays });
    const { data: schedules } = useQuery({ queryKey: ['work-schedules'], queryFn: fetchSchedules });
    const { data: units } = useQuery({
        queryKey: ['organizational-units'],
        queryFn: async () => (await api.get('/organizational-units')).data.data,
    });

    const fetchCalendarView = async () => (await api.get('/calendar-view', { params: { from: viewFrom, to: viewTo, unit_id: viewUnitId || undefined } })).data.data;
    const { data: calendarView, isLoading: isViewLoading, error: viewError } = useQuery({
        queryKey: ['calendar-view', viewFrom, viewTo, viewUnitId],
        queryFn: fetchCalendarView,
        enabled: rangeValid,
    });
    const viewHolidays: any[] = calendarView?.holidays ?? [];
    const viewLeaves: any[] = calendarView?.leaves ?? [];
    const viewSchedules: any[] = calendarView?.schedules ?? [];

    const createMutation = useMutation({
        mutationFn: createHoliday,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); toast({ title: 'Berhasil', description: 'Hari libur ditambahkan.' }); setOpen(false); resetForm(); },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const updateMutation = useMutation({
        mutationFn: updateHoliday,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); toast({ title: 'Berhasil', description: 'Hari libur diperbarui.' }); setOpen(false); resetForm(); setEditing(null); },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteHoliday,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); toast({ title: 'Berhasil', description: 'Hari libur dihapus.' }); },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const toggleHolidayMutation = useMutation({
        mutationFn: toggleHoliday,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); toast({ title: 'Berhasil', description: 'Status libur diubah.' }); },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const bulkMutation = useMutation({
        mutationFn: bulkSchedules,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['work-schedules'] }); toast({ title: 'Berhasil', description: 'Jam kerja disimpan.' }); },
        onError: (e: any) => toast({ title: 'Gagal', description: e.response?.data?.message || 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const timeEditMutation = useMutation({
        mutationFn: updateSchedule,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['work-schedules'] }); toast({ title: 'Berhasil', description: 'Jam diperbarui.' }); setEditingWsId(null); },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const toggleMutation = useMutation({
        mutationFn: toggleSchedule,
        onSuccess: (d: any) => { queryClient.invalidateQueries({ queryKey: ['work-schedules'] }); toast({ title: 'Berhasil', description: d?.is_active ? 'Aturan diaktifkan.' : 'Aturan dinonaktifkan (libur sementara).' }); },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const wsDeleteMutation = useMutation({
        mutationFn: deleteSchedule,
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['work-schedules'] }); toast({ title: 'Berhasil', description: 'Jam kerja dihapus.' }); },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const resetForm = () => { setDate(''); setName(''); setHolidayType('NATIONAL'); setNotes(''); };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = { date, name, holiday_type: holidayType, notes };
        if (editing) updateMutation.mutate({ id: editing.id, data });
        else createMutation.mutate(data);
    };

    const openEdit = (holiday: any) => {
        setEditing(holiday); setDate(holiday.date); setName(holiday.name);
        setHolidayType(holiday.holiday_type); setNotes(holiday.notes || ''); setOpen(true);
    };

    const toggleDay = (day: number) => {
        setSelectedDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
    };

    const submitBulk = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedDays.length === 0) {
            toast({ title: 'Gagal', description: 'Pilih minimal 1 hari.', variant: 'destructive' });
            return;
        }
        bulkMutation.mutate({ days: selectedDays, start_time: wsStart, end_time: wsEnd, organizational_unit_id: bulkUnitId ? Number(bulkUnitId) : null });
    };

    const startInlineEdit = (s: any) => {
        setEditingWsId(s.id);
        setEditStart(s.start_time?.slice(0, 5) || '');
        setEditEnd(s.end_time?.slice(0, 5) || '');
    };

    if (isLoading) return <div className="p-6">Memuat kalender...</div>;
    if (error) return <div className="p-6 text-destructive">Gagal memuat data.</div>;

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Kalender Kerja</h1>
                    <p className="text-muted-foreground">Kelola hari libur dan cuti bersama</p>
                </div>
                <div className="flex gap-2">
                    {isHrd && (
                    <Dialog open={wsOpen} onOpenChange={setWsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">Jam Kerja</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader><DialogTitle>Jam Kerja Divisi</DialogTitle></DialogHeader>
                            <form onSubmit={submitBulk} className="space-y-4 border-b pb-4">
                                <div className="space-y-2">
                                    <Label>Unit / Divisi (kosongkan = global)</Label>
                                    <Select value={bulkUnitId || 'global'} onValueChange={(v) => setBulkUnitId(v === 'global' ? '' : v)}>
                                        <SelectTrigger><SelectValue placeholder="Global (semua divisi)" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="global">Global (semua divisi)</SelectItem>
                                            {units?.map((u: any) => (
                                                <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Hari kerja (bisa pilih sekaligus)</Label>
                                    <div className="flex flex-wrap gap-4">
                                        {workdays.map((d) => (
                                            <Label key={d} className="flex items-center gap-2 cursor-pointer font-normal">
                                                <Checkbox checked={selectedDays.includes(d)} onCheckedChange={() => toggleDay(d)} />
                                                {days[d - 1]}
                                            </Label>
                                        ))}
                                        {[1, 7].map((d) => (
                                            <Label key={d} className="flex items-center gap-2 cursor-pointer font-normal text-muted-foreground">
                                                <Checkbox checked={selectedDays.includes(d)} onCheckedChange={() => toggleDay(d)} />
                                                {days[d - 1]}
                                            </Label>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Jam Mulai</Label>
                                        <Input type="time" value={wsStart} onChange={(e) => setWsStart(e.target.value)} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Jam Selesai</Label>
                                        <Input type="time" value={wsEnd} onChange={(e) => setWsEnd(e.target.value)} required />
                                    </div>
                                </div>
                                <Button type="submit" disabled={bulkMutation.isPending}>
                                    {bulkMutation.isPending ? 'Menyimpan...' : 'Simpan Jam Kerja'}
                                </Button>
                            </form>
                            <p className="text-xs text-muted-foreground">Nonaktif = hari libur sementara tanpa hapus data. Hari tanpa baris = libur.</p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Hari</TableHead>
                                        <TableHead>Jam</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!schedules || schedules.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Belum ada jam kerja</TableCell></TableRow>
                                    ) : (
                                        schedules.map((s: any) => (
                                            <TableRow key={s.id}>
                                                <TableCell>{days[s.day_of_week - 1]}</TableCell>
                                                <TableCell>
                                                    {editingWsId === s.id ? (
                                                        <span className="flex items-center gap-2">
                                                            <Input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} className="w-28" />
                                                            <span>-</span>
                                                            <Input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className="w-28" />
                                                        </span>
                                                    ) : (
                                                        `${s.start_time?.slice(0, 5)} - ${s.end_time?.slice(0, 5)}`
                                                    )}
                                                </TableCell>
                                                <TableCell>{s.is_active ? 'Aktif' : 'Nonaktif'}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    {editingWsId === s.id ? (
                                                        <>
                                                            <Button size="sm" onClick={() => timeEditMutation.mutate({ id: s.id, data: { start_time: editStart, end_time: editEnd } })}>Simpan</Button>
                                                            <Button variant="outline" size="sm" onClick={() => setEditingWsId(null)}>Batal</Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button variant="outline" size="sm" onClick={() => startInlineEdit(s)}>Edit Jam</Button>
                                                            <Button variant="outline" size="sm" onClick={() => toggleMutation.mutate(s.id)}>
                                                                {s.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                            </Button>
                                                            <Button variant="destructive" size="sm" onClick={() => { if (confirm('Hapus jam kerja ini?')) wsDeleteMutation.mutate(s.id); }}>Hapus</Button>
                                                        </>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </DialogContent>
                    </Dialog>
                    )}

                    {isHrd && (
                    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { resetForm(); setEditing(null); } }}>
                        <DialogTrigger asChild>
                            <Button>+ Tambah Hari Libur</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Tambah'} Hari Libur</DialogTitle></DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Tanggal</Label>
                                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nama</Label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama hari libur" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipe</Label>
                                    <Select value={holidayType} onValueChange={setHolidayType}>
                                        <SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NATIONAL">Nasional</SelectItem>
                                            <SelectItem value="JOINT_LEAVE">Cuti Bersama</SelectItem>
                                            <SelectItem value="OTHER">Lainnya</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Catatan</Label>
                                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan" />
                                </div>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                    )}
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Nama</TableHead>
                                <TableHead>Tipe</TableHead>
                                <TableHead>Catatan</TableHead>
                                <TableHead>Status</TableHead>
                                {isHrd && <TableHead className="text-right">Aksi</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {holidays?.length === 0 ? (
                                <TableRow><TableCell colSpan={isHrd ? 6 : 5} className="text-center text-muted-foreground">Belum ada hari libur</TableCell></TableRow>
                            ) : (
                                holidays?.map((h: any) => (
                                    <TableRow key={h.id}>
                                        <TableCell>{h.date}</TableCell>
                                        <TableCell>{h.name}</TableCell>
                                        <TableCell>{h.holiday_type}</TableCell>
                                        <TableCell>{h.notes || '-'}</TableCell>
                                        <TableCell>{h.is_active ? 'Aktif' : 'Nonaktif'}</TableCell>
                                        {isHrd && (
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => openEdit(h)}>Edit</Button>
                                            <Button variant="outline" size="sm" onClick={() => toggleHolidayMutation.mutate(h.id)}>{h.is_active ? 'Nonaktifkan' : 'Aktifkan'}</Button>
                                            <Button variant="destructive" size="sm" onClick={() => { if (confirm('Hapus hari libur ini?')) deleteMutation.mutate(h.id); }}>Hapus</Button>
                                        </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Gambaran Kalender</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Tanggal Mulai</Label>
                            <Input type="date" value={viewFrom} onChange={(e) => setViewFrom(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Tanggal Selesai</Label>
                            <Input type="date" value={viewTo} onChange={(e) => setViewTo(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Unit / Divisi</Label>
                            <Select value={viewUnitId || 'all'} onValueChange={(v) => setViewUnitId(v === 'all' ? '' : v)}>
                                <SelectTrigger><SelectValue placeholder="Semua divisi" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua divisi</SelectItem>
                                    {units?.map((u: any) => (
                                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {!rangeValid ? (
                        <p className="text-sm text-destructive">Rentang tanggal tidak valid (tanggal selesai harus setelah tanggal mulai, maksimal 366 hari).</p>
                    ) : isViewLoading ? (
                        <p className="text-sm text-muted-foreground">Memuat gambaran kalender...</p>
                    ) : viewError ? (
                        <p className="text-sm text-destructive">Gagal memuat data.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <h3 className="font-semibold">Libur ({viewHolidays.length})</h3>
                                {viewHolidays.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Tidak ada libur pada rentang ini.</p>
                                ) : (
                                    viewHolidays.map((h: any) => (
                                        <p key={h.id} className="text-sm">{h.date} — {h.name}</p>
                                    ))
                                )}
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold">Cuti ({viewLeaves.length})</h3>
                                {viewLeaves.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Tidak ada cuti pada rentang ini.</p>
                                ) : (
                                    viewLeaves.map((l: any) => (
                                        <p key={l.id} className="text-sm">{l.employee?.nama_lengkap || `Pegawai #${l.employee_id}`} — {l.start_date} s/d {l.end_date} — {l.status}</p>
                                    ))
                                )}
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold">Jadwal ({viewSchedules.length})</h3>
                                {viewSchedules.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Tidak ada jadwal aktif untuk filter ini.</p>
                                ) : (
                                    viewSchedules.map((s: any) => (
                                        <p key={s.id} className="text-sm">{days[s.day_of_week - 1]} {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}{s.organizational_unit?.name ? ` — ${s.organizational_unit.name}` : ''}</p>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}