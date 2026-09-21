import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from '@/components/ui/use-toast';

const adjustSchema = z.object({
  employee_id: z.string().min(1, 'Pilih pegawai'),
  leave_type_id: z.string().min(1, 'Pilih jenis cuti'),
  amount: z.coerce.number().refine((v) => v !== 0, 'Jumlah tidak boleh 0'),
  reason: z.string().min(1, 'Alasan wajib diisi'),
});

type AdjustForm = z.infer<typeof adjustSchema>;

const fetchEmployees = async () => {
  const res = await api.get('/employees?per_page=100');
  return res.data.data;
};

const fetchLeaveTypes = async () => {
  const res = await api.get('/leave-types');
  return res.data.data;
};

const adjustBalance = async (data: any) => {
  const res = await api.post('/leave-balances/adjust', data);
  return res.data.data;
};

export default function LeaveBalanceAdjustPage() {
  const navigate = useNavigate();

  const { data: employees } = useQuery({ queryKey: ['employees-list'], queryFn: fetchEmployees });
  const { data: leaveTypes } = useQuery({ queryKey: ['leave-types'], queryFn: fetchLeaveTypes });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<AdjustForm>({
    resolver: zodResolver(adjustSchema),
  });

  const mutation = useMutation({
    mutationFn: adjustBalance,
    onSuccess: () => {
      toast({ title: 'Berhasil', description: 'Saldo cuti disesuaikan.' });
      navigate('/pegawai');
    },
    onError: () => toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' }),
  });

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Penyesuaian Saldo Cuti</h1>
      <Card>
        <CardHeader>
          <CardTitle>Form Penyesuaian</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
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
            <div>
              <Label>Jenis Cuti</Label>
              <Select onValueChange={(v) => setValue('leave_type_id', v)}>
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
            <div>
              <Label>Jumlah Hari (+/-)</Label>
              <Input type="number" step="0.5" {...register('amount')} placeholder="+2 atau -1" />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div>
              <Label>Alasan</Label>
              <Input {...register('reason')} placeholder="Alasan penyesuaian" />
              {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/pegawai')}>Batal</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}