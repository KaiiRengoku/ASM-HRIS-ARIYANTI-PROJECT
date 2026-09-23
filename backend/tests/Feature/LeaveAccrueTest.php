<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use App\Services\LeaveCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeaveAccrueTest extends TestCase
{
    use RefreshDatabase;

    private function buatUser(string $nik, ?string $roleCode = null, string $tglMasuk = '2018-01-15'): User
    {
        $employee = Employee::create([
            'nik' => $nik,
            'nama_lengkap' => 'User ' . $nik,
            'email' => 'user' . $nik . '@example.com',
            'tanggal_masuk_kerja' => $tglMasuk,
        ]);
        $user = User::create([
            'nik' => $nik,
            'name' => 'User ' . $nik,
            'email' => 'user' . $nik . '@example.com',
            'password' => 'password',
        ]);
        $user->employee_id = $employee->id;
        $user->save();
        if ($roleCode) {
            $role = Role::firstOrCreate(['code' => $roleCode], ['name' => $roleCode]);
            $user->roles()->attach($role->id);
        }

        return $user;
    }

    public function test_hrd_accrue_membuat_saldo_transaksi_dan_audit(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');
        \App\Models\LeaveType::create(['name' => 'Tahunan', 'code' => 'ANNUAL']);
        $year = (int) date('Y') + 1;

        $response = $this->actingAs($hrd)->postJson('/api/leave-balances/accrue', [
            'year' => $year,
            'employee_ids' => [$hrd->employee_id],
        ]);

        $response->assertOk()->assertJsonPath('success', true);
        $employee = Employee::find($hrd->employee_id);
        $expected = LeaveCalculationService::entitledDays($employee, $year);
        $this->assertDatabaseHas('leave_balances', [
            'employee_id' => $hrd->employee_id,
            'period_year' => $year,
            'entitled_days' => $expected,
            'used_days' => 0,
            'remaining_days' => $expected,
        ]);
        $this->assertDatabaseHas('leave_balance_transactions', ['transaction_type' => 'ACCRUAL']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'ACCRUE_LEAVE_BALANCE']);
    }

    public function test_accrue_ulang_masuk_skipped_tanpa_duplikat(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');
        \App\Models\LeaveType::create(['name' => 'Tahunan', 'code' => 'ANNUAL']);
        $year = (int) date('Y') + 1;
        $payload = ['year' => $year, 'employee_ids' => [$hrd->employee_id]];

        $this->actingAs($hrd)->postJson('/api/leave-balances/accrue', $payload)->assertOk();
        $response = $this->actingAs($hrd)->postJson('/api/leave-balances/accrue', $payload);

        $response->assertOk()->assertJsonPath('success', true);
        $this->assertCount(1, \App\Models\LeaveBalance::all());
        $this->assertNotEmpty($response->json('data.skipped'));
    }

    public function test_carry_over_tanpa_alasan_ditolak(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');
        \App\Models\LeaveType::create(['name' => 'Tahunan', 'code' => 'ANNUAL']);

        $this->actingAs($hrd)->postJson('/api/leave-balances/accrue', [
            'year' => (int) date('Y') + 1,
            'employee_ids' => [$hrd->employee_id],
            'carry_over' => true,
        ])->assertStatus(422);
    }

    public function test_carry_over_dengan_alasan_membawa_sisa_lalu(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');
        $annual = \App\Models\LeaveType::create(['name' => 'Tahunan', 'code' => 'ANNUAL']);
        $year = (int) date('Y') + 1;
        \App\Models\LeaveBalance::create([
            'employee_id' => $hrd->employee_id, 'leave_type_id' => $annual->id,
            'period_year' => $year - 1, 'entitled_days' => 12,
            'adjustment_days' => 0, 'used_days' => 0, 'remaining_days' => 5,
        ]);

        $response = $this->actingAs($hrd)->postJson('/api/leave-balances/accrue', [
            'year' => $year, 'employee_ids' => [$hrd->employee_id],
            'carry_over' => true, 'carry_reason' => 'Sisa 2025 terbawa',
        ]);

        $response->assertOk();
        $employee = Employee::find($hrd->employee_id);
        $expected = LeaveCalculationService::entitledDays($employee, $year) + 5;
        $this->assertDatabaseHas('leave_balances', [
            'employee_id' => $hrd->employee_id, 'period_year' => $year,
            'adjustment_days' => 5, 'remaining_days' => $expected,
        ]);
    }

    public function test_non_hrd_ditolak(): void
    {
        $peg = $this->buatUser('1234567890123456', 'PEG');
        \App\Models\LeaveType::create(['name' => 'Tahunan', 'code' => 'ANNUAL']);

        $this->actingAs($peg)->postJson('/api/leave-balances/accrue', [
            'year' => (int) date('Y') + 1,
        ])->assertForbidden();
    }
}
