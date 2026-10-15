import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { extractErrorMessage } from '@/services/apiError';
import { useAuthStore } from '@/stores/authStore';
import { isIzin } from '@/features/leave/leaveTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
// Plafon ukuran lampiran — harus sama dengan validasi backend (max:51200 = 50 MB).
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = '50 MB';


// Form pengajuan minimalis dalam modal, supaya pengguna tetap di halaman
// Cuti & Izin (tidak berpindah ke tab/halaman baru).

interface LeaveTypeOption {
    id: number;
    code: string;
    name: string;
}

interface EmployeeOption {
    id: number;
    nama_lengkap: string;
}

type Props = {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    category: 'cuti' | 'izin';
    onSuccess?: () => void;
};

const schema = z
    .object({
        employee_id: z.string().optional(),
        leave_type_id: z.string().min(1, 'Jenis wajib dipilih'),
        start_date: z.string().min(1, 'Tanggal mulai wajib diisi'),
        end_date: z.string().min(1, 'Tanggal selesai wajib diisi'),
        reason: z.string().optional(),
    })
    .refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, {
        message: 'Tanggal selesai tidak boleh sebelum tanggal mulai',
        path: ['end_date'],
    });

type FormValues = z.infer<typeof schema>;

const fetchLeaveTypes = async (): Promise<LeaveTypeOption[]> => {
    const res = await api.get<{ data: LeaveTypeOption[] }>('/leave-types');
    return res.data.data;
};

const fetchEmployees = async (): Promise<EmployeeOption[]> => {
    const res = await api.get<{ data: EmployeeOption[] }>('/employees?per_page=100');
    return res.data.data;
};

export default function LeaveSubmitDialog({ open, onOpenChange, category, onSuccess }: Props) {
    const queryClient = useQueryClient();
    const { hasPermission } = useAuthStore();
    // Field "Pegawai" hanya untuk yang boleh mencatat atas nama orang lain (HRD).
    const isHrd = hasPermission('leave.update');
    const [file, setFile] = useState<File | null>(null);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '' },
    });

    const { data: leaveTypes } = useQuery({
        queryKey: ['leave-types'],
        queryFn: fetchLeaveTypes,
        enabled: open,
    });

    const { data: employees } = useQuery({
        queryKey: ['employees-list'],
        queryFn: fetchEmployees,
        enabled: open && isHrd && hasPermission('employee.view'),
    });

    // Saring tipe sesuai kategori tab (izin vs cuti).
    const filteredTypes = (leaveTypes ?? []).filter((t) =>
        category === 'izin' ? isIzin(t.code) : !isIzin(t.code),
    );

    const mutation = useMutation({
        mutationFn: async (payload: FormData) =>
            api.post('/leaves', payload, { headers: { 'Content-Type': 'multipart/form-data' } }),
        onSuccess: () => {
            toast({
                title: 'Berhasil',
                description: `Pengajuan ${category === 'izin' ? 'izin' : 'cuti'} berhasil dikirim.`,
            });
            reset();
            setFile(null);
            onOpenChange(false);
            // Segarkan daftar (approved) di tab yang sedang aktif.
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            onSuccess?.();
        },
        onError: (e: unknown) =>
            // Pesan server ditampilkan apa adanya, mis. penolakan Dosen (403).
            toast({ title: 'Gagal', description: extractErrorMessage(e), variant: 'destructive' }),
    });

    // Reset isian tiap kali modal dibuka.
    useEffect(() => {
        if (open) {
            reset();
            setFile(null);
        }
    }, [open, reset]);

    const onSubmit = (data: FormValues) => {
        // Cegah unggahan besar sebelum dikirim: pengguna dapat pesan jelas, server tidak dibebani.
        if (file && file.size > MAX_FILE_SIZE) {
            toast({
                title: 'File terlalu besar',
                description: `Ukuran file melebihi ${MAX_FILE_SIZE_LABEL}. Silakan kompres atau pilih file lebih kecil.`,
                variant: 'destructive',
            });
            return;
        }
        const fd = new FormData();
        if (isHrd && data.employee_id) fd.append('employee_id', data.employee_id);
        fd.append('leave_type_id', data.leave_type_id);
        fd.append('start_date', data.start_date);
        fd.append('end_date', data.end_date);
        if (data.reason) fd.append('reason', data.reason);
        if (file) fd.append('attachment', file);
        mutation.mutate(fd);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{category === 'izin' ? 'Ajukan Izin' : 'Ajukan Cuti'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {isHrd && (
                        <div className="space-y-2">
                            <Label>Pegawai</Label>
                            <Select onValueChange={(v) => setValue('employee_id', v)}>
                                <SelectTrigger><SelectValue placeholder="Pilih pegawai" /></SelectTrigger>
                                <SelectContent>
                                    {employees?.map((emp) => (
                                        <SelectItem key={emp.id} value={String(emp.id)}>{emp.nama_lengkap}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Jenis</Label>
                        <Select onValueChange={(v) => setValue('leave_type_id', v)}>
                            <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                            <SelectContent>
                                {filteredTypes.map((t) => (
                                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.leave_type_id && <p className="text-sm text-destructive">{errors.leave_type_id.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Tanggal Mulai</Label>
                            <Input type="date" {...register('start_date')} />
                            {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Tanggal Selesai</Label>
                            <Input type="date" {...register('end_date')} />
                            {errors.end_date && <p className="text-sm text-destructive">{errors.end_date.message}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Keterangan (opsional)</Label>
                        <Textarea rows={2} placeholder="Keterangan singkat" {...register('reason')} />
                    </div>

                    <div className="space-y-2">
                        <Label>Lampiran (opsional)</Label>
                        <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
                        <p className="text-xs text-muted-foreground">Maksimal {MAX_FILE_SIZE_LABEL}, format PDF/JPG/PNG</p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Mengirim...' : 'Kirim'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
