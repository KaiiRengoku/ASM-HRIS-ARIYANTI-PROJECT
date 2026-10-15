import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (...parts) => readFileSync(join(here, ...parts), 'utf-8');

const leaveList = read('LeaveListPage.tsx');
const leaveDetail = read('LeaveDetailPage.tsx');
const approval = read('..', '..', 'approval', 'pages', 'ApprovalPage.tsx');
const documents = read('..', '..', 'documents', 'pages', 'DocumentListPage.tsx');
const reports = read('..', '..', 'reports', 'pages', 'ReportPage.tsx');

// Regresi bug: PD_I/II/III tidak punya leave.cancel, tombol "Batalkan" harus ikut hilang.
test('tombol Batalkan di daftar cuti dijaga izin leave.cancel', () => {
    assert.ok(
        leaveList.includes("const canCancel = hasPermission('leave.cancel')"),
        'variabel canCancel hilang di LeaveListPage',
    );
    assert.ok(
        leaveList.includes('{canCancel &&') && leaveList.includes('Batalkan'),
        'tombol Batalkan tidak dijaga canCancel',
    );
});

test('tombol Batalkan di detail cuti dijaga izin leave.cancel', () => {
    assert.ok(
        leaveDetail.includes("const canCancel = hasPermission('leave.cancel')"),
        'variabel canCancel hilang di LeaveDetailPage',
    );
    assert.ok(
        leaveDetail.includes('{canCancel &&') && leaveDetail.includes('Batalkan'),
        'tombol Batalkan tidak dijaga canCancel',
    );
});

test('tombol Tolak dijaga izin leave.reject, terpisah dari Setujui', () => {
    assert.ok(leaveList.includes("const canReject = hasPermission('leave.reject')"), 'canReject hilang');
    assert.ok(leaveList.includes('{canReject &&'), 'tombol Tolak tidak dijaga canReject');
    assert.ok(
        leaveList.includes("const canApprove = hasPermission('leave.approve')"),
        'canApprove hilang',
    );
});

test('tombol Ajukan Cuti dijaga izin leave.create', () => {
    assert.ok(leaveList.includes("const canCreate = hasPermission('leave.create')"), 'canCreate hilang');
    assert.ok(leaveList.includes('{canCreate &&'), 'dialog Ajukan Cuti tidak dijaga canCreate');
});

test('halaman Approval memeriksa izin approve dan reject', () => {
    assert.ok(approval.includes("hasPermission('leave.approve')"), 'cek leave.approve hilang');
    assert.ok(approval.includes("hasPermission('leave.reject')"), 'cek leave.reject hilang');
    assert.ok(approval.includes('{canApprove &&'), 'tombol Setujui tidak dijaga canApprove');
    assert.ok(approval.includes('{canReject &&'), 'tombol Tolak tidak dijaga canReject');
});

test('tombol Upload Dokumen dijaga izin document.upload', () => {
    assert.ok(
        documents.includes("const canUpload = hasPermission('document.upload')"),
        'canUpload hilang di DocumentListPage',
    );
    assert.ok(documents.includes('{canUpload &&'), 'tombol Upload tidak dijaga canUpload');
});

test('ekspor laporan dijaga izin employee.export dan leave.export', () => {
    assert.ok(reports.includes("hasPermission('employee.export')"), 'cek employee.export hilang');
    assert.ok(reports.includes("hasPermission('leave.export')"), 'cek leave.export hilang');
    assert.ok(reports.includes('{canExportEmployees &&'), 'blok ekspor pegawai tidak dijaga');
    assert.ok(reports.includes('{canExportLeaves &&'), 'blok ekspor cuti tidak dijaga');
});

test('rekap sisa cuti hanya untuk role berwenang dengan izin leave.view', () => {
    assert.ok(reports.includes("hasPermission('leave.view')"), 'cek leave.view hilang');
    assert.ok(
        reports.includes("'HRD', 'DIREKTUR', 'PD_I', 'PD_II', 'PD_III'"),
        'daftar role rekap hilang',
    );
    assert.ok(reports.includes('{canViewRecap &&'), 'tabel rekap tidak dijaga canViewRecap');
});

test('kegagalan aksi cuti menampilkan pesan dari server, bukan teks statis', () => {
    assert.ok(leaveList.includes('extractErrorMessage'), 'helper pesan error tidak dipakai di daftar cuti');
    assert.ok(leaveDetail.includes('extractErrorMessage'), 'helper pesan error tidak dipakai di detail cuti');
    assert.ok(
        !leaveDetail.includes("description: 'Terjadi kesalahan.'"),
        'detail cuti masih memakai pesan error statis',
    );
});

// Kalau menu masih tampil untuk role yang dilarang rute, pengguna akan klik lalu
// terlempar ke halaman 403. Menu dan rute harus sama-sama dibatasi.
test('menu Laporan disembunyikan untuk role yang dilarang membuka halaman', () => {
    const sidebar = read('..', '..', '..', 'components', 'layout', 'Sidebar.tsx');
    const router = read('..', '..', '..', 'routes', 'router.tsx');
    const allowed = '"HRD", "DIREKTUR", "PD_I", "PD_II", "PD_III"';
    assert.ok(
        sidebar.includes('const REPORT = ["HRD", "DIREKTUR", "PD_I", "PD_II", "PD_III"]'),
        'daftar role menu Laporan hilang',
    );
    assert.ok(
        sidebar.includes('label: "Laporan", href: "/laporan"') && sidebar.includes('roles: REPORT'),
        'menu Laporan tidak dibatasi role berwenang',
    );
    assert.ok(
        router.includes('const REPORT_ROLES = ["HRD", "DIREKTUR", "PD_I", "PD_II", "PD_III"]'),
        'daftar role rute laporan hilang',
    );
    assert.ok(allowed.split(',').length === 5, 'daftar role berwenang tidak lengkap');
});

