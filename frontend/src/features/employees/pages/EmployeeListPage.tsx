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
import { ReadOnlyField } from '@/components/ui/read-only-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../services/employeeService';
import { toast } from '@/components/ui/use-toast';

const emptyForm = {
  nik: '', nama_lengkap: '', email: '', nomor_hp: '',
  jenis_kelamin: '', status_kepegawaian: 'aktif',
  tanggal_masuk_kerja: '', nip: '', nidn: '', alamat: '',
  password: '', role: 'PEG', position_id: '', is_dosen: false,
};

export default function EmployeeListPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, any>>(emptyForm);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountEmp, setAccountEmp] = useState<any>(null);
  const [accountForm, setAccountForm] = useState({ password: '', role: 'PEG', position_id: '' });
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();
  const canCreate = hasPermission('employee.create');
  const canUpdate = hasPermission('employee.update');
  const canDelete = hasPermission('employee.delete');
  const canManageAccount = hasPermission('auth.user.update');

  const debouncedSearch = useDebounce(search);

  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', page, debouncedSearch],
    queryFn: () => getEmployees({ page, search: debouncedSearch || undefined }),
    placeholderData: keepPreviousData,
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get('/roles')).data.data,
    enabled: canCreate || canManageAccount,
  });

  const { data: positions } = useQuery({
    queryKey: ['positions'],
    queryFn: async () => (await api.get('/positions')).data.data,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      if (!editId && !/^[0-9]{16}$/.test(payload.nik || '')) throw new Error('NIK harus 16 digit numerik.');
      return editId ? updateEmployee(editId, payload) : createEmployee(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Berhasil', description: editId ? 'Data pegawai diperbarui.' : 'Pegawai dan akun berhasil ditambahkan.' });
      closeDialog();
    },
    onError: (e: any) => toast({ title: 'Gagal', description: e.response?.data?.message || e.message || 'Terjadi kesalahan.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Berhasil', description: 'Data pegawai dan akun dihapus permanen.' });
    },
    onError: (e: any) => toast({ title: 'Gagal', description: e.response?.data?.message || 'Terjadi kesalahan.', variant: 'destructive' }),
  });

  const accountMutation = useMutation({
    mutationFn: (payload: any) => api.put(`/employees/${accountEmp.id}/account`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Berhasil', description: 'Akun diperbarui.' });
      setAccountOpen(false);
      setAccountEmp(null);
    },
    onError: (e: any) => toast({ title: 'Gagal', description: e.response?.data?.message || 'Terjadi kesalahan.', variant: 'destructive' }),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/employees/${id}/account`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Berhasil', description: 'Akun dihapus permanen. Data pegawai tetap ada.' });
    },
    onError: (e: any) => toast({ title: 'Gagal', description: e.response?.data?.message || 'Terjadi kesalahan.', variant: 'destructive' }),
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
      password: '', role: emp.account?.role || 'PEG', position_id: emp.position_id ? String(emp.position_id) : '',
      is_dosen: !!emp.is_dosen,
    });
    setOpen(true);
  };
  const closeDialog = () => { setOpen(false); setEditId(null); setForm(emptyForm); };
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const openAccount = (emp: any) => {
    setAccountEmp(emp);
    setAccountForm({ password: '', role: emp.account?.role || 'PEG', position_id: emp.position_id ? String(emp.position_id) : '' });
    setAccountOpen(true);
  };

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
                  <Label>NIK *</Label>
                  <Input value={form.nik} onChange={(e) => set('nik', e.target.value)} maxLength={16} required />
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
                  <Input value={form.status_kepegawaian} onChange={(e) => set('status_kepegawaian', e.target.value)} />
                </div>
                {editId && (
                <ReadOnlyField label="Jabatan" value={employees.find((e: any) => e.id === editId)?.position} />
                )}
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
                  <p className="text-sm font-medium">Akun Login (otomatis dibuat, login pakai NIK + kata sandi)</p>
                  <div className="space-y-2">
                    <Label>Kata Sandi *</Label>
                    <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Minimal 8 karakter" required={!editId} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Role *</Label>
                      <Select value={form.role || 'PEG'} onValueChange={(v) => set('role', v)}>
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
                      <Select value={form.position_id || 'auto'} onValueChange={(v) => set('position_id', v === 'auto' ? '' : v)}>
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
        <CardContent>
          <Input
            placeholder="Cari berdasarkan NIK, nama, NIP, NIDN, atau email..."
            value={search}
            autoComplete="off"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium">NIK</th>
                  <th className="text-left py-3 px-4 font-medium">Nama</th>
                  <th className="text-left py-3 px-4 font-medium">Email</th>
                  <th className="text-left py-3 px-4 font-medium">Jabatan</th>
                  <th className="text-left py-3 px-4 font-medium">Akun</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-right py-3 px-4 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">Memuat data pegawai...</td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">Belum ada data pegawai</td>
                  </tr>
                ) : (
                  employees.map((emp: any) => (
                    <tr key={emp.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono text-xs whitespace-nowrap">{emp.nik}</td>
                      <td className="py-3 px-4 max-w-44 truncate font-medium" title={emp.nama_lengkap}>{emp.nama_lengkap}</td>
                      <td className="py-3 px-4 max-w-52 truncate" title={emp.email}>{emp.email}</td>
                      <td className="py-3 px-4 whitespace-nowrap">{emp.position || '-'}</td>
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
                          {(canUpdate || canDelete || canManageAccount) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">Kelola</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canUpdate && (
                                    <DropdownMenuItem onClick={() => openEdit(emp)}>Edit Data</DropdownMenuItem>
                                  )}
                                  {canManageAccount && emp.has_account && (
                                    <DropdownMenuItem onClick={() => openAccount(emp)}>Kelola Akun</DropdownMenuItem>
                                  )}
                                  {canDelete && emp.has_account && (
                                    <DropdownMenuItem onClick={() => { if (confirm(`Hapus akun ${emp.nama_lengkap}? Data pegawai tetap ada.`)) deleteAccountMutation.mutate(emp.id); }}>
                                      Hapus Akun
                                    </DropdownMenuItem>
                                  )}
                                  {canDelete && (
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => { if (confirm(`Hapus data ${emp.nama_lengkap} beserta akunnya secara permanen?`)) deleteMutation.mutate(emp.id); }}
                                    >
                                      Hapus Pegawai
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                          )}
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
                  {roles?.map((r: any) => (
                    <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kata Sandi Baru (kosongkan bila tidak diubah)</Label>
              <Input type="password" autoComplete="new-password" value={accountForm.password} onChange={(e) => setAccountForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimal 8 karakter" />
            </div>
            <div className="space-y-2">
              <Label>Jabatan (opsional — kosongkan untuk ikut role)</Label>
              <Select value={accountForm.position_id || 'auto'} onValueChange={(v) => setAccountForm(f => ({ ...f, position_id: v === 'auto' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Ikuti role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Ikuti role</SelectItem>
                  {positions?.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => accountMutation.mutate({
                  role: accountForm.role,
                  ...(accountForm.password ? { password: accountForm.password } : {}),
                  ...(accountForm.position_id ? { position_id: Number(accountForm.position_id) } : {}),
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
    </div>
  );
}
