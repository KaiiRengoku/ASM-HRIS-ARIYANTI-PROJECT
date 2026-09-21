import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEmployee, createEmployee, updateEmployee } from '../services/employeeService';
import { api } from '@/services/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

const employeeSchema = z.object({
  nik: z.string().length(16, 'NIK harus 16 digit').regex(/^[0-9]{16}$/, 'NIK harus 16 digit numerik'),
  nama_lengkap: z.string().min(1, 'Nama wajib diisi'),
  gelar_depan: z.string().max(50).optional(),
  gelar_belakang: z.string().max(50).optional(),
  tempat_lahir: z.string().max(100).optional(),
  agama: z.string().max(30).optional(),
  status_pernikahan: z.string().optional(),
  alamat_ktp: z.string().optional(),
  alamat_domisili: z.string().optional(),
  email: z.string().email('Format email tidak valid'),
  nomor_hp: z.string().optional(),
  jenis_kelamin: z.enum(['L', 'P']).optional(),
  status_kepegawaian: z.string().optional(),
  jenis_pegawai: z.string().optional(),
  tanggal_masuk_kerja: z.string().min(1, 'Tanggal masuk wajib diisi'),
  nip: z.string().regex(/^[0-9]{9}$/, 'NIP harus 9 digit numerik').optional().or(z.literal('')),
  nidn: z.string().regex(/^[0-9]{10}$/, 'NIDN harus 10 digit numerik').optional().or(z.literal('')),
  alamat: z.string().optional(),
  password: z.string().min(8, 'Password minimal 8 karakter').optional().or(z.literal('')),
  role: z.string().optional(),
  position_id: z.string().optional(),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

export default function EmployeeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => getEmployee(Number(id)),
    enabled: isEdit,
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { role: 'PEG', position_id: '' },
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get('/roles')).data.data,
  });

  const { data: positions } = useQuery({
    queryKey: ['positions'],
    queryFn: async () => (await api.get('/positions')).data.data,
  });

  useEffect(() => {
    if (existing) {
      reset({
        nik: existing.nik,
        nama_lengkap: existing.nama_lengkap,
        gelar_depan: existing.gelar_depan || '',
        gelar_belakang: existing.gelar_belakang || '',
        tempat_lahir: existing.tempat_lahir || '',
        agama: existing.agama || '',
        status_pernikahan: (existing.status_pernikahan as '' | undefined) || '',
        alamat_ktp: existing.alamat_ktp || '',
        alamat_domisili: existing.alamat_domisili || '',
        email: existing.email,
        nomor_hp: existing.nomor_hp || '',
        jenis_kelamin: existing.jenis_kelamin || undefined,
        status_kepegawaian: existing.status_kepegawaian || '',
        jenis_pegawai: existing.jenis_pegawai || '',
        tanggal_masuk_kerja: existing.tanggal_masuk_kerja || '',
        nip: existing.nip || '',
        nidn: existing.nidn || '',
        alamat: existing.alamat || '',
        password: '',
        role: (existing as any).account?.role || 'PEG',
        position_id: existing.position_id ? String(existing.position_id) : '',
      });
    }
  }, [existing]);

  const toPayload = (data: EmployeeForm) => {
    const { password, role, position_id, ...rest } = data as any;
    if (isEdit) return rest;
    return {
      ...rest,
      password,
      role: role || 'PEG',
      ...(position_id ? { position_id: Number(position_id) } : {}),
    };
  };
  const mutation = useMutation({
    mutationFn: (data: EmployeeForm) => isEdit ? updateEmployee(Number(id), toPayload(data)) : createEmployee(toPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Berhasil', description: isEdit ? 'Data pegawai diperbarui.' : 'Pegawai dan akun berhasil ditambahkan.' });
      navigate('/pegawai');
    },
    onError: (e: any) => toast({ title: 'Gagal', description: e.response?.data?.message || 'Terjadi kesalahan.', variant: 'destructive' }),
  });

  if (isEdit && loadingExisting) return <div className="p-6">Memuat data...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">{isEdit ? 'Edit' : 'Tambah'} Pegawai</h1>
      <Card>
        <CardHeader>
          <CardTitle>Informasi Pegawai</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nik">NIK <span className="text-destructive">*</span></Label>
                <Input id="nik" {...register('nik')} placeholder="1234567890123456" maxLength={16} />
                {errors.nik && <p className="text-sm text-destructive">{errors.nik.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nama_lengkap">Nama Lengkap <span className="text-destructive">*</span></Label>
                <Input id="nama_lengkap" {...register('nama_lengkap')} />
                {errors.nama_lengkap && <p className="text-sm text-destructive">{errors.nama_lengkap.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gelar_depan">Gelar Depan</Label>
                <Input id="gelar_depan" {...register('gelar_depan')} placeholder="Dr." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gelar_belakang">Gelar Belakang</Label>
                <Input id="gelar_belakang" {...register('gelar_belakang')} placeholder="M.Kom." />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="tempat_lahir">Tempat Lahir</Label>
                <Input id="tempat_lahir" {...register('tempat_lahir')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agama">Agama</Label>
                <Input id="agama" {...register('agama')} placeholder="Islam" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status_pernikahan">Status Pernikahan</Label>
                <select id="status_pernikahan" {...register('status_pernikahan')} className="w-full border border-border rounded px-3 py-2 bg-background">
                  <option value="">Pilih</option>
                  <option value="Kawin">Kawin</option>
                  <option value="Belum Kawin">Belum Kawin</option>
                  <option value="Cerai">Cerai</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="alamat_ktp">Alamat KTP</Label>
                <Input id="alamat_ktp" {...register('alamat_ktp')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alamat_domisili">Alamat Domisili</Label>
                <Input id="alamat_domisili" {...register('alamat_domisili')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nomor_hp">Nomor HP</Label>
                <Input id="nomor_hp" {...register('nomor_hp')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jenis_kelamin">Jenis Kelamin</Label>
                <select id="jenis_kelamin" {...register('jenis_kelamin')} className="w-full border border-border rounded px-3 py-2 bg-background">
                  <option value="">Pilih</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="nip">NIP (9 digit)</Label>
                <Input id="nip" {...register('nip')} placeholder="123456789" maxLength={9} />
                {errors.nip && <p className="text-sm text-destructive">{errors.nip.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nidn">NIDN (10 digit)</Label>
                <Input id="nidn" {...register('nidn')} placeholder="1234567890" maxLength={10} />
                {errors.nidn && <p className="text-sm text-destructive">{errors.nidn.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggal_masuk_kerja">Tanggal Masuk <span className="text-destructive">*</span></Label>
                <Input id="tanggal_masuk_kerja" type="date" {...register('tanggal_masuk_kerja')} />
                {errors.tanggal_masuk_kerja && <p className="text-sm text-destructive">{errors.tanggal_masuk_kerja.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status_kepegawaian">Status Kepegawaian</Label>
                <Input id="status_kepegawaian" {...register('status_kepegawaian')} placeholder="aktif" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jenis_pegawai">Jenis Pegawai</Label>
                <Input id="jenis_pegawai" {...register('jenis_pegawai')} placeholder="Dosen/Staf" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alamat">Alamat</Label>
              <Input id="alamat" {...register('alamat')} />
            </div>

            {!isEdit && (
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm font-medium">Akun Login (otomatis dibuat, login pakai NIK + kata sandi)</p>
                <div className="space-y-2">
                  <Label htmlFor="password">Kata Sandi <span className="text-destructive">*</span></Label>
                  <Input id="password" type="password" {...register('password')} placeholder="Minimal 8 karakter" />
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Role <span className="text-destructive">*</span></Label>
                    <Select onValueChange={(v) => setValue('role', v)} value={watch('role') || 'PEG'}>
                      <SelectTrigger><SelectValue placeholder="Pilih role" /></SelectTrigger>
                      <SelectContent>
                        {roles?.map((r: any) => (
                          <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Jabatan (opsional — kosongkan untuk ikut role)</Label>
                    <Select onValueChange={(v) => setValue('position_id', v === 'auto' ? '' : v)} value={watch('position_id') || 'auto'}>
                      <SelectTrigger><SelectValue placeholder="Ikuti role" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Ikuti role</SelectItem>
                        {positions?.map((p: any) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Menyimpan...' : isEdit ? 'Perbarui' : 'Simpan'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/pegawai')}>Batal</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}