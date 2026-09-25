import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReadOnlyField } from '@/components/ui/read-only-field';
import { api } from '@/services/api';
import { getEmployee } from '../services/employeeService';
import { useAuthStore } from '@/stores/authStore';

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
};

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const { hasPermission } = useAuthStore();
  const canUpdate = hasPermission('employee.update');
  const canManageAccount = hasPermission('auth.user.update');
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Detail Pegawai</h1>
        <div className="flex flex-wrap gap-2">
          {canUpdate && (
            <Link to={`/pegawai/${id}/edit`}>
              <Button>Edit</Button>
            </Link>
          )}
          <Button variant="outline" onClick={() => employee && downloadBiodata('pdf', employee.id, employee.nik)}>Unduh PDF</Button>
          <Button variant="outline" onClick={() => employee && downloadBiodata('word', employee.id, employee.nik)}>Unduh Word</Button>
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
          <ReadOnlyField label="NIK" value={employee.nik} />
          <ReadOnlyField label="Email" value={employee.email} />
          <ReadOnlyField label="Nomor HP" value={employee.nomor_hp} />
          <ReadOnlyField label="Jenis Kelamin" value={employee.jenis_kelamin === 'L' ? 'Laki-laki' : employee.jenis_kelamin === 'P' ? 'Perempuan' : '-'} />
          <ReadOnlyField label="NIP" value={employee.nip} />
          <ReadOnlyField label="NIDN" value={employee.nidn} />
          <ReadOnlyField label="Jabatan" value={employee.position} />
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
          )}
        </CardContent>
      </Card>

      {canManageAccount && (
        <Card>
          <CardHeader>
            <CardTitle>Informasi Akun</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Username (NIK)" value={employee.nik} />
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}