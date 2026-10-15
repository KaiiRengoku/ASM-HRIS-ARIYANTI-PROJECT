<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveBalanceTransaction;
use App\Models\LeaveType;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
 * Jalur penyesuaian saldo (HRD koreksi manual) sebelumnya hanya diuji di jalur 403.
 * Test ini mengunci perilaku uang: adjustment_days berubah, satu baris transaksi
 * ADJUSTMENT tercatat, dan satu baris audit dibuat.
 */
class LeaveBalanceAdjustTest extends TestCase
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
        $user->roles()->attach(Role::firstOrCreate(['code' => $roleCode], ['name' => $roleCode])->id);

        return $user;
    }

    public function test_adjust_mengubah_saldo_mencatat_transaksi_dan_audit(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');
        $type = LeaveType::create(['name' => 'Tahunan', 'code' => 'ANNUAL']);
        $year = (int) date('Y');

        $balance = LeaveBalance::create([
            'employee_id' => $hrd->employee_id,
            'leave_type_id' => $type->id,
            'period_year' => $year,
            'entitled_days' => 12,
            'adjustment_days' => 0,
            'used_days' => 0,
            'remaining_days' => 12,
        ]);

        $response = $this->actingAs($hrd)->postJson('/api/leave-balances/adjust', [
            'employee_id' => $hrd->employee_id,
            'leave_type_id' => $type->id,
            'amount' => 3,
            'reason' => 'Koreksi jasa',
            'year' => $year,
        ]);

        $response->assertOk()->assertJsonPath('success', true);
        $this->assertDatabaseHas('leave_balances', [
            'id' => $balance->id,
            'adjustment_days' => 3,
            'remaining_days' => 15,
        ]);
        $this->assertDatabaseHas('leave_balance_transactions', [
            'leave_balance_id' => $balance->id,
            'transaction_type' => 'ADJUSTMENT',
            'amount' => 3,
            'balance_before' => 12,
            'balance_after' => 15,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'ADJUST_LEAVE_BALANCE',
            'auditable_id' => $balance->id,
        ]);
        $this->assertSame(1, LeaveBalanceTransaction::count());
        $this->assertSame(1, AuditLog::where('action', 'ADJUST_LEAVE_BALANCE')->count());
    }

    public function test_adjust_membuat_baris_saldo_bila_belum_ada(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');
        $type = LeaveType::create(['name' => 'Tahunan', 'code' => 'ANNUAL']);

        $this->actingAs($hrd)->postJson('/api/leave-balances/adjust', [
            'employee_id' => $hrd->employee_id,
            'leave_type_id' => $type->id,
            'amount' => -2,
            'reason' => 'Potong kelebihan',
        ])->assertOk()->assertJsonPath('success', true);

        $balance = LeaveBalance::firstOrFail();
        // Saldo baru: adjustment_days = -2, remaining = entitled - 2.
        $this->assertEquals(-2, (float) $balance->adjustment_days);
        $this->assertEquals((float) $balance->entitled_days - 2, (float) $balance->remaining_days);
        $this->assertDatabaseHas('leave_balance_transactions', [
            'leave_balance_id' => $balance->id,
            'transaction_type' => 'ADJUSTMENT',
            'amount' => -2,
        ]);
    }
}
