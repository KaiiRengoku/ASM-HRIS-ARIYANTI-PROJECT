<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IsDosenFlagTest extends TestCase
{
    use RefreshDatabase;

    private function pdUser(string $nik, string $roleCode): User
    {
        $employee = Employee::create([
            'nik' => $nik,
            'nama_lengkap' => 'PD ' . $nik,
            'email' => 'pd' . $nik . '@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);
        $user = User::create([
            'nik' => $nik,
            'name' => 'PD ' . $nik,
            'email' => 'pd' . $nik . '@example.com',
            'password' => 'password',
            'employee_id' => $employee->id,
        ]);
        $role = Role::firstOrCreate(['code' => $roleCode], ['name' => $roleCode]);
        $user->roles()->attach($role->id);

        return $user;
    }

    public function test_pegawai_flag_dosen_terhitung_di_pd_stats(): void
    {
        $pd = $this->pdUser('1234567890123456', 'PD_I');
        Employee::create([
            'nik' => '1234567890123457',
            'nama_lengkap' => 'Dosen A',
            'email' => 'dosena@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
            'is_dosen' => true,
        ]);
        Employee::create([
            'nik' => '1234567890123458',
            'nama_lengkap' => 'Staf B',
            'email' => 'stafb@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
            'is_dosen' => false,
        ]);

        $this->actingAs($pd)->getJson('/api/dashboard/stats')
            ->assertOk()->assertJsonPath('data.total_dosen', 1);
    }
}
