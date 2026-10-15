import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReadOnlyField } from '@/components/ui/read-only-field';
import { api } from '@/services/api';
import { getEmployee } from '../services/employeeService';
import { useAuthStore } from '@/stores/authStore';
import { ArrowLeft } from 'lucide-react';

const getMasaKerja = (tanggalMasuk: string | null | undefined) => {
    if (!tanggalMasuk) return '-';
    const start = new Date(tanggalMasuk);
    const now = new Date();
    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();
    if (months < 0) { years--; months += 12; }
    if (years === 0) return months + ' bulan';
    return years + ' tahun ' + months + ' bulan';
};

const fetchBalances = async (employeeId: number) => {
  const res = await api.get(`/leave-balances/employee/${employeeId}`);
  return res.data.data;
};

const downloadBiodata = async (kind: 'pdf' | 'word', employeeId: number, nik: string) => {
  const url = kind === 'pdf' ? `/reports/biodata-pdf/${employeeId}` : `/reports/biodata-word/${employeeId}`;
  const res = await api.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', kind === 'pdf' ? `biodata_${nik}.pdf` : `biodata_${nik}.doc`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const canUpdate = hasPermission('employee.update');
  const canManageAccount = hasPermission('auth.user.update');
  const canExportBiodata = hasPermission('report.view');
  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => getEmployee(Number(id)),
  });

  const { data: balances } = useQuery({
    queryKey: ['balances', id],
    queryFn: () => fetchBalances(Number(id)),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-6">Memuat data...</div>;
  if (error || !employee) return <div className="p-6 text-destructive">Data tidak ditemukan.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 -ml-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Kembali"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Detail Pegawai</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {canUpdate && (
            <Link to={`/pegawai/${id}/edit`}>
              <Button>Edit</Button>
            </Link>
          )}
          {canExportBiodata && (
            <>
              <Button variant="outline" onClick={() => employee && downloadBiodata('pdf', employee.id, employee.nik)}>Unduh PDF</Button>
              <Button variant="outline" onClick={() => employee && downloadBiodata('word', employee.id, employee.nik)}>Unduh Word</Button>
            </>
          )}
          <Link to="/pegawai">
            <Button variant="outline">Kembali</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{employee.nama_lengkap}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Nomor Induk Kepegawaian" value={employee.nik} />
          <ReadOnlyField label="Email" value={employee.email} />
          <ReadOnlyField label="Nomor HP" value={employee.nomor_hp} />
          <ReadOnlyField label="Jenis Kelamin" value={employee.jenis_kelamin === 'L' ? 'Laki-laki' : employee.jenis_kelamin === 'P' ? 'Perempuan' : '-'} />
          <ReadOnlyField label="NIP" value={employee.nip} />
          <ReadOnlyField label="NIDN" value={employee.nidn} />
          <ReadOnlyField label="Jabatan" value={employee.position} />
          <ReadOnlyField label="Atasan Langsung" value={employee.supervisor ? `${employee.supervisor.nama_lengkap} (${employee.supervisor.nik})` : null} />
          <ReadOnlyField label="Unit" value={employee.organizational_unit} />
          <ReadOnlyField label="Status Kepegawaian" value={employee.status_kepegawaian} />
          <ReadOnlyField label="Tanggal Masuk" value={employee.tanggal_masuk_kerja} />
          <ReadOnlyField label="Masa Kerja" value={getMasaKerja(employee.tanggal_masuk_kerja)} />
          <ReadOnlyField label="Alamat" value={employee.alamat} className="sm:col-span-2" />
          <ReadOnlyField label="NPWP" value={employee.npwp} />
          <ReadOnlyField label="BPJS Kesehatan" value={employee.bpjs_kesehatan} />
          <ReadOnlyField label="BPJS Ketenagakerjaan" value={employee.bpjs_ketenagakerjaan} />
          <ReadOnlyField label="Nomor Rekening" value={employee.nomor_rekening} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pendidikan</CardTitle>
        </CardHeader>
        <CardContent>
          {!employee.educations?.length ? (
            <p className="text-muted-foreground">Belum ada riwayat pendidikan.</p>
          ) : (
            <>
              {/* Mobile: kartu per riwayat — tabel 4 kolom tak muat di layar sempit. */}
              <div className="divide-y md:hidden">
                {employee.educations.map((e: any, i: number) => (
                  <div key={i} className="space-y-2 py-3 first:pt-0 last:pb-0">
                    <p className="font-medium">{e.jenjang}</p>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <div className="col-span-2 min-w-0"><dt className="text-muted-foreground">Institusi</dt><dd className="truncate" title={e.nama_pt || ''}>{e.nama_pt || '-'}</dd></div>
                      <div className="min-w-0"><dt className="text-muted-foreground">Jurusan</dt><dd className="truncate" title={e.jurusan || ''}>{e.jurusan || '-'}</dd></div>
                      <div><dt className="text-muted-foreground">Tahun</dt><dd>{e.tahun_masuk && e.tahun_lulus ? `${e.tahun_masuk} - ${e.tahun_lulus}` : '-'}</dd></div>
                    </dl>
                  </div>
                ))}
              </div>
              <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jenjang</TableHead>
                    <TableHead>Institusi</TableHead>
                    <TableHead>Jurusan</TableHead>
                    <TableHead>Tahun</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.educations.map((e: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{e.jenjang}</TableCell>
                      <TableCell>{e.nama_pt || '-'}</TableCell>
                      <TableCell>{e.jurusan || '-'}</TableCell>
                      <TableCell>{e.tahun_masuk && e.tahun_lulus ? `${e.tahun_masuk} - ${e.tahun_lulus}` : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Jabatan</CardTitle>
        </CardHeader>
        <CardContent>
          {!employee.position_histories?.length ? (
            <p className="text-muted-foreground">Belum ada riwayat jabatan.</p>
          ) : (
            <>
              {/* Mobile: kartu per jabatan — tabel 4 kolom tak muat di layar sempit. */}
              <div className="divide-y md:hidden">
                {employee.position_histories.map((h: any) => (
                  <div key={h.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                    <p className="font-medium">{h.jabatan}</p>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <div className="min-w-0"><dt className="text-muted-foreground">Unit Kerja</dt><dd className="truncate" title={h.unit_kerja || ''}>{h.unit_kerja || '-'}</dd></div>
                      <div className="min-w-0"><dt className="text-muted-foreground">No. SK</dt><dd className="truncate" title={h.no_sk || ''}>{h.no_sk || '-'}</dd></div>
                      <div className="col-span-2"><dt className="text-muted-foreground">Periode</dt><dd>{h.start_date ? String(h.start_date).slice(0, 10) : '-'} s.d {h.end_date ? String(h.end_date).slice(0, 10) : 'sekarang'}</dd></div>
                    </dl>
                  </div>
                ))}
              </div>
              <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Unit Kerja</TableHead>
                    <TableHead>No. SK</TableHead>
                    <TableHead>Periode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.position_histories.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell>{h.jabatan}</TableCell>
                      <TableCell>{h.unit_kerja || '-'}</TableCell>
                      <TableCell>{h.no_sk || '-'}</TableCell>
                      <TableCell>{h.start_date ? String(h.start_date).slice(0, 10) : '-'} s.d {h.end_date ? String(h.end_date).slice(0, 10) : 'sekarang'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {canManageAccount && (
        <Card>
          <CardHeader>
            <CardTitle>Informasi Akun</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Username (Nomor Induk Kepegawaian)" value={employee.nik} />
            <ReadOnlyField label="Role" value={employee.account?.role_name || employee.account?.role || 'Belum ada akun'} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sisa Cuti {new Date().getFullYear()}</CardTitle>
        </CardHeader>
        <CardContent>
          {!balances || balances.length === 0 ? (
            <p className="text-muted-foreground">Belum ada data saldo cuti.</p>
          ) : (
            <>
              {/* Mobile: kartu per saldo — tabel 4 kolom tak muat di layar sempit. */}
              <div className="divide-y md:hidden">
                {balances.map((b: any) => (
                  <div key={b.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                    <p className="font-medium">{b.leave_type?.name || b.leave_type_id}</p>
                    <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-xs">
                      <div><dt className="text-muted-foreground">Hak</dt><dd>{b.entitled_days + b.adjustment_days}</dd></div>
                      <div><dt className="text-muted-foreground">Terpakai</dt><dd>{b.used_days}</dd></div>
                      <div><dt className="text-muted-foreground">Sisa</dt><dd className="font-bold">{b.remaining_days}</dd></div>
                    </dl>
                  </div>
                ))}
              </div>
              <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jenis Cuti</TableHead>
                    <TableHead>Hak</TableHead>
                    <TableHead>Terpakai</TableHead>
                    <TableHead>Sisa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((b: any) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.leave_type?.name || b.leave_type_id}</TableCell>
                      <TableCell>{b.entitled_days + b.adjustment_days}</TableCell>
                      <TableCell>{b.used_days}</TableCell>
                      <TableCell className="font-bold">{b.remaining_days}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}