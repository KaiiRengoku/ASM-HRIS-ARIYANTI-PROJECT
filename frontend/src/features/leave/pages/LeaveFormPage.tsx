import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from '@/components/ui/use-toast';
import { extractErrorMessage } from '@/services/apiError';
import { useAuthStore } from '@/stores/authStore';
import { isIzin } from '@/features/leave/leaveTypes';

// Plafon ukuran lampiran — harus sama dengan validasi backend (max:51200 = 50 MB).
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = '50 MB';

const leaveSchema = z.object({
    employee_id: z.string().optional(),
    leave_type_id: z.string().min(1, 'Pilih jenis cuti'),
    start_date: z.string().min(1, 'Tanggal mulai wajib'),
    end_date: z.string().min(1, 'Tanggal selesai wajib'),
    reason: z.string().optional(),
});

type LeaveForm = z.infer<typeof leaveSchema>;

const fetchEmployees = async () => {
    const res = await api.get('/employees?per_page=100');
    return res.data.data;
};

interface LeaveTypeOption {
    id: number;
    code: string;
    name: string;
}

const fetchLeaveTypes = async (): Promise<LeaveTypeOption[]> => {
    const res = await api.get<{ data: LeaveTypeOption[] }>('/leave-types');
    return res.data.data;
};

const submitLeave = async (data: any) => {
    const response = await api.post('/leaves', data);
    return response.data;
};

export default function LeaveFormPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [file, setFile] = useState<File | null>(null);
    const { hasPermission, hasRole, user } = useAuthStore();
    const isHrd = hasPermission('leave.update');

    // Kategori dari URL (?category=cuti|izin). Dosen dipaksa hanya Izin.
    const paramCategory = searchParams.get('category');
    const category: 'cuti' | 'izin' | null = hasRole('DOSEN') ? 'izin' : (paramCategory === 'izin' || paramCategory === 'cuti' ? paramCategory : null);

    const { data: employees, isLoading: loadingEmployees } = useQuery({
        queryKey: ['employees-list'],
        queryFn: fetchEmployees,
        enabled: isHrd && hasPermission('employee.view'),
    });

    const { data: leaveTypes, isLoading: loadingLeaveTypes } = useQuery({
        queryKey: ['leave-types'],
        queryFn: fetchLeaveTypes,
    });

    // Saring tipe sesuai kategori: 'izin' hanya tipe izin, 'cuti' hanya non-izin,
    // null (tanpa param) tampilkan semua seperti sebelumnya.
    const filteredLeaveTypes = (leaveTypes ?? []).filter((type) => {
        if (category === 'izin') return isIzin(type.code);
        if (category === 'cuti') return !isIzin(type.code);
        return true;
    });

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<LeaveForm>({
        resolver: zodResolver(leaveSchema),
    });

    const mutation = useMutation({
        mutationFn: submitLeave,
        onSuccess: () => {
            toast({ title: 'Berhasil', description: 'Pengajuan cuti berhasil dikirim.' });
            navigate('/cuti');
        },
        onError: (e: unknown) => toast({ title: 'Gagal', description: extractErrorMessage(e), variant: 'destructive' }),
    });

    const onSubmit = (data: LeaveForm) => {
        // Cegah unggahan besar sebelum dikirim: pengguna dapat pesan jelas, server tidak dibebani.
        if (file && file.size > MAX_FILE_SIZE) {
            toast({
                title: 'File terlalu besar',
                description: `Ukuran file melebihi ${MAX_FILE_SIZE_LABEL}. Silakan kompres atau pilih file lebih kecil.`,
                variant: 'destructive',
            });
            return;
        }
        const formData = new FormData();
        if (data.employee_id) formData.append('employee_id', data.employee_id);
        formData.append('leave_type_id', data.leave_type_id);
        formData.append('start_date', data.start_date);
        formData.append('end_date', data.end_date);
        if (data.reason) formData.append('reason', data.reason);
        if (file) formData.append('attachment', file);
        mutation.mutate(formData as any);
    };

    if ((isHrd && loadingEmployees) || loadingLeaveTypes) return <div className="p-6">Memuat data...</div>;

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold">Ajukan Cuti / Izin</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Form Pengajuan</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {isHrd ? (
                        <div>
                            <Label>Pegawai</Label>
                            <Select onValueChange={(v) => setValue('employee_id', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih pegawai" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees?.map((emp: any) => (
                                        <SelectItem key={emp.id} value={String(emp.id)}>{emp.nama_lengkap}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.employee_id && <p className="text-sm text-destructive">{errors.employee_id.message}</p>}
                        </div>
                        ) : (
                        <div>
                            <Label>Pegawai</Label>
                            <p className="text-sm font-medium">{user?.name || '-'}</p>
                        </div>
                        )}
                        <div>
                            <Label>Jenis Cuti</Label>
                            <Select onValueChange={(v) => setValue('leave_type_id', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih jenis" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredLeaveTypes.map((type) => (
                                        <SelectItem key={type.id} value={String(type.id)}>{type.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.leave_type_id && <p className="text-sm text-destructive">{errors.leave_type_id.message}</p>}
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <Label>Tanggal Mulai</Label>
                                <Input type="date" {...register('start_date')} />
                                {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
                            </div>
                            <div>
                                <Label>Tanggal Selesai</Label>
                                <Input type="date" {...register('end_date')} />
                                {errors.end_date && <p className="text-sm text-destructive">{errors.end_date.message}</p>}
                            </div>
                        </div>
                        <div>
                            <Label>Alasan (opsional)</Label>
                            <Input {...register('reason')} placeholder="Alasan cuti/izin" />
                        </div>
                        <div>
                            <Label>Lampiran (opsional)</Label>
                            <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                            <p className="text-xs text-muted-foreground">Maksimal {MAX_FILE_SIZE_LABEL}, format PDF/JPG/PNG</p>
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? 'Mengirim...' : 'Ajukan'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => navigate('/cuti')}>Batal</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}