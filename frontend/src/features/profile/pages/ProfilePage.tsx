import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

interface Employee {
    id: number;
    nik?: string | null;
    nama_lengkap?: string | null;
    nip?: string | null;
    nidn?: string | null;
    tempat_lahir?: string | null;
    tanggal_lahir?: string | null;
    jenis_kelamin?: string | null;
    agama?: string | null;
    status_pernikahan?: string | null;
    alamat_ktp?: string | null;
    alamat_domisili?: string | null;
    nomor_hp?: string | null;
    jenis_pegawai?: string | null;
}

interface ProfileData {
    nik: string;
    name: string;
    email: string;
    roles?: { name: string; code?: string }[];
    is_dosen?: boolean;
    is_pegawai?: boolean;
    employee?: Employee | null;
}

interface EducationRow {
    nama_pt?: string | null;
    jurusan?: string | null;
    tahun_masuk?: number | null;
    tahun_lulus?: number | null;
}

interface EducationData {
    S1?: EducationRow | null;
    S2?: EducationRow | null;
    S3?: EducationRow | null;
}

interface FunctionalData {
    status_kepegawaian_detail?: string | null;
    jabatan_fungsional?: string | null;
    pangkat?: string | null;
    golongan_ruang?: string | null;
    tmt_pangkat?: string | null;
    bidang_keahlian?: string | null;
    unit_kerja?: string | null;
    sertifikasi?: string | null;
    riwayat_penelitian_pengabdian?: string | null;
    pernyataan_disetujui_pada?: string | null;
}

interface TeachingAssignment {
    id: number;
    kode_matkul?: string | null;
    nama_matkul?: string | null;
    sks?: number | null;
    semester?: string | null;
    program_studi?: string | null;
    kelas?: string | null;
}

const kontakSchema = z.object({
    alamat_ktp: z.string().optional(),
    alamat_domisili: z.string().optional(),
    nomor_hp: z.string().optional(),
});

type KontakForm = z.infer<typeof kontakSchema>;

const jenjangSchema = z.object({
    nama_pt: z.string().optional(),
    jurusan: z.string().optional(),
    tahun_masuk: z.string().optional(),
    tahun_lulus: z.string().optional(),
});

const pendidikanSchema = z.object({
    S1: jenjangSchema,
    S2: jenjangSchema,
    S3: jenjangSchema,
});

type PendidikanForm = z.infer<typeof pendidikanSchema>;

const fungsionalSchema = z.object({
    status_kepegawaian_detail: z.string().optional(),
    jabatan_fungsional: z.string().optional(),
    pangkat: z.string().optional(),
    golongan_ruang: z.string().optional(),
    tmt_pangkat: z.string().optional(),
    bidang_keahlian: z.string().optional(),
    unit_kerja: z.string().optional(),
    sertifikasi: z.string().optional(),
});

type FungsionalForm = z.infer<typeof fungsionalSchema>;

const penelitianSchema = z.object({
    riwayat_penelitian_pengabdian: z.string().optional(),
    pernyataan: z.boolean().optional(),
});

type PenelitianForm = z.infer<typeof penelitianSchema>;

function Row({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium">{value ?? '-'}</p>
        </div>
    );
}

const toYear = (v?: string) => (v && v.trim() !== '' ? Number(v) : null);
const toStr = (v?: string | number | null) => (v === null || v === undefined ? '' : String(v));

