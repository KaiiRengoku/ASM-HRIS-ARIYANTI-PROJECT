<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeaveRecapTest extends TestCase
{
    use RefreshDatabase;

    private function buatUser(string $nik, string $roleCode): User
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
        $role = Role::firstOrCreate(['code' => $roleCode], ['name' => $roleCode]);
        $user->roles()->attach($role->id);

        return $user;
    }

    public function test_direktur_melihat_rekap_sisa_cuti_per_pegawai(): void
    {
        $direktur = $this->buatUser('1234567890123456', 'DIREKTUR');
        $staf = $this->buatUser('1234567890123457', 'PEG');

        $annual = LeaveType::create([
            'name' => 'Cuti Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => true,
        ]);
        LeaveBalance::create([
            'employee_id' => $staf->employee_id,
            'leave_type_id' => $annual->id,
            'period_year' => 2026,
            'entitled_days' => 12,
            'adjustment_days' => 2,
            'used_days' => 3,
            'remaining_days' => 11,
        ]);

        $res = $this->actingAs($direktur)->getJson('/api/reports/leaves/recap?year=2026');

        $res->assertOk()->assertJsonPath('success', true);
        $row = collect($res->json('data'))->firstWhere('employee_id', $staf->employee_id);
        $this->assertNotNull($row);
        $this->assertSame('1234567890123457', $row['nik']);
        $this->assertEquals(12, $row['entitled_days']);
        $this->assertEquals(11, $row['remaining_days']);
    }

    public function test_pegawai_tidak_boleh_akses_rekap(): void
    {
        $peg = $this->buatUser('1234567890123456', 'PEG');

        $this->actingAs($peg)->getJson('/api/reports/leaves/recap?year=2026')->assertForbidden();
    }
}