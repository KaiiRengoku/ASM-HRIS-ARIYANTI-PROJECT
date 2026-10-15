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
    position?: { id: number; name: string; code?: string | null } | null;
    alamat_ktp?: string | null;
    alamat_domisili?: string | null;
    nomor_hp?: string | null;
    position_histories?: { id: number; jabatan: string; unit_kerja?: string | null; no_sk?: string | null; start_date?: string | null; end_date?: string | null; keterangan?: string | null }[];
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
    pangkat?: string | null;
    golongan_ruang?: string | null;
    tmt_pangkat?: string | null;
    unit_kerja?: string | null;
    sertifikasi?: string | null;
    riwayat_penelitian_pengabdian?: string | null;
    pernyataan_disetujui_pada?: string | null;
}

interface CertificationItem {
    id: number;
    category: 'SERTIFIKAT' | 'PELATIHAN' | 'SEMINAR' | 'NONFORMAL';
    name?: string | null;
    organizer?: string | null;
    certificate_number?: string | null;
    issued_at?: string | null;
    valid_until?: string | null;
    duration?: string | null;
    participant_role?: string | null;
    description?: string | null;
    document_id?: number | null;
    document?: { id: number; file_name?: string | null } | null;
}
interface SkRecordItem {
    id: number;
    jenis_sk: 'JABATAN_FUNGSIONAL' | 'ANGKA_KREDIT_PAK' | 'KENAIKAN_PANGKAT';
    nomor_sk?: string | null;
    tanggal_sk?: string | null;
    tmt?: string | null;
    pejabat_penetap?: string | null;
    keterangan?: string | null;
    document_id?: number | null;
    document?: { id: number; file_name?: string | null } | null;
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


const CERT_CATEGORY_LABELS: Record<CertificationItem['category'], string> = {
    SERTIFIKAT: 'Sertifikat',
    PELATIHAN: 'Pelatihan',
    SEMINAR: 'Seminar',
    NONFORMAL: 'Non-Formal',
};

// Kategori yang sudah punya blok/form sendiri di tab Sertifikasi & Pelatihan.
// Dikecualikan dari daftar & form generik agar tidak tampil dua kali (dobel).
const BLOCKED_CATEGORIES: CertificationItem['category'][] = ['PELATIHAN', 'SEMINAR'];

// ============================================================================
// PEMETAAN PANGKAT OTOMATIS BERDASARKAN ROLE  (USULAN — MUDAH DIUBAH PEMILIK)
// ----------------------------------------------------------------------------
// Latar: pemilik memutuskan field "Pangkat" di tab Pangkat & Fungsional
// diisi OTOMATIS dari role user dan TIDAK bisa diedit manual.
// Nilai di bawah adalah USULAN DEFAULT berdasarkan Tabel Golongan/Pangkat PNS
// Indonesia + struktur organisasi (lihat tabel positions di DB). Silakan
// sesuaikan bila kebijakan kepegawaian ASM berbeda — cukup ubah satu tempat ini.
// Catatan: "Golongan Ruang" TIDAK ikut otomatis (tetap input manual).
// ============================================================================
export const PANGKAT_BY_ROLE: Record<string, string> = {
    DIREKTUR: 'Pembina',
    PD_I: 'Penata Tk.I',
    PD_II: 'Penata Tk.I',
    PD_III: 'Penata Tk.I',
    KABAG: 'Penata',
    HRD: 'Penata Muda Tk.I',
    DOSEN: 'Penata Muda',
    PEGAWAI: 'Pengatur',
};

// Urutan prioritas bila user punya beberapa role (paling tinggi menang).
const PANGKAT_ROLE_PRIORITY: string[] = ['DIREKTUR', 'PD_I', 'PD_II', 'PD_III', 'KABAG', 'HRD', 'DOSEN', 'PEGAWAI'];

/** Menentukan pangkat otomatis dari daftar role user (fallback: string kosong). */
export function pangkatDariRole(roles?: { name?: string; code?: string }[] | null): string {
    const codes = (roles ?? []).map((r) => (r.code ?? r.name ?? '').toUpperCase());
    for (const code of PANGKAT_ROLE_PRIORITY) {
        if (codes.includes(code)) return PANGKAT_BY_ROLE[code] ?? '';
    }
    return '';
}

const SK_JENIS_LABELS: Record<SkRecordItem['jenis_sk'], string> = {
    JABATAN_FUNGSIONAL: 'SK Jabatan Fungsional',
    ANGKA_KREDIT_PAK: 'SK Angka Kredit (PAK)',
    KENAIKAN_PANGKAT: 'SK Kenaikan Pangkat',
};

const identitasSchema = z.object({
    nama_lengkap: z.string().max(150).optional(),
    nip: z.string().regex(/^[0-9]{9}$/, 'NIP harus tepat 9 digit angka.').or(z.literal('')).optional(),
    nidn: z.string().regex(/^[0-9]{10}$/, 'NIDN harus tepat 10 digit angka.').or(z.literal('')).optional(),
    tempat_lahir: z.string().max(100).optional(),
    tanggal_lahir: z.string().optional(),
    jenis_kelamin: z.string().optional(),
    agama: z.string().max(30).optional(),
    status_pernikahan: z.string().optional(),
});

type IdentitasForm = z.infer<typeof identitasSchema>;

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
    pangkat: z.string().optional(),
    golongan_ruang: z.string().optional(),
    tmt_pangkat: z.string().optional(),
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
    const [certDocId, setCertDocId] = useState('none');
    const [certCategory, setCertCategory] = useState('SERTIFIKAT');
    const [certFile, setCertFile] = useState<File | null>(null);
    const [skJenis, setSkJenis] = useState<SkRecordItem['jenis_sk']>('JABATAN_FUNGSIONAL');

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
    // Penentuan dosen HARUS melihat role 'DOSEN' juga, bukan hanya kolom
    // employees.is_dosen: kolom itu di database praktis kosong (semua 0), sehingga
    // tanpa fallback ke role, tab "Mata Kuliah" & "Penelitian & Pernyataan" tak pernah tampil.
    const rolesProfil = profile?.roles ?? [];
    const punyaRoleDosen = rolesProfil.some((r) => (r.code ?? r.name) === 'DOSEN');
    const isDosen = Boolean(profile?.is_dosen) || punyaRoleDosen;

