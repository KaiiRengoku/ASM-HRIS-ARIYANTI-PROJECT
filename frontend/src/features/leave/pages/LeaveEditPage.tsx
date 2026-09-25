import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from '@/components/ui/use-toast';

const leaveSchema = z.object({
    leave_type_id: z.string().min(1, 'Pilih jenis cuti'),
    start_date: z.string().min(1, 'Tanggal mulai wajib'),
    end_date: z.string().min(1, 'Tanggal selesai wajib'),
    reason: z.string().optional(),
});

type LeaveForm = z.infer<typeof leaveSchema>;

const fetchLeave = async (id: number) => {
    const res = await api.get(`/leaves/${id}`);
    return res.data.data;
};

const fetchLeaveTypes = async () => {
    const res = await api.get('/leave-types');
    return res.data.data;
};

const updateLeave = async ({ id, data }: { id: number; data: any }) => {
    const res = await api.put(`/leaves/${id}`, data);
    return res.data.data;
};

export default function LeaveEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: leave, isLoading: loadingLeave } = useQuery({
        queryKey: ['leave', id],
        queryFn: () => fetchLeave(Number(id)),
        enabled: !!id,
    });

    const { data: leaveTypes } = useQuery({
        queryKey: ['leave-types'],
        queryFn: fetchLeaveTypes,
    });

    const { register, handleSubmit, setValue, reset, control, formState: { errors } } = useForm<LeaveForm>({
        resolver: zodResolver(leaveSchema),
    });
    const leaveTypeId = useWatch({ control, name: 'leave_type_id' }) || '';

    useEffect(() => {
        if (leave) {
            reset({
                leave_type_id: String(leave.leave_type_id),
                start_date: leave.start_date,
                end_date: leave.end_date,
                reason: leave.reason || '',
            });
        }
    }, [leave]);

    const mutation = useMutation({
        mutationFn: (data: LeaveForm) => updateLeave({ id: Number(id), data }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leaves'] });
            toast({ title: 'Berhasil', description: 'Cuti berhasil diperbarui.' });
            navigate('/cuti');
        },
        onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
    });

    if (loadingLeave) return <div className="p-6">Memuat data...</div>;
    if (!leave) return <div className="p-6 text-destructive">Data tidak ditemukan.</div>;

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold">Edit Pengajuan Cuti</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Form Edit Cuti</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                        <div>
                            <Label>Jenis Cuti</Label>
                            <Select onValueChange={(v) => setValue('leave_type_id', v)} value={leaveTypeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih jenis" />
                                </SelectTrigger>
                                <SelectContent>
                                    {leaveTypes?.map((type: any) => (
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
                            <Input {...register('reason')} placeholder="Alasan cuti" />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => navigate('/cuti')}>Batal</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}