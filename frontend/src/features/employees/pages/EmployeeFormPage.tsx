import { useEffect } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEmployee, createEmployee, updateEmployee, type EmployeePayload } from '../services/employeeService';
import { api } from '@/services/api';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { groupPositions, HIDDEN_CODES, type Position } from '../utils/positionGroups';
import type { Role } from '@/types';

const employeeSchema = z.object({
  nik: z.string().regex(/^[0-9]{9}$/, 'Nomor Induk Kepegawaian harus 9 digit angka'),
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
  // Opsi "Pilih" pada select mengirim string kosong, bukan undefined.
  jenis_kelamin: z.enum(['L', 'P']).optional().or(z.literal('')),
  status_kepegawaian: z.string().optional(),
  tanggal_masuk_kerja: z.string().min(1, 'Tanggal masuk wajib diisi'),
  nip: z.string().regex(/^[0-9]{9}$/, 'NIP harus 9 digit numerik').optional().or(z.literal('')),
  nidn: z.string().regex(/^[0-9]{10}$/, 'NIDN harus 10 digit numerik').optional().or(z.literal('')),
  alamat: z.string().optional(),
  password: z.string().min(8, 'Password minimal 8 karakter').optional().or(z.literal('')),
  role: z.string().optional(),
  position_id: z.string().optional(),
  supervisor_id: z.string().optional(),
  is_dosen: z.boolean().optional(),
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
    defaultValues: { role: 'PEGAWAI', position_id: '', supervisor_id: '', is_dosen: false },
  });

  const { data: roles } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => (await api.get('/roles')).data.data,
  });

  const { data: positions } = useQuery<Position[]>({
    queryKey: ['positions'],
    queryFn: async () => (await api.get('/positions')).data.data,
  });

  const { data: supervisorOptions } = useQuery<{ id: number; nama_lengkap: string; nik: string }[]>({
    queryKey: ['employees', 'supervisor-options'],
    queryFn: async () => (await api.get('/employees', { params: { per_page: 100 } })).data.data,
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
        tanggal_masuk_kerja: existing.tanggal_masuk_kerja || '',
        nip: existing.nip || '',
        nidn: existing.nidn || '',
        alamat: existing.alamat || '',
        password: '',
        role: existing.account?.role || 'PEGAWAI',
        position_id: existing.position_id ? String(existing.position_id) : '',
        supervisor_id: existing.supervisor_id ? String(existing.supervisor_id) : '',
        is_dosen: !!existing.is_dosen,
      });
    }
  }, [existing]);

  const toPayload = (data: EmployeeForm): EmployeePayload => {
    const { password, role, position_id, supervisor_id, jenis_kelamin, ...rest } = data;
    // Select "Pilih" mengirim '' — payload hanya menerima null.
    const base = { ...rest, jenis_kelamin: jenis_kelamin || null };
    const positionId = position_id ? Number(position_id) : null;
    const supervisorId = supervisor_id ? Number(supervisor_id) : null;
    if (isEdit) return { ...base, position_id: positionId, supervisor_id: supervisorId };
    return {
      ...base,
      password,
      role: role || 'PEGAWAI',
      position_id: positionId,
      supervisor_id: supervisorId,
    };
  };
  const mutation = useMutation({
    mutationFn: (data: EmployeeForm) => isEdit ? updateEmployee(Number(id), toPayload(data)) : createEmployee(toPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Berhasil', description: isEdit ? 'Data pegawai diperbarui.' : 'Pegawai dan akun berhasil ditambahkan.' });
      navigate('/pegawai');
    },
    onError: (e: unknown) => {
      const message = axios.isAxiosError(e) ? (e.response?.data as { message?: string } | undefined)?.message : undefined;
      toast({ title: 'Gagal', description: message || 'Terjadi kesalahan.', variant: 'destructive' });
    },
  });
  const renderPositionSelect = () => (
    <Select onValueChange={(v) => setValue('position_id', v)} value={watch('position_id') || undefined}>
      <SelectTrigger><SelectValue placeholder="Pilih jabatan" /></SelectTrigger>
      <SelectContent className="max-h-72">
        {(() => {
          // Bila jabatan terpilih termasuk yang disembunyikan (DIREKTUR/KABAG),
          // tetap tampilkan sebagai opsi agar nilai lama tidak hilang.
          const selected = positions?.find((p) => String(p.id) === watch('position_id'));
          return selected?.code && HIDDEN_CODES.includes(selected.code) ? (
            <SelectItem value={String(selected.id)}>{selected.name} (jabatan lama)</SelectItem>
          ) : null;
        })()}
        {groupPositions(positions).map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.items.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );

  const renderSupervisorSelect = () => (
    <Select
      onValueChange={(v) => setValue('supervisor_id', v === 'none' ? '' : v)}
      value={watch('supervisor_id') || 'none'}
    >
      <SelectTrigger><SelectValue placeholder="Pilih atasan langsung" /></SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value="none">— Tanpa atasan langsung —</SelectItem>
        {supervisorOptions
          ?.filter((e) => String(e.id) !== String(id))
          .map((e) => (
            <SelectItem key={e.id} value={String(e.id)}>{e.nama_lengkap} ({e.nik})</SelectItem>
          ))}
      </SelectContent>
    </Select>
  );

  if (isEdit && loadingExisting) return <div className="p-6">Memuat data...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{isEdit ? 'Edit' : 'Tambah'} Pegawai</h1>
      <Card>
        <CardHeader>
          <CardTitle>Informasi Pegawai</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nik">Nomor Induk Kepegawaian <span className="text-destructive">*</span></Label>
                <Input id="nik" {...register('nik')} placeholder="mis. 447199054" maxLength={9} />
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
                {errors.jenis_kelamin && <p className="text-sm text-destructive">{errors.jenis_kelamin.message}</p>}
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
                <Label>Jabatan</Label>
                {renderPositionSelect()}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Atasan Langsung</Label>
              {renderSupervisorSelect()}
              <p className="text-xs text-muted-foreground">Penyetuju pertama cuti/izin. Kosongkan bila belum dipetakan (memakai alur lama).</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alamat">Alamat</Label>
              <Input id="alamat" {...register('alamat')} />
            </div>

            <Label className="flex items-center gap-2 cursor-pointer font-normal">
              <Checkbox checked={!!watch('is_dosen')} onCheckedChange={(v) => setValue('is_dosen', v === true)} />
              Dosen (masuk hitungan lingkungan akademik)
            </Label>

            {!isEdit && (
              <div className="space-y-4 border-t pt-4">
                <p className="text-sm font-medium">Akun Login (otomatis dibuat, login pakai Nomor Induk Kepegawaian + kata sandi)</p>
                <div className="space-y-2">
                  <Label htmlFor="password">Kata Sandi <span className="text-destructive">*</span></Label>
                  <Input id="password" type="password" {...register('password')} placeholder="Minimal 8 karakter" />
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Role <span className="text-destructive">*</span></Label>
                  <Select onValueChange={(v) => setValue('role', v)} value={watch('role') || 'PEGAWAI'}>
                    <SelectTrigger><SelectValue placeholder="Pilih role" /></SelectTrigger>
                    <SelectContent>
                      {roles?.map((r) => (
                        <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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