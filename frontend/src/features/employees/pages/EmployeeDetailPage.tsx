import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  const { hasRole } = useAuthStore();
  const isHrd = hasRole('HRD');
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
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Detail Pegawai</h1>
        <div className="space-x-2">
          {isHrd && (
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
          <div><span className="font-medium">NIK</span><br />{employee.nik}</div>
          <div><span className="font-medium">Email</span><br />{employee.email}</div>
          <div><span className="font-medium">Nomor HP</span><br />{employee.nomor_hp || '-'}</div>
          <div><span className="font-medium">Jenis Kelamin</span><br />{employee.jenis_kelamin === 'L' ? 'Laki-laki' : employee.jenis_kelamin === 'P' ? 'Perempuan' : '-'}</div>
          <div><span className="font-medium">NIP</span><br />{employee.nip || '-'}</div>
          <div><span className="font-medium">NIDN</span><br />{employee.nidn || '-'}</div>
          <div><span className="font-medium">Jabatan</span><br />{employee.position || '-'}</div>
          <div><span className="font-medium">Unit</span><br />{employee.organizational_unit || '-'}</div>
          <div><span className="font-medium">Status Kepegawaian</span><br />{employee.status_kepegawaian || '-'}</div>
          <div><span className="font-medium">Jenis Pegawai</span><br />{employee.jenis_pegawai || '-'}</div>
          <div><span className="font-medium">Tanggal Masuk</span><br />{employee.tanggal_masuk_kerja || '-'}</div>
          <div><span className="font-medium">Masa Kerja</span><br />{getMasaKerja(employee.tanggal_masuk_kerja)}</div>
          <div><span className="font-medium">Alamat</span><br />{employee.alamat || '-'}</div>
        </CardContent>
      </Card>

      {isHrd && (
        <Card>
          <CardHeader>
            <CardTitle>Informasi Akun</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div><span className="font-medium">Username (NIK)</span><br />{employee.nik}</div>
            <div><span className="font-medium">Role</span><br />{employee.account?.role_name || employee.account?.role || 'Belum ada akun'}</div>
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