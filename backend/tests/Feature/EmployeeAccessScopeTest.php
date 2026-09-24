<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeAccessScopeTest extends TestCase
{
    use RefreshDatabase;

    private function buatUser(string $nik, ?string $roleCode = null): User
    {
        $employee = Employee::create([
            'nik' => $nik,
            'nama_lengkap' => 'User ' . $nik,
            'email' => 'user' . $nik . '@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);
        $user = User::create([
            'nik' => $nik,
            'name' => 'User ' . $nik,
            'email' => 'user' . $nik . '@example.com',
            'password' => 'password',
            'employee_id' => $employee->id,
        ]);
        if ($roleCode) {
            $role = Role::firstOrCreate(['code' => $roleCode], ['name' => $roleCode]);
            $user->roles()->attach($role->id);
        }

        return $user;
    }

    public function test_kabag_dan_peg_ditolak_di_list_pegawai(): void
    {
        $kabag = $this->buatUser('1234567890123456', 'KABAG');
        $peg = $this->buatUser('1234567890123457', 'PEG');

        $this->actingAs($kabag)->getJson('/api/employees')->assertForbidden();
        $this->actingAs($peg)->getJson('/api/employees')->assertForbidden();
    }

    public function test_kabag_dan_peg_ditolak_di_detail_pegawai(): void
    {
        $kabag = $this->buatUser('1234567890123456', 'KABAG');
        $peg = $this->buatUser('1234567890123457', 'PEG');

        $this->actingAs($kabag)->getJson("/api/employees/{$kabag->employee_id}")->assertForbidden();
        $this->actingAs($peg)->getJson("/api/employees/{$peg->employee_id}")->assertForbidden();
    }

    public function test_pimpinan_tetap_bisa_akses_list_dan_detail(): void
    {
        foreach (['HRD', 'DIREKTUR', 'PD_I', 'PD_II', 'PD_III'] as $i => $role) {
            $nik = '1234567890123' . str_pad((string) (100 + $i), 3, '0', STR_PAD_LEFT);
            $user = $this->buatUser($nik, $role);
            $this->actingAs($user)->getJson('/api/employees')->assertOk();
            $this->actingAs($user)->getJson("/api/employees/{$user->employee_id}")->assertOk();
        }
    }
}
