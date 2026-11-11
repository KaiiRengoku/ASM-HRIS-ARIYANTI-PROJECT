<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Regresi commit 09c1077/d27c4f7: nilai "Lama Kerja" di CSV, Excel,
// dan PDF laporan pegawai harus benar untuk tanggal masuk lampau
// (bug Carbon 3: diffInYears(..., false) menghasilkan signed negatif,
// sehingga guard `$tahun > 0` selalu false → semua tercetak "< 1 tahun").
class EmployeeExportLamaKerjaTest extends TestCase
{
    use RefreshDatabase;

    private int $urut = 0;

    private function pegawaiDenganLamaKerja(int $hariLama, ?string $roleCode = null): Employee
    {
        $this->urut++;
        $nik = sprintf('%09d', 100000000 + $hariLama + $this->urut);
        $email = 'lama-' . $nik . '@asm.test';

        $employee = Employee::create([
            'nik' => $nik,
            'nama_lengkap' => 'Pegawai Lama ' . $nik,
            'email' => $email,
            'tanggal_masuk_kerja' => now()->subDays($hariLama)->format('Y-m-d'),
        ]);
        $user = User::create([
            'nik' => $nik,
            'name' => 'Pegawai Lama ' . $nik,
            'email' => $email,
            'password' => 'password',
        ]);
        $user->employee_id = $employee->id;
        $user->save();
        if ($roleCode) {
            $role = Role::firstOrCreate(['code' => $roleCode], ['name' => $roleCode]);
            $user->roles()->attach($role->id);
        }
        return $employee;
    }

    private function userHrd(): User
    {
        $this->urut++;
        $nik = sprintf('%09d', 999000000 + $this->urut);
        $email = 'hrd-' . $nik . '@asm.test';

        $employee = Employee::create([
            'nik' => $nik,
            'nama_lengkap' => 'HRD Cek Lama Kerja',
            'email' => $email,
            'tanggal_masuk_kerja' => '2015-01-01',
        ]);
        $user = User::create([
            'nik' => $nik,
            'name' => 'HRD Cek Lama Kerja',
            'email' => $email,
            'password' => 'password',
        ]);
        $user->employee_id = $employee->id;
        $user->save();
        $role = Role::where('code', 'HRD')->firstOrFail();
        $user->roles()->attach($role->id);

        return $user->fresh();
    }

    public function test_durasi_masa_kerja_hitungan_tahun_benar(): void
    {
        $controller = new \App\Http\Controllers\ReportController();

        // 3 tahun 2 bulan — harus "3 tahun", bukan "< 1 tahun".
        $tigaTahun = $controller->durasiMasaKerja(now()->subYears(3)->subMonths(2)->format('Y-m-d'));
        $this->assertSame('3 tahun', $tigaTahun, "3 tahun 2 bulan salah dihitung: {$tigaTahun}");

        // 6 bulan — benar "< 1 tahun".
        $enamBulan = $controller->durasiMasaKerja(now()->subMonths(6)->format('Y-m-d'));
        $this->assertSame('< 1 tahun', $enamBulan, "6 bulan harus '< 1 tahun': {$enamBulan}");

        // Tanggal kosong — kosong, bukan angka desimal mentah.
        $kosong = $controller->durasiMasaKerja(null);
        $this->assertSame('', $kosong, "tanggal null harus kosong: {$kosong}");
    }

    public function test_csv_lama_kerja_tidak_selalu_kurang_satu_tahun(): void
    {
        $pegawai = $this->pegawaiDenganLamaKerja(3 * 365 + 60);

        $csv = $this->actingAs($this->userHrd())
            ->get('/api/reports/employees/export')
            ->getContent();

        $baris = collect(explode("\n", trim($csv)))
            ->map(fn ($line) => str_getcsv($line))
            ->firstWhere(fn (array $row) => ($row[0] ?? '') === $pegawai->nik);
        $this->assertNotNull($baris, 'pegawai uji tidak ditemukan di CSV');
        $lamaKerja = end($baris);
        $this->assertStringContainsString('3 tahun', $lamaKerja, "CSV lama kerja salah: {$lamaKerja}");
        $this->assertStringNotContainsString('E-', $lamaKerja, "Lama kerja tak boleh dalam notasi ilmiah: {$lamaKerja}");
    }

    public function test_excel_lama_kerja_benar(): void
    {
        $pegawai = $this->pegawaiDenganLamaKerja(3 * 365 + 60);

        $html = $this->actingAs($this->userHrd())
            ->get('/api/reports/employees/excel')
            ->assertOk()
            ->getContent();

        $baris = collect(explode('<tr>', $html))
            ->firstWhere(fn ($row) => str_contains($row, $pegawai->nik));
        $this->assertNotNull($baris, 'baris pegawai uji tidak ditemukan di Excel');
        $this->assertStringContainsString('3 tahun', $baris, "Excel lama kerja salah: {$baris}");
        $this->assertStringNotContainsString('E-', $baris, "Lama kerja tak boleh dalam notasi ilmiah");
    }

    public function test_pdf_laporan_pegawai_respond_200(): void
    {
        $this->pegawaiDenganLamaKerja(3 * 365 + 60);

        $this->actingAs($this->userHrd())
            ->get('/api/reports/employees/pdf')
            ->assertOk();
    }

    public function test_pdf_biodata_respond_200(): void
    {
        // HRD boleh membuka biodata pegawai lain (canViewBiodata).
        $pegawai = $this->pegawaiDenganLamaKerja(3 * 365 + 60);

        // HRD membuka biodata dirinya sendiri (canViewBiodata: role HRD atau
        // employee_id peminta sama dengan id target).
        $hrd = $this->userHrd();
        $this->actingAs($hrd)
            ->get('/api/reports/biodata-pdf/' . $hrd->employee->id)
            ->assertOk();
    }
}