// Bug: membuka alamat polos (localhost:5173) selalu melompat ke /dashboard/hrd,
// sehingga role non-HRD yang masih login terlempar ke 403 saat dev dijalankan ulang.
test('halaman awal mengarahkan sesuai role, bukan selalu ke dashboard HRD', () => {
    const router = read('..', '..', '..', 'routes', 'router.tsx');
    const home = read('..', '..', '..', 'components', 'auth', 'RoleHomeRedirect.tsx');
    assert.ok(
        router.includes('{ path: "/", element: <RoleHomeRedirect /> }'),
        'rute akar masih melompat ke dashboard HRD',
    );
    assert.ok(!router.includes('to="/dashboard/hrd"'), 'rute akar masih menunjuk dashboard HRD');
    for (const dashboard of ['/dashboard/hrd', '/dashboard/kabag', '/dashboard/dosen', '/dashboard/pegawai']) {
        assert.ok(home.includes(dashboard), `pengalih role kehilangan ${dashboard}`);
    }
});

test('halaman login mengalihkan sesi yang masih aktif', () => {
    const loginPage = read('..', '..', '..', 'features', 'auth', 'pages', 'LoginPage.tsx');
    assert.ok(loginPage.includes('isAuthenticated'), 'LoginPage tidak memeriksa sesi aktif');
    assert.ok(loginPage.includes('<RoleHomeRedirect />'), 'LoginPage tidak mengalihkan sesi aktif');
});

// Fitur wajib ada di UAT Direktur: Direktur menyetujui cuti PD I/II/III.
// Menu "Approval" tampil karena role ALL + izin leave.approve, jadi rutenya
// WAJIB memuat DIREKTUR. Kalau tidak, Direktur klik menu lalu kena 403.
test('halaman Approval dapat dibuka Direktur, bukan hanya HRD dan Kabag', () => {
    const router = read('..', '..', '..', 'routes', 'router.tsx');
    const line = router.split('\n').find((l) => l.includes('path: "/approval"'));
    assert.ok(line, 'rute /approval tidak ditemukan di router');
    assert.ok(line.includes('"DIREKTUR"'), 'rute /approval tidak memuat DIREKTUR (Direktur akan kena 403)');
    assert.ok(line.includes('"HRD"') && line.includes('"KABAG"'), 'rute /approval kehilangan HRD/KABAG');
});

// Temuan "sebagian" DOS-02/STF-02: dashboard Dosen & Pegawai harus menampilkan
// informasi pribadi, bukan hanya sisa cuti dan status pengajuan.
test('dashboard Dosen dan Pegawai menampilkan kartu Informasi Pribadi', () => {
    const dosen = read('..', '..', 'dashboard', 'pages', 'DosenDashboard.tsx');
    const pegawai = read('..', '..', 'dashboard', 'pages', 'PegawaiDashboard.tsx');
    for (const [nama, src] of [['DosenDashboard', dosen], ['PegawaiDashboard', pegawai]]) {
        assert.ok(src.includes('Informasi Pribadi'), `${nama} kehilangan kartu Informasi Pribadi`);
        assert.ok(src.includes('interface ProfilInfo'), `${nama} kehilangan tipe ProfilInfo`);
        assert.ok(src.includes('profil?: ProfilInfo'), `${nama} kehilangan field profil di stats`);
        assert.ok(src.includes('function namaLengkapDari'), `${nama} kehilangan helper nama lengkap`);
    }
});

// Dashboard backend harus mengirim blok profil berisi identitas pegawai.
test('dashboard stats mengirim data profil pegawai', () => {
    const controller = readFileSync(
        join(here, '..', '..', '..', '..', '..', 'backend', 'app', 'Http', 'Controllers', 'DashboardController.php'),
        'utf-8',
    );
    assert.ok(controller.includes("'profil' => ["), 'DashboardController tidak mengirim blok profil');
    for (const field of ['nama_lengkap', 'nik', 'jabatan', 'tanggal_masuk_kerja']) {
        assert.ok(controller.includes(`'${field}'`), `blok profil kehilangan field ${field}`);
    }
});

// Temuan "sebagian" DOS-06/STF-06: sisa cuti harus terlihat di halaman Cuti,
// bukan hanya di dashboard. Dokumen UAT menyebut lewat menu cuti.
test('halaman Cuti & Izin menampilkan ringkasan saldo cuti', () => {
    assert.ok(leaveList.includes('Sisa Cuti Tahunan'), 'LeaveListPage tidak menampilkan Sisa Cuti Tahunan');
    assert.ok(leaveList.includes('saldoCuti'), 'LeaveListPage tidak mengambil data saldo cuti');
    assert.ok(leaveList.includes("'/dashboard/stats'"), 'LeaveListPage tidak memanggil sumber saldo cuti');
});
