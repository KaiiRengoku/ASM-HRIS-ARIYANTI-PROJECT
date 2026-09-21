import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Kata sandi saat ini wajib diisi'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
  password_confirmation: z.string().min(1, 'Konfirmasi wajib diisi'),
}).refine((d) => d.password === d.password_confirmation, {
  message: 'Konfirmasi tidak sama',
  path: ['password_confirmation'],
});

type PasswordForm = z.infer<typeof passwordSchema>;

export default function ChangePasswordPage() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  const mutation = useMutation({
    mutationFn: async (data: PasswordForm) => (await api.post('/profile/password', data)).data,
    onSuccess: () => {
      toast({ title: 'Berhasil', description: 'Kata sandi berhasil diubah.' });
      reset();
    },
    onError: (e: any) => toast({
      title: 'Gagal',
      description: e.response?.data?.message || e.response?.data?.errors?.current_password?.[0] || 'Terjadi kesalahan.',
      variant: 'destructive',
    }),
  });

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Ganti Kata Sandi</h1>
      <Card>
        <CardHeader>
          <CardTitle>Kata Sandi Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label>Kata Sandi Saat Ini</Label>
              <Input type="password" {...register('current_password')} />
              {errors.current_password && <p className="text-sm text-destructive">{errors.current_password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Kata Sandi Baru (min. 8 karakter)</Label>
              <Input type="password" {...register('password')} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Konfirmasi Kata Sandi Baru</Label>
              <Input type="password" {...register('password_confirmation')} />
              {errors.password_confirmation && <p className="text-sm text-destructive">{errors.password_confirmation.message}</p>}
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
