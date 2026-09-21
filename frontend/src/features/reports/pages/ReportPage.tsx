import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/services/api';
import { toast } from '@/components/ui/use-toast';

export default function ReportPage() {
const exportEmployees = async () => {
    try {
        const response = await api.get('/reports/employees/export', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `pegawai_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast({ title: 'Berhasil', description: 'Ekspor pegawai berhasil.' });
    } catch {
        toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' });
    }
};

const exportLeaves = async () => {
    try {
        const response = await api.get('/reports/leaves/export', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `cuti_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast({ title: 'Berhasil', description: 'Ekspor cuti berhasil.' });
    } catch {
        toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' });
    }
};

const downloadBlob = async (url: string, filename: string) => {
    try {
        const response = await api.get(url, { responseType: 'blob' });
        const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast({ title: 'Berhasil', description: filename + ' diunduh.' });
    } catch {
        toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' });
    }
};

    return (
        <div className="space-y-6 p-6">
            <h1 className="text-2xl font-bold">Laporan</h1>
            <p className="text-muted-foreground">Ekspor data dalam format CSV, Excel, atau PDF</p>
            <Card>
                <CardHeader>
                    <CardTitle>Ekspor Data Pegawai</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                    <Button onClick={exportEmployees}>CSV</Button>
                    <Button variant="outline" onClick={() => downloadBlob('/reports/employees/excel', `pegawai_${new Date().toISOString().slice(0,10)}.xls`)}>Excel</Button>
                    <Button variant="outline" onClick={() => downloadBlob('/reports/employees/pdf', `pegawai_${new Date().toISOString().slice(0,10)}.pdf`)}>PDF</Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Ekspor Data Cuti</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-2">
                    <Button onClick={exportLeaves}>CSV</Button>
                    <Button variant="outline" onClick={() => downloadBlob('/reports/leaves/excel', `cuti_${new Date().toISOString().slice(0,10)}.xls`)}>Excel</Button>
                    <Button variant="outline" onClick={() => downloadBlob('/reports/leaves/pdf', `cuti_${new Date().toISOString().slice(0,10)}.pdf`)}>PDF</Button>
                </CardContent>
            </Card>
        </div>
    );
}