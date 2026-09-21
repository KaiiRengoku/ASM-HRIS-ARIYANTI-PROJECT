<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileEducationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->employee = Employee::create([
            'nik' => '1234567890123456',
            'nama_lengkap' => 'Dosen Contoh',
            'email' => 'dosen@example.com',
            'jenis_pegawai' => 'Dosen',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);

        $this->user = User::create([
            'nik' => '1234567890123456',
            'name' => 'User Dosen',
            'email' => 'userdosen@example.com',
            'password' => 'password',
        ]);
        $this->user->employee_id = $this->employee->id;
        $this->user->save();
    }

    public function test_user_saves_all_three_education_levels(): void
    {
        $response = $this->actingAs($this->user)->putJson('/api/profile/education', [
            'pendidikan' => [
                ['jenjang' => 'S1', 'nama_pt' => 'Universitas A', 'jurusan' => 'Informatika', 'tahun_masuk' => 2010, 'tahun_lulus' => 2014],
                ['jenjang' => 'S2', 'nama_pt' => 'Universitas B', 'jurusan' => 'Sistem Informasi', 'tahun_masuk' => 2015, 'tahun_lulus' => 2017],
                ['jenjang' => 'S3', 'nama_pt' => null, 'jurusan' => null, 'tahun_masuk' => null, 'tahun_lulus' => null],
            ],
            'sertifikasi' => 'Sertifikasi Dosen 2020',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('employee_educations', ['employee_id' => $this->employee->id, 'jenjang' => 'S1', 'nama_pt' => 'Universitas A']);
    }
}