    const { data: assignments } = useQuery({
        queryKey: ['profile-teaching-assignments'],
        queryFn: async () => {
            const res = await api.get('/profile/teaching-assignments');
            return res.data.data as TeachingAssignment[];
        },
        enabled: isDosen,
    });

    const { data: certifications } = useQuery({
        queryKey: ['profile-certifications'],
        queryFn: async () => {
            const res = await api.get('/profile/certifications');
            return res.data.data as CertificationItem[];
        },
    });

    const { data: skRecords } = useQuery({
        queryKey: ['profile-sk-records'],
        queryFn: async () => {
            const res = await api.get('/profile/sk-records');
            return res.data.data as SkRecordItem[];
        },
    });

    const { data: myDocs } = useQuery({
        queryKey: ['profile-documents'],
        queryFn: async () => {
            const res = await api.get('/documents', { params: { per_page: 100 } });
            return (res.data.data ?? []) as { id: number; file_name?: string | null; document_type?: string | null }[];
        },
    });
    const identitasForm = useForm<IdentitasForm>({ resolver: zodResolver(identitasSchema) });
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
        if (employee) {
            identitasForm.reset({
                nama_lengkap: employee.nama_lengkap ?? '',
                nip: employee.nip ?? '',
                nidn: employee.nidn ?? '',
                tempat_lahir: employee.tempat_lahir ?? '',
                tanggal_lahir: employee.tanggal_lahir ? String(employee.tanggal_lahir).slice(0, 10) : '',
                jenis_kelamin: employee.jenis_kelamin ?? '',
                agama: employee.agama ?? '',
                status_pernikahan: employee.status_pernikahan ?? '',
            });
        }
    }, [employee, identitasForm]);

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
            // Pangkat OTOMATIS dari role (tidak bisa diedit) — lihat PANGKAT_BY_ROLE.
            pangkat: pangkatDariRole(profile?.roles),
            golongan_ruang: functional?.golongan_ruang ?? '',
            tmt_pangkat: functional?.tmt_pangkat ? String(functional.tmt_pangkat).slice(0, 10) : '',
            unit_kerja: functional?.unit_kerja ?? '',
            sertifikasi: functional?.sertifikasi ?? '',
        });
    }, [functional, fungsionalForm, profile]);

    useEffect(() => {
        penelitianForm.reset({
            riwayat_penelitian_pengabdian: functional?.riwayat_penelitian_pengabdian ?? '',
            pernyataan: false,
        });
    }, [functional, penelitianForm]);

    const exitEdit = () => setEditing(false);


    const onIdentitas = async (data: IdentitasForm) => {
        try {
            await api.put('/profile', {
                nama_lengkap: data.nama_lengkap || null,
                nip: data.nip || null,
                nidn: data.nidn || null,
                tempat_lahir: data.tempat_lahir || null,
                tanggal_lahir: data.tanggal_lahir || null,
                jenis_kelamin: data.jenis_kelamin || null,
                agama: data.agama || null,
                status_pernikahan: data.status_pernikahan || null,
            });
            toast({ title: 'Berhasil', description: 'Data identitas diperbarui.' });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            exitEdit();
        } catch {
            toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' });
        }
    };

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
                // Pangkat dikirim otomatis dari role (field read-only di UI).
                pangkat: pangkatDariRole(profile?.roles) || null,
                golongan_ruang: data.golongan_ruang || null,
                tmt_pangkat: data.tmt_pangkat || null,
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
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold">Profil Saya</h1>
                <div className="flex flex-wrap gap-2">
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
                    <TabsTrigger value="sertifikasi">Sertifikasi & Pelatihan</TabsTrigger>
                    <TabsTrigger value="fungsional">Pangkat & Fungsional</TabsTrigger>
                    {isDosen && <TabsTrigger value="matkul">Mata Kuliah</TabsTrigger>}
                    <TabsTrigger value="jabatan">Riwayat Jabatan</TabsTrigger>
                    {isDosen && <TabsTrigger value="penelitian">Penelitian & Pernyataan</TabsTrigger>}
                </TabsList>

                <TabsContent value="pribadi" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informasi Akun</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p><span className="font-medium">Nomor Induk Kepegawaian:</span> {profile.nik}</p>
                            <p><span className="font-medium">Nama:</span> {profile.name}</p>
                            <p><span className="font-medium">Email:</span> {profile.email}</p>
                            <p><span className="font-medium">Role:</span> {profile.roles?.[0]?.name || '-'}</p>
                            <p><span className="font-medium">Jabatan:</span> {employee?.position?.name || '-'}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Data Identitas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {editing ? (
                                <form onSubmit={identitasForm.handleSubmit(onIdentitas)} className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
                                            <Input id="nama_lengkap" {...identitasForm.register('nama_lengkap')} />
                                        </div>
                                        <div>
                                            <Label htmlFor="nip">NIP</Label>
                                            <Input id="nip" inputMode="numeric" {...identitasForm.register('nip')} />
                                            {identitasForm.formState.errors.nip && <p className="text-sm text-destructive">{identitasForm.formState.errors.nip.message}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="nidn">NIDN</Label>
                                            <Input id="nidn" inputMode="numeric" {...identitasForm.register('nidn')} />
                                            {identitasForm.formState.errors.nidn && <p className="text-sm text-destructive">{identitasForm.formState.errors.nidn.message}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="tempat_lahir">Tempat Lahir</Label>
                                            <Input id="tempat_lahir" {...identitasForm.register('tempat_lahir')} />
                                        </div>
                                        <div>
                                            <Label htmlFor="tanggal_lahir">Tanggal Lahir</Label>
                                            <Input id="tanggal_lahir" type="date" {...identitasForm.register('tanggal_lahir')} />
                                        </div>
                                        <div>
                                            <Label>Jenis Kelamin</Label>
                                            <Select value={identitasForm.watch('jenis_kelamin') ?? ''} onValueChange={(v) => identitasForm.setValue('jenis_kelamin', v)}>
                                                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="L">Laki-laki</SelectItem>
                                                    <SelectItem value="P">Perempuan</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="agama">Agama</Label>
                                            <Input id="agama" {...identitasForm.register('agama')} placeholder="Islam" />
                                        </div>
                                        <div>
                                            <Label>Status Pernikahan</Label>
                                            <Select value={identitasForm.watch('status_pernikahan') ?? ''} onValueChange={(v) => identitasForm.setValue('status_pernikahan', v)}>
                                                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Kawin">Kawin</SelectItem>
                                                    <SelectItem value="Belum Kawin">Belum Kawin</SelectItem>
                                                    <SelectItem value="Cerai">Cerai</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <Button type="submit">Simpan</Button>
                                </form>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Row label="Nama Lengkap" value={employee?.nama_lengkap} />
                                    <Row label="NIP" value={employee?.nip} />
                                    <Row label="NIDN" value={employee?.nidn} />
                                    <Row label="Tempat Lahir" value={employee?.tempat_lahir} />
                                    <Row label="Tanggal Lahir" value={employee?.tanggal_lahir} />
                                    <Row label="Jenis Kelamin" value={employee?.jenis_kelamin === 'L' ? 'Laki-laki' : employee?.jenis_kelamin === 'P' ? 'Perempuan' : employee?.jenis_kelamin} />
                                    <Row label="Agama" value={employee?.agama} />
                                    <Row label="Status Pernikahan" value={employee?.status_pernikahan} />
                                </div>
                            )}
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
                <TabsContent value="sertifikasi">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sertifikasi, Pelatihan & Seminar</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!certifications?.filter((c) => !BLOCKED_CATEGORIES.includes(c.category)).length ? (
                                <p className="text-sm text-muted-foreground">Belum ada data sertifikasi/pelatihan.</p>
                            ) : (
                                <div className="space-y-2">
                                    {certifications.filter((c) => !BLOCKED_CATEGORIES.includes(c.category)).map((c) => (
                                        <div key={c.id} className="rounded-md border p-3 text-sm">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="min-w-0 truncate font-medium">{c.name || '-'} <span className="text-muted-foreground">({CERT_CATEGORY_LABELS[c.category] ?? c.category})</span></p>
                                                {editing && (
                                                    <Button variant="ghost" size="sm" className="shrink-0" onClick={() => api.delete(`/profile/certifications/${c.id}`).then(() => {
                                                        toast({ title: 'Terhapus' });
                                                        queryClient.invalidateQueries({ queryKey: ['profile-certifications'] });
                                                    })}>Hapus</Button>
                                                )}
                                            </div>
                                            <p className="text-muted-foreground">
                                                {c.organizer || '-'}{c.certificate_number ? ` — No: ${c.certificate_number}` : ''}{c.issued_at ? ` — Terbit: ${String(c.issued_at).slice(0, 10)}` : ''}{c.valid_until ? ` s.d ${String(c.valid_until).slice(0, 10)}` : ''}{c.duration ? ` — ${c.duration}` : ''}{c.participant_role ? ` — ${c.participant_role}` : ''}{c.document?.file_name ? ` — File: ${c.document.file_name}` : ''}
                                            </p>
                                            {c.description && <p className="mt-1">{c.description}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {editing && (
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        const form = e.currentTarget as HTMLFormElement;
                                        const fd = new FormData(form);
                                        try {
                                            let documentId = certDocId && certDocId !== 'none' ? Number(certDocId) : null;
                                            if (certFile && employee) {
                                                const upload = new FormData();
                                                upload.append('employee_id', String(employee.id));
                                                upload.append('document_type', 'Sertifikat');
                                                upload.append('file', certFile);
                                                const uploaded = await api.post('/documents', upload, { headers: { 'Content-Type': 'multipart/form-data' } });
                                                documentId = uploaded.data.data.id;
                                            }
                                            await api.post('/profile/certifications', {
                                                category: certCategory,
                                                name: fd.get('name'),
                                                organizer: fd.get('organizer') || null,
                                                certificate_number: fd.get('certificate_number') || null,
                                                issued_at: fd.get('issued_at') || null,
                                                valid_until: fd.get('valid_until') || null,
                                                duration: fd.get('duration') || null,
                                                participant_role: fd.get('participant_role') || null,
                                                description: fd.get('description') || null,
                                                document_id: documentId,
                                            });
                                            toast({ title: 'Berhasil', description: 'Data ditambahkan.' });
                                            form.reset();
                                            setCertDocId('none');
                                            setCertFile(null);
                                            queryClient.invalidateQueries({ queryKey: ['profile-certifications'] });
                                            queryClient.invalidateQueries({ queryKey: ['profile-documents'] });
                                        } catch {
                                            toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' });
                                        }
                                    }}
                                    className="space-y-4 rounded-md border p-4"
                                >
                                    <div className="grid gap-4 sm:grid-cols-2">
                                    <div><Label>Kategori</Label><Select value={certCategory} onValueChange={setCertCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SERTIFIKAT">Sertifikat</SelectItem><SelectItem value="PELATIHAN">Pelatihan</SelectItem><SelectItem value="SEMINAR">Seminar</SelectItem><SelectItem value="NONFORMAL">Non-Formal</SelectItem></SelectContent></Select></div>
                                        <div><Label>Nama</Label><Input name="name" required /></div>
                                        <div><Label>Penyelenggara / Lembaga</Label><Input name="organizer" /></div>
                                        <div><Label>Nomor Sertifikat</Label><Input name="certificate_number" /></div>
                                        <div><Label>Tanggal Terbit</Label><Input name="issued_at" type="date" /></div>
                                        <div><Label>Masa Berlaku</Label><Input name="valid_until" type="date" /></div>
                                        <div><Label>Durasi</Label><Input name="duration" placeholder="mis. 3 hari / 32 JP" /></div>
                                        <div><Label>Peran</Label><Input name="participant_role" placeholder="Peserta / Pemateri" /></div>
                                        <div className="sm:col-span-2"><Label>Keterangan</Label><Input name="description" /></div>
                                        <div className="sm:col-span-2"><Label>Upload File Sertifikat (opsional, PDF/JPG/PNG maks 10MB)</Label><Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(ev) => setCertFile(ev.target.files?.[0] ?? null)} /></div>
                                        <div className="sm:col-span-2"><Label>Atau pilih file dari menu Dokumen</Label><Select value={certDocId} onValueChange={setCertDocId}><SelectTrigger><SelectValue placeholder="Tanpa file" /></SelectTrigger><SelectContent><SelectItem value="none">Tanpa file</SelectItem>{(myDocs ?? []).map((d) => (<SelectItem key={d.id} value={String(d.id)}>{d.file_name || `Dokumen ${d.id}`} ({d.document_type || '-'})</SelectItem>))}</SelectContent></Select></div>
                                    </div>
                                    <Button type="submit">Tambah Data</Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>

                    {(['PELATIHAN', 'SEMINAR'] as const).map((kat) => (
                        <Card key={kat} className="mt-4">
                            <CardHeader>
                                <CardTitle>{CERT_CATEGORY_LABELS[kat]}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {!certifications?.filter((c) => c.category === kat).length ? (
                                    <p className="text-sm text-muted-foreground">{`Belum ada data ${CERT_CATEGORY_LABELS[kat].toLowerCase()}.`}</p>
                                ) : (
                                    <div className="space-y-2">
                                        {certifications.filter((c) => c.category === kat).map((c) => (
                                            <div key={c.id} className="rounded-md border p-3 text-sm">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="min-w-0 truncate font-medium">{c.name || '-'}</p>
                                                    {editing && (
                                                        <Button variant="ghost" size="sm" className="shrink-0" onClick={() => api.delete(`/profile/certifications/${c.id}`).then(() => {
                                                            toast({ title: 'Terhapus' });
                                                            queryClient.invalidateQueries({ queryKey: ['profile-certifications'] });
                                                        })}>Hapus</Button>
                                                    )}
                                                </div>
                                                <p className="text-muted-foreground">
                                                    {c.organizer || '-'}{c.certificate_number ? ` — No: ${c.certificate_number}` : ''}{c.issued_at ? ` — Terbit: ${String(c.issued_at).slice(0, 10)}` : ''}{c.valid_until ? ` s.d ${String(c.valid_until).slice(0, 10)}` : ''}{c.duration ? ` — ${c.duration}` : ''}{c.participant_role ? ` — ${c.participant_role}` : ''}{c.document?.file_name ? ` — File: ${c.document.file_name}` : ''}
                                                </p>
                                                {c.description && <p className="mt-1">{c.description}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {editing && (
                                    <form
                                        onSubmit={async (e) => {
                                            e.preventDefault();
                                            const form = e.currentTarget as HTMLFormElement;
                                            const fd = new FormData(form);
                                            try {
                                                await api.post('/profile/certifications', {
                                                    category: kat,
                                                    name: fd.get('name'),
                                                    organizer: fd.get('organizer') || null,
                                                    certificate_number: fd.get('certificate_number') || null,
                                                    issued_at: fd.get('issued_at') || null,
                                                    valid_until: fd.get('valid_until') || null,
                                                    duration: fd.get('duration') || null,
                                                    participant_role: fd.get('participant_role') || null,
                                                    description: fd.get('description') || null,
                                                    document_id: null,
                                                });
                                                toast({ title: 'Berhasil', description: 'Data ditambahkan.' });
                                                form.reset();
                                                queryClient.invalidateQueries({ queryKey: ['profile-certifications'] });
                                            } catch {
                                                toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' });
                                            }
                                        }}
                                        className="space-y-4 rounded-md border p-4"
                                    >
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div><Label>Nama</Label><Input name="name" required /></div>
                                            <div><Label>Penyelenggara / Lembaga</Label><Input name="organizer" /></div>
                                            <div><Label>Nomor</Label><Input name="certificate_number" /></div>
                                            <div><Label>Tanggal Terbit</Label><Input name="issued_at" type="date" /></div>
                                            <div><Label>Masa Berlaku</Label><Input name="valid_until" type="date" /></div>
                                            <div><Label>Durasi</Label><Input name="duration" placeholder="mis. 3 hari / 32 JP" /></div>
                                            <div><Label>Peran</Label><Input name="participant_role" placeholder="Peserta / Pemateri" /></div>
                                            <div className="sm:col-span-2"><Label>Keterangan</Label><Input name="description" /></div>
                                        </div>
                                        <Button type="submit">{`Tambah ${CERT_CATEGORY_LABELS[kat]}`}</Button>
                                    </form>
                                )}
                            </CardContent>
                        </Card>
                    ))}
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
                                                    <SelectItem value="Tetap">Tetap</SelectItem>
                                                    <SelectItem value="Tidak Tetap">Tidak Tetap</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Pangkat (otomatis dari role)</Label>
                                            {/* Pangkat ditentukan dari role — read-only, lihat PANGKAT_BY_ROLE. */}
                                            <Input
                                                value={pangkatDariRole(profile?.roles)}
                                                readOnly
                                                disabled
                                                className="bg-muted text-muted-foreground"
                                            />
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
                                    <Row label="Pangkat" value={pangkatDariRole(profile?.roles)} />
                                    <Row label="Golongan Ruang" value={functional?.golongan_ruang} />
                                    <Row label="TMT Pangkat" value={functional?.tmt_pangkat} />
                                    <Row label="Unit Kerja" value={functional?.unit_kerja} />
                                    <Row label="Sertifikasi" value={functional?.sertifikasi} />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Riwayat SK</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Menampung SK Jabatan Fungsional, SK Penilaian Angka Kredit (PAK), dan SK Kenaikan Pangkat. Bisa berulang sepanjang karier.
                            </p>
                            {!skRecords || skRecords.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Belum ada riwayat SK.</p>
                            ) : (
                                <div className="space-y-2">
                                    {skRecords.map((s) => (
                                        <div key={s.id} className="rounded-md border p-3 text-sm">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="min-w-0 truncate font-medium">{SK_JENIS_LABELS[s.jenis_sk] ?? s.jenis_sk}</p>
                                                {editing && (
                                                    <Button variant="ghost" size="sm" className="shrink-0" onClick={() => api.delete(`/profile/sk-records/${s.id}`).then(() => {
                                                        toast({ title: 'Terhapus' });
                                                        queryClient.invalidateQueries({ queryKey: ['profile-sk-records'] });
                                                    })}>Hapus</Button>
                                                )}
                                            </div>
                                            <p className="text-muted-foreground">
                                                {s.nomor_sk ? `No: ${s.nomor_sk}` : 'No: -'}
                                                {s.tanggal_sk ? ` — Tanggal SK: ${String(s.tanggal_sk).slice(0, 10)}` : ''}
                                                {s.tmt ? ` — TMT: ${String(s.tmt).slice(0, 10)}` : ''}
                                                {s.pejabat_penetap ? ` — ${s.pejabat_penetap}` : ''}
                                                {s.document?.file_name ? ` — File: ${s.document.file_name}` : ''}
                                            </p>
                                            {s.keterangan && <p className="mt-1">{s.keterangan}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {editing && (
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        const form = e.currentTarget as HTMLFormElement;
                                        const fd = new FormData(form);
                                        try {
                                            await api.post('/profile/sk-records', {
                                                jenis_sk: skJenis,
                                                nomor_sk: fd.get('nomor_sk') || null,
                                                tanggal_sk: fd.get('tanggal_sk') || null,
                                                tmt: fd.get('tmt') || null,
                                                pejabat_penetap: fd.get('pejabat_penetap') || null,
                                                keterangan: fd.get('keterangan') || null,
                                            });
                                            toast({ title: 'Berhasil', description: 'Riwayat SK ditambahkan.' });
                                            form.reset();
                                            setSkJenis('JABATAN_FUNGSIONAL');
                                            queryClient.invalidateQueries({ queryKey: ['profile-sk-records'] });
                                        } catch {
                                            toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' });
                                        }
                                    }}
                                    className="space-y-4 rounded-md border p-4"
                                >
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <Label>Jenis SK</Label>
                                            <Select value={skJenis} onValueChange={(v) => setSkJenis(v as SkRecordItem['jenis_sk'])}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="JABATAN_FUNGSIONAL">SK Jabatan Fungsional</SelectItem>
                                                    <SelectItem value="ANGKA_KREDIT_PAK">SK Angka Kredit (PAK)</SelectItem>
                                                    <SelectItem value="KENAIKAN_PANGKAT">SK Kenaikan Pangkat</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div><Label>Nomor SK</Label><Input name="nomor_sk" /></div>
                                        <div><Label>Tanggal SK</Label><Input name="tanggal_sk" type="date" /></div>
                                        <div><Label>TMT</Label><Input name="tmt" type="date" /></div>
                                        <div><Label>Pejabat Penetap</Label><Input name="pejabat_penetap" /></div>
                                        <div className="sm:col-span-2"><Label>Keterangan</Label><Input name="keterangan" /></div>
                                    </div>
                                    <Button type="submit">Tambah SK</Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="jabatan">
                    <Card>
                        <CardHeader>
                            <CardTitle>Riwayat Jabatan</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!employee?.position_histories?.length ? (
                                <p className="text-sm text-muted-foreground">Belum ada riwayat jabatan.</p>
                            ) : (
                                <div className="space-y-2">
                                    {employee.position_histories.map((h) => (
                                        <div key={h.id} className="rounded-md border p-3 text-sm">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="min-w-0 truncate font-medium">{h.jabatan}{h.unit_kerja ? ` (${h.unit_kerja})` : ''}</p>
                                                {editing && (
                                                    <Button variant="ghost" size="sm" className="shrink-0" onClick={() => api.delete(`/profile/position-histories/${h.id}`).then(() => {
                                                        toast({ title: 'Terhapus' });
                                                        queryClient.invalidateQueries({ queryKey: ['profile'] });
                                                    })}>Hapus</Button>
                                                )}
                                            </div>
                                            <p className="text-muted-foreground">
                                                {h.start_date ? String(h.start_date).slice(0, 10) : '-'} s.d {h.end_date ? String(h.end_date).slice(0, 10) : 'sekarang'}
                                                {h.no_sk ? ` — SK: ${h.no_sk}` : ''}{h.keterangan ? ` — ${h.keterangan}` : ''}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {editing && (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const fd = new FormData(e.currentTarget);
                                        api.post('/profile/position-histories', {
                                            jabatan: fd.get('jabatan'),
                                            unit_kerja: fd.get('unit_kerja') || null,
                                            no_sk: fd.get('no_sk') || null,
                                            start_date: fd.get('start_date') || null,
                                            end_date: fd.get('end_date') || null,
                                            keterangan: fd.get('keterangan') || null,
                                        }).then(() => {
                                            toast({ title: 'Berhasil', description: 'Riwayat jabatan ditambahkan.' });
                                            (e.target as HTMLFormElement).reset();
                                            queryClient.invalidateQueries({ queryKey: ['profile'] });
                                        }).catch(() => {
                                            toast({ title: 'Gagal', description: 'Terjadi kesalahan.', variant: 'destructive' });
                                        });
                                    }}
                                    className="space-y-4 rounded-md border p-4"
                                >
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div><Label>Jabatan</Label><Input name="jabatan" required /></div>
                                        <div><Label>Unit Kerja</Label><Input name="unit_kerja" /></div>
                                        <div><Label>No. SK</Label><Input name="no_sk" /></div>
                                        <div><Label>Mulai</Label><Input name="start_date" type="date" /></div>
                                        <div><Label>Selesai</Label><Input name="end_date" type="date" /></div>
                                        <div><Label>Keterangan</Label><Input name="keterangan" /></div>
                                    </div>
                                    <Button type="submit">Tambah Riwayat</Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {isDosen && (
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
                            window.URL.revokeObjectURL(url);
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
                            window.URL.revokeObjectURL(url);
                        }}>Unduh Word</Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
