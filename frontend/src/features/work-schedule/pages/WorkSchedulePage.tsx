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

const fetchSchedules = async () => {
    const res = await api.get('/work-schedules');
    return res.data.data;
};

const createSchedule = async (data: any) => {
    const res = await api.post('/work-schedules', data);
    return res.data.data;
};

const updateSchedule = async ({ id, data }: { id: number; data: any }) => {
    const res = await api.put(`/work-schedules/${id}`, data);
    return res.data.data;
};

const deleteSchedule = async (id: number) => {
    await api.delete(`/work-schedules/${id}`);
};

export default function WorkSchedulePage() {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [organizationalUnitId, setOrganizationalUnitId] = useState('');
    const [dayOfWeek, setDayOfWeek] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isWorkingDay, setIsWorkingDay] = useState(true);
    const [effectiveFrom, setEffectiveFrom] = useState('');
    const [effectiveUntil, setEffectiveUntil] = useState('');
    const [isActive, setIsActive] = useState(true);

    const queryClient = useQueryClient();
    const { hasRole } = useAuthStore();
    const isHrd = hasRole('HRD');

    const { data: schedules, isLoading, error } = useQuery({
        queryKey: ['work-schedules'],
        queryFn: fetchSchedules,
    });

    const { data: units } = useQuery({
        queryKey: ['organizational-units'],
        queryFn: async () => (await api.get('/organizational-units')).data.data,
    });

    const createMutation = useMutation({
        mutationFn: createSchedule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-schedules'] });
            toast({ title: 'Berhasil', description: 'Jam kerja ditambahkan.' });
            setOpen(false);
            resetForm();
        },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const updateMutation = useMutation({
        mutationFn: updateSchedule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-schedules'] });
            toast({ title: 'Berhasil', description: 'Jam kerja diperbarui.' });
            setOpen(false);
            resetForm();
            setEditing(null);
        },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteSchedule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-schedules'] });
            toast({ title: 'Berhasil', description: 'Jam kerja dihapus.' });
        },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    const resetForm = () => {
        setOrganizationalUnitId('');
        setDayOfWeek('');
        setStartTime('');
        setEndTime('');
        setIsWorkingDay(true);
        setEffectiveFrom('');
        setEffectiveUntil('');
        setIsActive(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            organizational_unit_id: organizationalUnitId || null,
            day_of_week: parseInt(dayOfWeek),
            start_time: startTime,
            end_time: endTime,
            is_working_day: isWorkingDay,
            effective_from: effectiveFrom,
            effective_until: effectiveUntil || null,
            is_active: isActive,
        };
        if (editing) {
            updateMutation.mutate({ id: editing.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const openEdit = (schedule: any) => {
        setEditing(schedule);
        setOrganizationalUnitId(schedule.organizational_unit_id || '');
        setDayOfWeek(String(schedule.day_of_week));
        setStartTime(schedule.start_time);
        setEndTime(schedule.end_time);
        setIsWorkingDay(schedule.is_working_day);
        setEffectiveFrom(schedule.effective_from);
        setEffectiveUntil(schedule.effective_until || '');
        setIsActive(schedule.is_active);
        setOpen(true);
    };

    if (isLoading) return <div className="p-6">Memuat jam kerja...</div>;
    if (error) return <div className="p-6 text-destructive">Gagal memuat data.</div>;

    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Jam Kerja</h1>
                    <p className="text-muted-foreground">Kelola konfigurasi jam kerja</p>
                </div>
                {isHrd && (
                <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { resetForm(); setEditing(null); } }}>
                        <DialogTrigger asChild>
                            <Button>+ Tambah Jam Kerja</Button>
                        </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editing ? 'Edit' : 'Tambah'} Jam Kerja</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label>Unit / Divisi (kosongkan = global)</Label>
                                <Select value={organizationalUnitId || 'global'} onValueChange={(v) => setOrganizationalUnitId(v === 'global' ? '' : v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Global (semua divisi)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="global">Global (semua divisi)</SelectItem>
                                        {units?.map((u: any) => (
                                            <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Hari</Label>
                                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih hari" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {days.map((d, i) => (
                                            <SelectItem key={i+1} value={String(i+1)}>{d}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label>Jam Mulai</Label>
                                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                                </div>
                                <div>
                                    <Label>Jam Selesai</Label>
                                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox checked={isWorkingDay} onCheckedChange={(v) => setIsWorkingDay(!!v)} />
                                <Label>Hari Kerja</Label>
                            </div>
                            <div>
                                <Label>Berlaku Mulai</Label>
                                <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />
                            </div>
                            <div>
                                <Label>Berlaku Sampai (opsional)</Label>
                                <Input type="date" value={effectiveUntil} onChange={(e) => setEffectiveUntil(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
                                <Label>Aktif</Label>
                            </div>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
                )}
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Hari</TableHead>
                                <TableHead>Divisi</TableHead>
                                <TableHead>Jam Mulai</TableHead>
                                <TableHead>Jam Selesai</TableHead>
                                <TableHead>Hari Kerja</TableHead>
                                <TableHead>Aktif</TableHead>
                                {isHrd && <TableHead className="text-right">Aksi</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {schedules?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isHrd ? 7 : 6} className="text-center text-muted-foreground">Belum ada jam kerja</TableCell>
                                </TableRow>
                            ) : (
                                schedules?.map((s: any) => (
                                    <TableRow key={s.id}>
                                        <TableCell>{days[s.day_of_week - 1]}</TableCell>
                                        <TableCell>{s.organizational_unit?.name || 'Global'}</TableCell>
                                        <TableCell>{s.start_time}</TableCell>
                                        <TableCell>{s.end_time}</TableCell>
                                        <TableCell>{s.is_working_day ? 'Ya' : 'Tidak'}</TableCell>
                                        <TableCell>{s.is_active ? 'Ya' : 'Tidak'}</TableCell>
                                        {isHrd && (
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                                            <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(s.id)}>Hapus</Button>
                                        </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