export default function ProfilePage() {
    const queryClient = useQueryClient();
    const [editing, setEditing] = useState(false);

    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile'],
        queryFn: async () => {
            const res = await api.get('/profile');
            return res.data.data as ProfileData;
        },
    });

    const { data: education } = useQuery({
        queryKey: ['profile-education'],
        queryFn: async () => {
            const res = await api.get('/profile/education');
            return res.data.data as EducationData;
        },
    });

    const { data: functional } = useQuery({
        queryKey: ['profile-functional'],
        queryFn: async () => {
            const res = await api.get('/profile/functional');
            return res.data.data as FunctionalData | null;
        },
    });

    const employee = profile?.employee ?? null;
    const isDosen = profile?.is_dosen ?? employee?.jenis_pegawai === 'Dosen';
    const isPegawai = profile?.is_pegawai ?? (isDosen || (profile?.roles ?? []).some((r) => (r.code ?? r.name) === 'PEG'));

    const { data: assignments } = useQuery({
        queryKey: ['profile-teaching-assignments'],
        queryFn: async () => {
            const res = await api.get('/profile/teaching-assignments');
            return res.data.data as TeachingAssignment[];
        },
        enabled: isPegawai,
    });

    const kontakForm = useForm<KontakForm>({ resolver: zodResolver(kontakSchema) });
    const pendidikanForm = useForm<PendidikanForm>({ resolver: zodResolver(pendidikanSchema) });
    const fungsionalForm = useForm<FungsionalForm>({ resolver: zodResolver(fungsionalSchema) });
    const penelitianForm = useForm<PenelitianForm>({ resolver: zodResolver(penelitianSchema) });

    useEffect(() => {
        if (employee) {
            kontakForm.reset({
                alamat_ktp: employee.alamat_ktp ?? '',
                alamat_domisili: employee.alamat_domisili ?? '',
                nomor_hp: employee.nomor_hp ?? '',
            });
        }
    }, [employee, kontakForm]);

    useEffect(() => {
        if (education) {
            pendidikanForm.reset({
                S1: { nama_pt: education.S1?.nama_pt ?? '', jurusan: education.S1?.jurusan ?? '', tahun_masuk: toStr(education.S1?.tahun_masuk), tahun_lulus: toStr(education.S1?.tahun_lulus) },
                S2: { nama_pt: education.S2?.nama_pt ?? '', jurusan: education.S2?.jurusan ?? '', tahun_masuk: toStr(education.S2?.tahun_masuk), tahun_lulus: toStr(education.S2?.tahun_lulus) },
                S3: { nama_pt: education.S3?.nama_pt ?? '', jurusan: education.S3?.jurusan ?? '', tahun_masuk: toStr(education.S3?.tahun_masuk), tahun_lulus: toStr(education.S3?.tahun_lulus) },
            });
        }
    }, [education, pendidikanForm]);

    useEffect(() => {
        fungsionalForm.reset({
            status_kepegawaian_detail: functional?.status_kepegawaian_detail ?? '',
            jabatan_fungsional: functional?.jabatan_fungsional ?? '',
            pangkat: functional?.pangkat ?? '',
            golongan_ruang: functional?.golongan_ruang ?? '',
            tmt_pangkat: functional?.tmt_pangkat ? String(functional.tmt_pangkat).slice(0, 10) : '',
            bidang_keahlian: functional?.bidang_keahlian ?? '',
            unit_kerja: functional?.unit_kerja ?? '',
            sertifikasi: functional?.sertifikasi ?? '',
        });
    }, [functional, fungsionalForm]);

    useEffect(() => {
        penelitianForm.reset({
            riwayat_penelitian_pengabdian: functional?.riwayat_penelitian_pengabdian ?? '',
            pernyataan: false,
        });
    }, [functional, penelitianForm]);

    const exitEdit = () => setEditing(false);

    const onKontak = async (data: KontakForm) => {
        try {
            await api.put('/profile', data);
            toast({ title: 'Berhasil', description: 'Data kontak diperbarui.' });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            exitEdit();
        } catch {
            toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' });
        }
    };

    const onPendidikan = async (data: PendidikanForm) => {
        try {
            await api.put('/profile/education', {
                pendidikan: (['S1', 'S2', 'S3'] as const).map((j) => ({
                    jenjang: j,
                    nama_pt: data[j].nama_pt || null,
                    jurusan: data[j].jurusan || null,
                    tahun_masuk: toYear(data[j].tahun_masuk),
                    tahun_lulus: toYear(data[j].tahun_lulus),
                })),
            });
            toast({ title: 'Berhasil', description: 'Data pendidikan diperbarui.' });
            queryClient.invalidateQueries({ queryKey: ['profile-education'] });
            exitEdit();
        } catch {
            toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' });
        }
    };

    const onFungsional = async (data: FungsionalForm) => {
        try {
            await api.put('/profile/functional', {
                status_kepegawaian_detail: data.status_kepegawaian_detail || null,
                jabatan_fungsional: data.jabatan_fungsional || null,
                pangkat: data.pangkat || null,
                golongan_ruang: data.golongan_ruang || null,
                tmt_pangkat: data.tmt_pangkat || null,
                bidang_keahlian: data.bidang_keahlian || null,
                unit_kerja: data.unit_kerja || null,
                sertifikasi: data.sertifikasi || null,
            });
            toast({ title: 'Berhasil', description: 'Data fungsional diperbarui.' });
            queryClient.invalidateQueries({ queryKey: ['profile-functional'] });
            exitEdit();
        } catch {
            toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' });
        }
    };

    const onPenelitian = async (data: PenelitianForm) => {
        try {
            await api.put('/profile/functional', {
                riwayat_penelitian_pengabdian: data.riwayat_penelitian_pengabdian || null,
                pernyataan: data.pernyataan === true ? true : undefined,
            });
            toast({ title: 'Berhasil', description: 'Data penelitian diperbarui.' });
            queryClient.invalidateQueries({ queryKey: ['profile-functional'] });
            exitEdit();
        } catch {
            toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' });
        }
    };

    if (isLoading) return <div className="p-6">Memuat profil...</div>;
    if (!profile) return <div className="p-6 text-destructive">Gagal memuat data.</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Profil Saya</h1>
                <div className="flex gap-2">
                    <Link to="/profile/password">
                        <Button variant="outline">Ganti Kata Sandi</Button>
                    </Link>
                    {editing
                        ? <Button variant="outline" onClick={exitEdit}>Batal Ubah</Button>
                        : <Button onClick={() => setEditing(true)}>Ubah Profil</Button>}
                </div>
            </div>
            {!editing && <p className="text-sm text-muted-foreground">Mode Lihat — klik Ubah Profil untuk mengedit semua bagian.</p>}

            <Tabs defaultValue="pribadi">
                <TabsList>
                    <TabsTrigger value="pribadi">Data Pribadi</TabsTrigger>
                    <TabsTrigger value="pendidikan">Pendidikan</TabsTrigger>
                    <TabsTrigger value="fungsional">Pangkat & Fungsional</TabsTrigger>
                    {isPegawai && <TabsTrigger value="matkul">Mata Kuliah</TabsTrigger>}
                    {isDosen && <TabsTrigger value="penelitian">Penelitian & Pernyataan</TabsTrigger>}
                </TabsList>

                <TabsContent value="pribadi" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informasi Akun</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p><span className="font-medium">NIK:</span> {profile.nik}</p>
                            <p><span className="font-medium">Nama:</span> {profile.name}</p>
                            <p><span className="font-medium">Email:</span> {profile.email}</p>
                            <p><span className="font-medium">Role:</span> {profile.roles?.[0]?.name || '-'}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Data Identitas</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <Row label="Nama Lengkap" value={employee?.nama_lengkap} />
                            <Row label="NIP" value={employee?.nip} />
                            <Row label="NIDN" value={employee?.nidn} />
                            <Row label="Tempat Lahir" value={employee?.tempat_lahir} />
                            <Row label="Tanggal Lahir" value={employee?.tanggal_lahir} />
                            <Row label="Jenis Kelamin" value={employee?.jenis_kelamin} />
                            <Row label="Agama" value={employee?.agama} />
                            <Row label="Status Pernikahan" value={employee?.status_pernikahan} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Data Kontak</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {editing ? (
                                <form onSubmit={kontakForm.handleSubmit(onKontak)} className="space-y-4">
                                    <div>
                                        <Label htmlFor="alamat_ktp">Alamat KTP</Label>
                                        <Textarea id="alamat_ktp" {...kontakForm.register('alamat_ktp')} />
                                    </div>
                                    <div>
                                        <Label htmlFor="alamat_domisili">Alamat Domisili</Label>
                                        <Textarea id="alamat_domisili" {...kontakForm.register('alamat_domisili')} />
                                    </div>
                                    <div>
                                        <Label htmlFor="nomor_hp">Nomor HP</Label>
                                        <Input id="nomor_hp" {...kontakForm.register('nomor_hp')} />
                                    </div>
                                    <Button type="submit">Simpan</Button>
                                </form>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Row label="Alamat KTP" value={employee?.alamat_ktp} />
                                    <Row label="Alamat Domisili" value={employee?.alamat_domisili} />
                                    <Row label="Nomor HP" value={employee?.nomor_hp} />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pendidikan">
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Pendidikan</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {editing ? (
                                <form onSubmit={pendidikanForm.handleSubmit(onPendidikan)} className="space-y-6">
                                    {(['S1', 'S2', 'S3'] as const).map((j) => (
                                        <div key={j} className="space-y-4 rounded-md border p-4">
                                            <h3 className="font-semibold">{j}</h3>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div>
                                                    <Label htmlFor={`${j}-nama_pt`}>Nama Perguruan Tinggi</Label>
                                                    <Input id={`${j}-nama_pt`} {...pendidikanForm.register(`${j}.nama_pt`)} />
                                                </div>
                                                <div>
                                                    <Label htmlFor={`${j}-jurusan`}>Jurusan</Label>
                                                    <Input id={`${j}-jurusan`} {...pendidikanForm.register(`${j}.jurusan`)} />
                                                </div>
                                                <div>
                                                    <Label htmlFor={`${j}-tahun_masuk`}>Tahun Masuk</Label>
                                                    <Input id={`${j}-tahun_masuk`} inputMode="numeric" {...pendidikanForm.register(`${j}.tahun_masuk`)} />
                                                </div>
                                                <div>
                                                    <Label htmlFor={`${j}-tahun_lulus`}>Tahun Lulus</Label>
                                                    <Input id={`${j}-tahun_lulus`} inputMode="numeric" {...pendidikanForm.register(`${j}.tahun_lulus`)} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <Button type="submit">Simpan</Button>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    {(['S1', 'S2', 'S3'] as const).map((j) => (
                                        <div key={j} className="rounded-md border p-4">
                                            <h3 className="font-semibold">{j}</h3>
                                            <div className="grid gap-4 sm:grid-cols-2 mt-2">
                                                <Row label="Nama PT" value={education?.[j]?.nama_pt} />
                                                <Row label="Jurusan" value={education?.[j]?.jurusan} />
                                                <Row label="Tahun Masuk" value={education?.[j]?.tahun_masuk} />
                                                <Row label="Tahun Lulus" value={education?.[j]?.tahun_lulus} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="fungsional">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pangkat & Fungsional</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {editing ? (
                                <form onSubmit={fungsionalForm.handleSubmit(onFungsional)} className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label>Status Kepegawaian</Label>
                                            <Select value={fungsionalForm.watch('status_kepegawaian_detail') ?? ''} onValueChange={(v) => fungsionalForm.setValue('status_kepegawaian_detail', v)}>
                                                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="PNS">PNS</SelectItem>
                                                    <SelectItem value="DPK">DPK</SelectItem>
                                                    <SelectItem value="Non-PNS">Non PNS</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Jabatan Fungsional</Label>
                                            <Select value={fungsionalForm.watch('jabatan_fungsional') ?? ''} onValueChange={(v) => fungsionalForm.setValue('jabatan_fungsional', v)}>
                                                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Asisten Ahli">Asisten Ahli</SelectItem>
                                                    <SelectItem value="Lektor">Lektor</SelectItem>
                                                    <SelectItem value="Lektor Kepala">Lektor Kepala</SelectItem>
                                                    <SelectItem value="Guru Besar">Guru Besar</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Pangkat</Label>
                                            <Input {...fungsionalForm.register('pangkat')} />
                                        </div>
                                        <div>
                                            <Label>Golongan Ruang</Label>
                                            <Input {...fungsionalForm.register('golongan_ruang')} />
                                        </div>
                                        <div>
                                            <Label>TMT Pangkat</Label>
                                            <Input type="date" {...fungsionalForm.register('tmt_pangkat')} />
                                        </div>
                                        <div>
                                            <Label>Bidang Keahlian</Label>
                                            <Input {...fungsionalForm.register('bidang_keahlian')} />
                                        </div>
                                        <div>
                                            <Label>Unit Kerja</Label>
                                            <Input {...fungsionalForm.register('unit_kerja')} />
                                        </div>
                                        <div>
                                            <Label>Sertifikasi</Label>
                                            <Input {...fungsionalForm.register('sertifikasi')} />
                                        </div>
                                    </div>
                                    <Button type="submit">Simpan</Button>
                                </form>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Row label="Status Kepegawaian" value={functional?.status_kepegawaian_detail} />
                                    <Row label="Jabatan Fungsional" value={functional?.jabatan_fungsional} />
                                    <Row label="Pangkat" value={functional?.pangkat} />
                                    <Row label="Golongan Ruang" value={functional?.golongan_ruang} />
                                    <Row label="TMT Pangkat" value={functional?.tmt_pangkat} />
                                    <Row label="Bidang Keahlian" value={functional?.bidang_keahlian} />
                                    <Row label="Unit Kerja" value={functional?.unit_kerja} />
                                    <Row label="Sertifikasi" value={functional?.sertifikasi} />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {isPegawai && (
                <TabsContent value="matkul">
                    <Card>
                        <CardHeader>
                            <CardTitle>Mata Kuliah</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!assignments || assignments.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Belum ada mata kuliah.</p>
                            ) : (
                                <div className="space-y-2">
                                    {assignments.map((a) => (
                                        <div key={a.id} className="rounded-md border p-3 text-sm">
                                            <p className="font-medium">{a.nama_matkul || '-'} ({a.kode_matkul || '-'})</p>
                                            <p className="text-muted-foreground">{a.sks ?? '-'} SKS - {a.semester || '-'} - {a.program_studi || '-'} - Kelas {a.kelas || '-'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {editing && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const fd = new FormData(e.currentTarget);
                                        api.post('/profile/teaching-assignments', {
                                            kode_matkul: fd.get('kode_matkul') || null,
                                            nama_matkul: fd.get('nama_matkul') || null,
                                            sks: fd.get('sks') ? Number(fd.get('sks')) : null,
                                            semester: fd.get('semester') || null,
                                            program_studi: fd.get('program_studi') || null,
                                            kelas: fd.get('kelas') || null,
                                        }).then(() => {
                                            toast({ title: 'Berhasil', description: 'Mata kuliah ditambahkan.' });
                                            (e.target as HTMLFormElement).reset();
                                            queryClient.invalidateQueries({ queryKey: ['profile-teaching-assignments'] });
                                        }).catch(() => {
                                            toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' });
                                        });
                                    }}
                                    className="space-y-4 rounded-md border p-4"
                                >
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div><Label>Kode Matkul</Label><Input name="kode_matkul" /></div>
                                        <div><Label>Nama Matkul</Label><Input name="nama_matkul" /></div>
                                        <div><Label>SKS</Label><Input name="sks" type="number" step="0.5" /></div>
                                        <div><Label>Semester</Label><Input name="semester" /></div>
                                        <div><Label>Program Studi</Label><Input name="program_studi" /></div>
                                        <div><Label>Kelas</Label><Input name="kelas" /></div>
                                    </div>
                                    <Button type="submit">Tambah Matkul</Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                )}

                {isDosen && (
                    <TabsContent value="penelitian">
                        <Card>
                            <CardHeader>
                                <CardTitle>Penelitian & Pernyataan</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {editing ? (
                                    <form onSubmit={penelitianForm.handleSubmit(onPenelitian)} className="space-y-4">
                                        <div>
                                            <Label htmlFor="riwayat">Riwayat Penelitian & Pengabdian</Label>
                                            <Textarea id="riwayat" {...penelitianForm.register('riwayat_penelitian_pengabdian')} />
                                        </div>
                                        {functional?.pernyataan_disetujui_pada && (
                                            <p className="text-sm text-muted-foreground">Pernyataan disetujui pada {functional.pernyataan_disetujui_pada}.</p>
                                        )}
                                        <label className="flex items-center gap-2 text-sm">
                                            <input type="checkbox" {...penelitianForm.register('pernyataan')} />
                                            Saya menyatakan data di atas benar.
                                        </label>
                                        <Button type="submit">Simpan</Button>
                                    </form>
                                ) : (
                                    <div className="space-y-2">
                                        <Row label="Riwayat Penelitian & Pengabdian" value={functional?.riwayat_penelitian_pengabdian} />
                                        <Row label="Pernyataan Disetujui Pada" value={functional?.pernyataan_disetujui_pada} />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>

            {employee && (
                <Card>
                    <CardHeader>
                        <CardTitle>Export Biodata</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                        <Button onClick={async () => {
                            const res = await api.get(`/reports/biodata-pdf/${employee.id}`, { responseType: 'blob' });
                            const url = window.URL.createObjectURL(new Blob([res.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', `biodata_${employee.nik || employee.id}.pdf`);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                        }}>Unduh PDF</Button>
                        <Button variant="outline" onClick={async () => {
                            const res = await api.get(`/reports/biodata-word/${employee.id}`, { responseType: 'blob' });
                            const url = window.URL.createObjectURL(new Blob([res.data]));
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', `biodata_${employee.nik || employee.id}.doc`);
                            document.body.appendChild(link);
                            link.click();
                            link.remove();
                        }}>Unduh Word</Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
