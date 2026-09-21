<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BiodataSectionsTest extends TestCase
{
    use RefreshDatabase;

    private User $hrdUser;

    private Employee $lecturer;

    private Employee $staf;

    protected function setUp(): void
    {
        parent::setUp();

        $this->lecturer = Employee::create([
            'nik' => '1234567890123456',
            'nama_lengkap' => 'Dosen Contoh',
            'email' => 'dosen@example.com',
            'jenis_pegawai' => 'Dosen',
            'tanggal_masuk_kerja' => '2020-01-15',
            'tempat_lahir' => 'Jakarta',
            'alamat_domisili' => 'Jl. Domisili 2',
            'nip' => '123456789',
            'nidn' => '1234567890',
        ]);
        $this->lecturer->educations()->create([
            'jenjang' => 'S1',
            'nama_pt' => 'Universitas A',
            'jurusan' => 'Informatika',
            'tahun_masuk' => 2010,
            'tahun_lulus' => 2014,
        ]);
        $this->lecturer->functional()->create([
            'jabatan_fungsional' => 'Lektor',
            'pangkat' => 'Penata',
            'riwayat_penelitian_pengabdian' => 'Penelitian A',
        ]);
        $this->lecturer->teachingAssignments()->create([
            'kode_matkul' => 'IF101',
            'nama_matkul' => 'Pemrograman Web',
        ]);

        $this->staf = Employee::create([
            'nik' => '1234567890123457',
            'nama_lengkap' => 'Staf Contoh',
            'email' => 'staf@example.com',
            'jenis_pegawai' => 'Staf',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);

        $this->hrdUser = User::create([
            'nik' => '1234567890123457',
            'name' => 'HRD',
            'email' => 'hrd@example.com',
            'password' => 'password',
        ]);
        $this->hrdUser->employee_id = $this->staf->id;
        $this->hrdUser->save();
        $role = Role::firstOrCreate(['code' => 'HRD'], ['name' => 'HRD']);
        $this->hrdUser->roles()->attach($role->id);
    }

    public function test_biodata_word_dosen_memuat_pendidikan_dan_tanda_tangan(): void
    {
        $response = $this->actingAs($this->hrdUser)->get("/api/reports/biodata-word/{$this->lecturer->id}");

        $response->assertOk();
        $response->assertSee('DATA PENDIDIKAN', false);
        $response->assertSee('Universitas A', false);
        $response->assertSee('RIWAYAT PENELITIAN', false);
        $response->assertSee('Dosen Contoh', false);
        $response->assertSee('123456789', false);
    }

    public function test_biodata_word_staf_menyembunyikan_bagian_dosen(): void
    {
        $response = $this->actingAs($this->hrdUser)->get("/api/reports/biodata-word/{$this->staf->id}");

        $response->assertOk();
        $response->assertSee('DATA PENDIDIKAN', false);
        $response->assertDontSee('RIWAYAT PENELITIAN', false);
        $response->assertDontSee('PERNYATAAN', false);
    }

    public function test_biodata_pdf_dosen_ok(): void
    {
        $response = $this->actingAs($this->hrdUser)->get("/api/reports/biodata-pdf/{$this->lecturer->id}");

        $response->assertOk();
    }
}
