import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { z } from 'zod';

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
const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const weekHead = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const viewHolidaySchema = z.object({ id: z.number(), name: z.string(), date: z.string() });
const viewLeaveSchema = z.object({
    id: z.number(),
    start_date: z.string(),
    end_date: z.string(),
    employee: z.object({ nama_lengkap: z.string() }).nullish(),
});
const viewScheduleSchema = z.object({
    id: z.number(),
    day_of_week: z.number(),
    start_time: z.string().nullish(),
    end_time: z.string().nullish(),
});
const calendarViewSchema = z.object({
    holidays: z.array(viewHolidaySchema).optional().default([]),
    leaves: z.array(viewLeaveSchema).optional().default([]),
    schedules: z.array(viewScheduleSchema).optional().default([]),
});
type CalendarView = z.infer<typeof calendarViewSchema>;
interface LeaveSpan { id: number; label: string; start: string; end: string }
interface ScheduleInfo { id: number; day: string; time: string }

export default function CalendarPage() {
    const [holidayDeleteId, setHolidayDeleteId] = useState<number | null>(null);
    const [wsDeleteId, setWsDeleteId] = useState<number | null>(null);
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

    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const goMonth = (delta: number) => {
        const d = new Date(viewYear, viewMonth + delta, 1);
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
    };
    const goToday = () => {
        const t = new Date();
        setViewYear(t.getFullYear());
        setViewMonth(t.getMonth());
    };

    const monthPad = String(viewMonth + 1).padStart(2, '0');
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const viewFrom = `${viewYear}-${monthPad}-01`;
    const viewTo = `${viewYear}-${monthPad}-${String(daysInMonth).padStart(2, '0')}`;
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const queryClient = useQueryClient();
    const { hasPermission } = useAuthStore();
    const isHrd = hasPermission('calendar.manage');

    const { data: holidays, isLoading, error } = useQuery({ queryKey: ['holidays'], queryFn: fetchHolidays });
    const { data: schedules } = useQuery({ queryKey: ['work-schedules'], queryFn: fetchSchedules });

    const fetchCalendarView = async () => (await api.get('/calendar-view', { params: { from: viewFrom, to: viewTo } })).data.data;
    const { data: calendarView, isLoading: isViewLoading, error: viewError } = useQuery({
        queryKey: ['calendar-view', viewFrom, viewTo],
        queryFn: fetchCalendarView,
    });

    const parsedView = calendarViewSchema.safeParse(calendarView);
    const view: CalendarView = parsedView.success ? parsedView.data : { holidays: [], leaves: [], schedules: [] };
    const viewHolidays = view.holidays;

    const viewLeaves: LeaveSpan[] = [];
    for (const item of view.leaves) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(item.end_date) || item.end_date < item.start_date) continue;
        const label = item.employee?.nama_lengkap && item.employee.nama_lengkap.length > 0
            ? item.employee.nama_lengkap
            : `Pegawai #${item.id}`;
        viewLeaves.push({ id: item.id, label, start: item.start_date, end: item.end_date });
    }

    const viewSchedules: ScheduleInfo[] = [];
    for (const item of view.schedules) {
        viewSchedules.push({
            id: item.id,
            day: days[item.day_of_week - 1] ?? `Hari ${item.day_of_week}`,
            time: `${item.start_time?.slice(0, 5) ?? ''}-${item.end_time?.slice(0, 5) ?? ''}`,
        });
    }

    const holidayMap = new Map<string, typeof viewHolidays>();
    for (const h of viewHolidays) {
        const list = holidayMap.get(h.date) ?? [];
        list.push(h);
        holidayMap.set(h.date, list);
    }

    const leaveMap = new Map<string, string[]>();
    for (const l of viewLeaves) {
        let cur = l.start;
        while (cur <= l.end) {
            const list = leaveMap.get(cur) ?? [];
            list.push(l.label);
            leaveMap.set(cur, list);
            const parts = cur.split('-').map(Number);
            const dt = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, (parts[2] ?? 1) + 1);
            cur = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        }
    }

    const firstOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const monthCells: (string | null)[] = [
        ...Array<string | null>(firstOffset).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => `${viewYear}-${monthPad}-${String(i + 1).padStart(2, '0')}`),
    ];

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
        bulkMutation.mutate({ days: selectedDays, start_time: wsStart, end_time: wsEnd, organizational_unit_id: null });
    };

    const startInlineEdit = (s: any) => {
        setEditingWsId(s.id);
        setEditStart(s.start_time?.slice(0, 5) || '');
        setEditEnd(s.end_time?.slice(0, 5) || '');
    };

    if (isLoading) return <div className="p-6">Memuat kalender...</div>;
    if (error) return <div className="p-6 text-destructive">Gagal memuat data.</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Kalender Kerja</h1>
                    <p className="text-muted-foreground">Kelola hari libur dan cuti bersama</p>
                </div>
                <div className="flex gap-2">
                    {isHrd && (
                    <Dialog open={wsOpen} onOpenChange={setWsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">Jam Kerja Kantor</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader><DialogTitle>Jam Kerja Kantor</DialogTitle></DialogHeader>
                            <form onSubmit={submitBulk} className="space-y-4 border-b pb-4">
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
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                                                            <Button variant="destructive" size="sm" onClick={() => setWsDeleteId(s.id)}>Hapus</Button>
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
                                        <TableCell className="text-right">
                                            <div className="flex flex-wrap justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => openEdit(h)}>Edit</Button>
                                            <Button variant="outline" size="sm" onClick={() => toggleHolidayMutation.mutate(h.id)}>{h.is_active ? 'Nonaktifkan' : 'Aktifkan'}</Button>
                                            <Button variant="destructive" size="sm" onClick={() => setHolidayDeleteId(h.id)}>Hapus</Button>
                                            </div>
                                        </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold">Gambaran Kalender</h2>
                        <p className="text-sm text-muted-foreground">Merah berarti kantor tutup, biru berarti ada yang cuti. Pindah bulan untuk melihat periode lain.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => goMonth(-1)} aria-label="Bulan sebelumnya">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <p className="min-w-32 text-center text-sm font-semibold">{monthNames[viewMonth]} {viewYear}</p>
                        <Button variant="outline" size="sm" onClick={() => goMonth(1)} aria-label="Bulan berikutnya">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={goToday}>Hari ini</Button>
                    </div>
                </div>

                {isViewLoading ? (
                    <p className="text-sm text-muted-foreground">Memuat gambaran kalender...</p>
                ) : viewError ? (
                    <p className="text-sm text-destructive">Gagal memuat data.</p>
                ) : (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            {viewHolidays.length} hari kantor tutup, {viewLeaves.length} pengajuan cuti pada {monthNames[viewMonth]} {viewYear}.
                        </p>
                        <div className="overflow-hidden rounded-lg border">
                            <div className="grid grid-cols-7 bg-muted/50">
                                {weekHead.map((w) => (
                                    <p key={w} className="px-1 py-2 text-center text-xs font-semibold text-muted-foreground">{w}</p>
                                ))}
                            </div>
                            <div className="grid grid-cols-7">
                                {monthCells.map((iso, i) => {
                                    if (iso === null) return <div key={`e-${i}`} className="min-h-14 border-t bg-muted/20 sm:min-h-20" />;
                                    const dayHolidays = holidayMap.get(iso) ?? [];
                                    const dayLeaves = leaveMap.get(iso) ?? [];
                                    return (
                                        <div key={iso} className="min-h-14 space-y-1 border-t p-1 sm:min-h-20 sm:p-1.5">
                                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${iso === todayISO ? 'bg-primary font-bold text-primary-foreground' : 'text-muted-foreground'}`}>{Number(iso.slice(8, 10))}</span>
                                            {dayHolidays.map((h) => (
                                                <p key={`h-${h.id}`} title={h.name} className="hidden truncate rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-800 sm:block">{h.name}</p>
                                            ))}
                                            {dayLeaves.slice(0, 2).map((label, j) => (
                                                <p key={`l-${j}`} title={label} className="hidden truncate rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-medium text-blue-800 sm:block">{label}</p>
                                            ))}
                                            {dayLeaves.length > 2 && (
                                                <p className="hidden text-[11px] text-blue-700 sm:block">+{dayLeaves.length - 2} lainnya</p>
                                            )}
                                            {(dayHolidays.length > 0 || dayLeaves.length > 0) && (
                                                <div className="flex items-center justify-center gap-1 sm:hidden">
                                                    {dayHolidays.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                                                    {dayLeaves.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Kantor tutup</span>
                            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Ada yang cuti</span>
                            <span>Jam kerja: {viewSchedules.length === 0 ? 'belum diatur' : viewSchedules.map((s) => `${s.day} ${s.time}`).join(', ')}</span>
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={holidayDeleteId !== null} onOpenChange={(v) => { if (!v) setHolidayDeleteId(null); }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Hapus Hari Libur</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Yakin ingin menghapus hari libur ini?</p>
                        <div className="flex gap-2">
                            <Button
                                variant="destructive"
                                onClick={() => { if (holidayDeleteId) deleteMutation.mutate(holidayDeleteId); setHolidayDeleteId(null); }}
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending ? 'Menghapus...' : 'Ya'}
                            </Button>
                            <Button variant="outline" onClick={() => setHolidayDeleteId(null)}>Tidak</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={wsDeleteId !== null} onOpenChange={(v) => { if (!v) setWsDeleteId(null); }}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Hapus Jam Kerja</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Yakin ingin menghapus jam kerja ini?</p>
                        <div className="flex gap-2">
                            <Button
                                variant="destructive"
                                onClick={() => { if (wsDeleteId) wsDeleteMutation.mutate(wsDeleteId); setWsDeleteId(null); }}
                                disabled={wsDeleteMutation.isPending}
                            >
                                {wsDeleteMutation.isPending ? 'Menghapus...' : 'Ya'}
                            </Button>
                            <Button variant="outline" onClick={() => setWsDeleteId(null)}>Tidak</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
