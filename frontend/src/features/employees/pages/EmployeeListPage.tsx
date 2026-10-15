import { useState } from 'react';
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import type { Role } from '@/types';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, type EmployeePayload } from '../services/employeeService';
import { toast } from '@/components/ui/use-toast';
import { Eye, EyeOff, MoreVertical } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { groupPositions, HIDDEN_CODES, type Position } from '../utils/positionGroups';
import { extractErrorMessage } from '@/services/apiError';

export interface EmployeeFormState {
  nik: string; nama_lengkap: string; email: string; nomor_hp: string;
  jenis_kelamin: string; status_kepegawaian: string;
  tanggal_masuk_kerja: string; nip: string; nidn: string; alamat: string;
  password: string; role: string; position_id: string; supervisor_id: string; is_dosen: boolean;
}

const emptyForm: EmployeeFormState = {
  nik: '', nama_lengkap: '', email: '', nomor_hp: '',
  jenis_kelamin: '', status_kepegawaian: 'aktif',
  tanggal_masuk_kerja: '', nip: '', nidn: '', alamat: '',
  password: '', role: 'PEGAWAI', position_id: '', supervisor_id: '', is_dosen: false,
};

export default function EmployeeListPage() {
  const [search, setSearch] = useState('');
  const [tanpaAtasan, setTanpaAtasan] = useState(false);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(emptyForm);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountEmp, setAccountEmp] = useState<any>(null);
  const [accountForm, setAccountForm] = useState({ password: '', role: 'PEGAWAI' });
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ kind: 'account' | 'employee'; id: number; name: string } | null>(null);
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('employee.create');
  const canUpdate = hasPermission('employee.update');
  const canDelete = hasPermission('employee.delete');
  const canManageAccount = hasPermission('auth.user.update');

  const debouncedSearch = useDebounce(search);

  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', page, debouncedSearch, tanpaAtasan],
    queryFn: () => getEmployees({ page, search: debouncedSearch || undefined, tanpa_atasan: tanpaAtasan || undefined }),
    placeholderData: keepPreviousData,
  });

  const { data: roles } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => (await api.get('/roles')).data.data,
    enabled: canCreate || canManageAccount,
  });

  const { data: positions } = useQuery<Position[]>({
    queryKey: ['positions'],
    queryFn: async () => (await api.get('/positions')).data.data,
  });

  const { data: supervisorOptions } = useQuery<{ id: number; nama_lengkap: string; nik: string; position: string | null }[]>({
    queryKey: ['employees', 'supervisor-options'],
    queryFn: async () => (await getEmployees({ per_page: 100 })).data,
    enabled: canCreate || canUpdate,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: EmployeeFormState) => {
      const nik = payload.nik.trim();
      if (!/^[0-9]{9}$/.test(nik)) throw new Error('Nomor Induk Kepegawaian harus 9 digit angka.');
      const data: EmployeePayload = {
        nik,
        nama_lengkap: payload.nama_lengkap,
        email: payload.email,
        nomor_hp: payload.nomor_hp,
        jenis_kelamin: payload.jenis_kelamin === 'L' || payload.jenis_kelamin === 'P' ? payload.jenis_kelamin : null,
        status_kepegawaian: payload.status_kepegawaian,
        tanggal_masuk_kerja: payload.tanggal_masuk_kerja,
        nip: payload.nip,
        nidn: payload.nidn,
        alamat: payload.alamat,
        is_dosen: payload.is_dosen,
        position_id: payload.position_id ? Number(payload.position_id) : null,
        supervisor_id: payload.supervisor_id ? Number(payload.supervisor_id) : null,
        role: payload.role,
        password: payload.password,
      };
      return editId ? updateEmployee(editId, data) : createEmployee(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Berhasil', description: editId ? 'Data pegawai diperbarui.' : 'Pegawai dan akun berhasil ditambahkan.' });
      closeDialog();
    },
    onError: (e: unknown) => toast({ title: 'Gagal', description: extractErrorMessage(e, 'Terjadi kesalahan.'), variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Berhasil', description: 'Data pegawai dan akun dihapus permanen.' });
    },
    onError: (e: unknown) => toast({ title: 'Gagal', description: extractErrorMessage(e, 'Terjadi kesalahan.'), variant: 'destructive' }),
  });

  const accountMutation = useMutation({
    mutationFn: (payload: any) => api.put(`/employees/${accountEmp.id}/account`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Berhasil', description: 'Akun diperbarui.' });
      setAccountOpen(false);
      setAccountEmp(null);
    },
    onError: (e: unknown) => toast({ title: 'Gagal', description: extractErrorMessage(e, 'Terjadi kesalahan.'), variant: 'destructive' }),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/employees/${id}/account`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Berhasil', description: 'Akun dihapus permanen. Data pegawai tetap ada.' });
    },
    onError: (e: unknown) => toast({ title: 'Gagal', description: extractErrorMessage(e, 'Terjadi kesalahan.'), variant: 'destructive' }),
  });

  const openCreate = () => { setEditId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (emp: any) => {
    setEditId(emp.id);
    setForm({
      nik: emp.nik || '', nama_lengkap: emp.nama_lengkap || '', email: emp.email || '',
      nomor_hp: emp.nomor_hp || '', jenis_kelamin: emp.jenis_kelamin || '',
      status_kepegawaian: emp.status_kepegawaian || '',
      tanggal_masuk_kerja: emp.tanggal_masuk_kerja || '', nip: emp.nip || '',
      nidn: emp.nidn || '', alamat: emp.alamat || '',
      password: '', role: emp.account?.role || 'PEGAWAI', position_id: emp.position_id ? String(emp.position_id) : '',
      supervisor_id: emp.supervisor_id ? String(emp.supervisor_id) : '',
      is_dosen: !!emp.is_dosen,
    });
    setOpen(true);
  };
  const closeDialog = () => { setOpen(false); setEditId(null); setForm(emptyForm); };

  // Bila jabatan terpilih termasuk yang disembunyikan (DIREKTUR/KABAG), tetap
  // tampilkan sebagai opsi agar nilai lama tidak hilang / berubah diam-diam.
  const selectedPosition = positions?.find((p) => String(p.id) === form.position_id);
  const extraPositionOption = selectedPosition && selectedPosition.code && HIDDEN_CODES.includes(selectedPosition.code)
    ? selectedPosition
    : null;
  const set = <K extends keyof EmployeeFormState>(k: K, v: EmployeeFormState[K]) => setForm(f => ({ ...f, [k]: v }));

  const openAccount = (emp: any) => {
    setAccountEmp(emp);
    setAccountForm({ password: '', role: emp.account?.role || 'PEGAWAI' });
    setAccountOpen(true);
  };

  // Dipakai di tabel (desktop) dan kartu (mobile) agar tidak diduplikasi.
  const renderManageMenu = (emp: any) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* h-9 w-9 menyamakan tinggi dengan tombol Detail (size="sm") di sebelahnya. */}
        <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Kelola pegawai">
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canUpdate && (
          <DropdownMenuItem onClick={() => openEdit(emp)}>Edit Data</DropdownMenuItem>
        )}
        {canManageAccount && emp.has_account && (
          <DropdownMenuItem onClick={() => openAccount(emp)}>Kelola Akun</DropdownMenuItem>
        )}
        {canManageAccount && emp.has_account && (
          <DropdownMenuItem onClick={() => setConfirmAction({ kind: 'account', id: emp.id, name: emp.nama_lengkap })}>
            Hapus Akun
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setConfirmAction({ kind: 'employee', id: emp.id, name: emp.nama_lengkap })}
          >
            Hapus Pegawai
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (error) return <div className="p-6 text-destructive">Gagal memuat data.</div>;

  const employees = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Data Pegawai</h1>
          <p className="text-muted-foreground">Kelola data pegawai, dosen, dan akun login</p>
        </div>
        {(canCreate || canUpdate) && (
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
          <div>
            {canCreate && (
              <Button onClick={openCreate}>+ Tambah Pegawai</Button>
            )}
          </div>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit' : 'Tambah'} Pegawai</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nomor Induk Kepegawaian *</Label>
                  <Input
                    value={form.nik}
                    onChange={(e) => set('nik', e.target.value.replace(/\D/g, '').slice(0, 9))}
                    inputMode="numeric"
                    pattern="[0-9]{9}"
                    maxLength={9}
                    title="Nomor Induk Kepegawaian harus 9 digit angka"
                    placeholder="mis. 447199054"
                    required
                  />
                  {form.nik.length > 0 && form.nik.length !== 9 && (
                    <p className="text-xs text-destructive">Nomor Induk Kepegawaian harus tepat 9 digit ({form.nik.length}/9).</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Nama Lengkap *</Label>
                  <Input value={form.nama_lengkap} onChange={(e) => set('nama_lengkap', e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nomor HP</Label>
                  <Input value={form.nomor_hp} onChange={(e) => set('nomor_hp', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Jenis Kelamin</Label>
                  <Select value={form.jenis_kelamin || ''} onValueChange={(v) => set('jenis_kelamin', v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Laki-laki</SelectItem>
                      <SelectItem value="P">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>NIP (9 digit)</Label>
                  <Input value={form.nip} onChange={(e) => set('nip', e.target.value)} maxLength={9} />
                </div>
                <div className="space-y-2">
                  <Label>NIDN (10 digit)</Label>
                  <Input value={form.nidn} onChange={(e) => set('nidn', e.target.value)} maxLength={10} />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Masuk *</Label>
                  <Input type="date" value={form.tanggal_masuk_kerja} onChange={(e) => set('tanggal_masuk_kerja', e.target.value)} required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status Kepegawaian</Label>
                  <Select value={form.status_kepegawaian || 'aktif'} onValueChange={(v) => set('status_kepegawaian', v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aktif">Aktif</SelectItem>
                      <SelectItem value="nonaktif">Tidak Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jabatan</Label>
                  <Select value={form.position_id || undefined} onValueChange={(v) => set('position_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih jabatan" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {extraPositionOption && (
                        <SelectItem key={`extra-${extraPositionOption.id}`} value={String(extraPositionOption.id)}>
                          {extraPositionOption.name} (jabatan lama)
                        </SelectItem>
                      )}
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
                </div>
              </div>
              <div className="space-y-2">
                <Label>Atasan Langsung</Label>
                <Select value={form.supervisor_id || 'none'} onValueChange={(v) => set('supervisor_id', v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih atasan langsung" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="none">— Tanpa atasan langsung —</SelectItem>
                    {supervisorOptions
                      ?.filter((e: any) => String(e.id) !== String(editId))
                      .map((e: any) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.nama_lengkap}{e.position ? ` — ${e.position}` : ''} ({e.nik})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Penyetuju pertama cuti/izin. Kosongkan bila belum dipetakan (memakai alur lama).</p>
              </div>
              <div className="space-y-2">
                <Label>Alamat</Label>
                <Input value={form.alamat} onChange={(e) => set('alamat', e.target.value)} />
              </div>
              <Label className="flex items-center gap-2 cursor-pointer font-normal">
                <Checkbox checked={!!form.is_dosen} onCheckedChange={(v) => set('is_dosen', v === true)} />
                Dosen (masuk hitungan lingkungan akademik)
              </Label>
              {!editId && (
                <div className="space-y-4 border-t pt-4">
                  <p className="text-sm font-medium">Akun Login (otomatis dibuat, login pakai Nomor Induk Kepegawaian + kata sandi)</p>
                  <div className="space-y-2">
                    <Label>Kata Sandi *</Label>
                    <div className="relative">
                      <Input
                        type={showFormPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={form.password}
                        onChange={(e) => set('password', e.target.value)}
                        placeholder="Minimal 8 karakter"
                        className="pr-10"
                        required={!editId}
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(v => !v)}
                        aria-label={showFormPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        {showFormPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Select value={form.role || 'PEGAWAI'} onValueChange={(v) => set('role', v)}>
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
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Menyimpan...' : editId ? 'Perbarui' : 'Simpan'}
                </Button>
                <Button type="button" variant="outline" onClick={closeDialog}>Batal</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Cari Pegawai</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Cari berdasarkan Nomor Induk Kepegawaian, nama, NIP, NIDN, atau email..."
            value={search}
            autoComplete="off"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-md"
          />
          <Label className="flex items-center gap-2 cursor-pointer font-normal">
            <Checkbox
              checked={tanpaAtasan}
              onCheckedChange={(v) => { setTanpaAtasan(v === true); setPage(1); }}
            />
            Hanya yang belum punya atasan langsung
          </Label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {/* Mobile: kartu per pegawai — tabel 8 kolom tak muat di layar sempit. */}
          <div className="divide-y md:hidden">
            {isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Memuat data pegawai...</p>
            ) : employees.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada data pegawai</p>
            ) : (
              employees.map((emp: any) => (
                <div key={emp.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium" title={emp.nama_lengkap}>{emp.nama_lengkap}</p>
                      <p className="font-mono text-xs text-muted-foreground">{emp.nik}</p>
                    </div>
                    {emp.has_account ? (
                      <span className="shrink-0 whitespace-nowrap rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">{emp.account?.role_name || emp.account?.role}</span>
                    ) : (
                      <span className="shrink-0 whitespace-nowrap rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">Belum ada akun</span>
                    )}
                  </div>
                  <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
                    <div className="col-span-3 min-w-0">
                      <dt className="text-muted-foreground">Email</dt>
                      <dd className="truncate" title={emp.email}>{emp.email}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Jabatan</dt>
                      <dd className="truncate" title={emp.position || ''}>{emp.position || '-'}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd className="truncate">{emp.status_kepegawaian || 'aktif'}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">Atasan</dt>
                      <dd className="truncate" title={emp.supervisor?.nama_lengkap ?? ''}>{emp.supervisor?.nama_lengkap || 'Belum dipetakan'}</dd>
                    </div>
                  </dl>
                  <div className="flex items-center gap-2">
                    <Link to={`/pegawai/${emp.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">Detail</Button>
                    </Link>
                    {(canUpdate || canDelete || canManageAccount) && renderManageMenu(emp)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">Nomor Induk Kepegawaian</th>
                  <th className="text-left py-3 px-4 font-medium">Nama</th>
                  <th className="text-left py-3 px-4 font-medium">Email</th>
                  <th className="text-left py-3 px-4 font-medium">Jabatan</th>
                  <th className="text-left py-3 px-4 font-medium">Atasan Langsung</th>
                  <th className="text-left py-3 px-4 font-medium">Akun</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-right py-3 px-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">Memuat data pegawai...</td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">Belum ada data pegawai</td>
                  </tr>
                ) : (
                  employees.map((emp: any) => (
                    <tr key={emp.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">{emp.nik}</td>
                      <td className="py-3 px-4 max-w-44 truncate font-medium" title={emp.nama_lengkap}>{emp.nama_lengkap}</td>
                      <td className="py-3 px-4 max-w-52 truncate" title={emp.email}>{emp.email}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{emp.position || '-'}</td>
                      <td className="py-3 px-4 max-w-44 truncate" title={emp.supervisor?.nama_lengkap ?? ''}>
                        {emp.supervisor?.nama_lengkap || (
                          <span className="inline-block whitespace-nowrap px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">Belum dipetakan</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {emp.has_account ? (
                          <span className="inline-block whitespace-nowrap px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">{emp.account?.role_name || emp.account?.role}</span>
                        ) : (
                          <span className="inline-block whitespace-nowrap px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Belum ada</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{emp.status_kepegawaian || 'aktif'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/pegawai/${emp.id}`}>
                            <Button variant="outline" size="sm">Detail</Button>
                          </Link>
                          {(canUpdate || canDelete || canManageAccount) && renderManageMenu(emp)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={accountOpen} onOpenChange={(v) => { if (!v) { setAccountOpen(false); setAccountEmp(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Kelola Akun — {accountEmp?.nama_lengkap}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={accountForm.role} onValueChange={(v) => setAccountForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih role" /></SelectTrigger>
                <SelectContent>
                  {roles?.map((r) => (
                    <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kata Sandi Baru (kosongkan bila tidak diubah)</Label>
              <div className="relative">
                <Input
                  type={showAccountPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={accountForm.password}
                  onChange={(e) => setAccountForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Minimal 8 karakter"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAccountPassword(v => !v)}
                  aria-label={showAccountPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {showAccountPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => accountMutation.mutate({
                  role: accountForm.role,
                  ...(accountForm.password ? { password: accountForm.password } : {}),
                })}
                disabled={accountMutation.isPending}
              >
                {accountMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
              <Button variant="outline" onClick={() => { setAccountOpen(false); setAccountEmp(null); }}>Batal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {meta && meta.last_page > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Menampilkan {meta.current_page} dari {meta.last_page} halaman
          </p>
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              Sebelumnya
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={page === meta.last_page}>
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(v) => { if (!v) setConfirmAction(null); }}
        title={confirmAction?.kind === 'account' ? 'Hapus Akun' : 'Hapus Pegawai'}
        description={
          confirmAction?.kind === 'account'
            ? `Hapus akun ${confirmAction?.name ?? ''}? Data pegawai tetap ada.`
            : `Hapus data ${confirmAction?.name ?? ''} beserta akunnya secara permanen?`
        }
        confirmLabel="Hapus"
        destructive
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.kind === 'account') deleteAccountMutation.mutate(confirmAction.id);
          else deleteMutation.mutate(confirmAction.id);
        }}
      />
    </div>
  );
}
