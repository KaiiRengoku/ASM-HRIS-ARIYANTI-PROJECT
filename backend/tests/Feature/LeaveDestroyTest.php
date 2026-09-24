<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveBalanceTransaction;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeaveDestroyTest extends TestCase
{
    use RefreshDatabase;

    private User $hrdUser;

    private Employee $pegEmployee;

    private LeaveType $annualType;

    protected function setUp(): void
    {
        parent::setUp();

        $hrdEmp = Employee::create([
            'nik' => '1234567890123457',
            'nama_lengkap' => 'HRD Contoh',
            'email' => 'hrd@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);
        $user = User::create([
            'nik' => '1234567890123457',
            'name' => 'HRD',
            'email' => 'hrd@example.com',
            'password' => 'password',
            'employee_id' => $hrdEmp->id,
        ]);
        $role = Role::firstOrCreate(['code' => 'HRD'], ['name' => 'HRD']);
        $user->roles()->attach($role->id);
        $this->hrdUser = $user;

        $this->pegEmployee = Employee::create([
            'nik' => '1234567890123456',
            'nama_lengkap' => 'Pegawai Contoh',
            'email' => 'pegawai@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);

        $this->annualType = LeaveType::create([
            'code' => 'ANNUAL',
            'name' => 'Cuti Tahunan',
            'is_leave_balance_deducted' => true,
            'requires_attachment' => false,
            'requires_medical_certificate' => false,
            'is_active' => true,
        ]);
    }

    private function buatLeave(string $status = 'Pending'): LeaveRequest
    {
        return LeaveRequest::create([
            'employee_id' => $this->pegEmployee->id,
            'leave_type_id' => $this->annualType->id,
            'start_date' => now()->addWeek()->toDateString(),
            'end_date' => now()->addWeek()->toDateString(),
            'total_days' => 1,
            'status' => $status,
            'submitted_at' => now(),
            'created_by' => $this->hrdUser->id,
        ]);
    }

    public function test_hrd_hapus_pending_tanpa_ubah_saldo(): void
    {
        $leave = $this->buatLeave('Pending');

        $this->actingAs($this->hrdUser)->deleteJson("/api/leaves/{$leave->id}", [
            'reason' => 'Data ganda.',
        ])->assertOk()->assertJsonPath('success', true);

        $this->assertDatabaseMissing('leave_requests', ['id' => $leave->id]);
    }

    public function test_hrd_hapus_final_kembalikan_saldo(): void
    {
        $balance = LeaveBalance::create([
            'employee_id' => $this->pegEmployee->id,
            'leave_type_id' => $this->annualType->id,
            'period_year' => (int) date('Y'),
            'entitled_days' => 12,
            'adjustment_days' => 0,
            'used_days' => 2,
            'remaining_days' => 10,
        ]);
        $leave = $this->buatLeave('Disetujui HRD');
        LeaveBalanceTransaction::create([
            'leave_balance_id' => $balance->id,
            'employee_id' => $this->pegEmployee->id,
            'leave_request_id' => $leave->id,
            'transaction_type' => 'DEDUCT',
            'amount' => -2,
            'balance_before' => 12,
            'balance_after' => 10,
            'reason' => 'Cuti disetujui HRD',
            'created_by' => $this->hrdUser->id,
        ]);

        $this->actingAs($this->hrdUser)->deleteJson("/api/leaves/{$leave->id}", [
            'reason' => 'Kesalahan input.',
        ])->assertOk();

        $this->assertDatabaseMissing('leave_requests', ['id' => $leave->id]);
        $this->assertDatabaseHas('leave_balances', [
            'id' => $balance->id,
            'used_days' => 1,
            'remaining_days' => 11,
        ]);
    }

    public function test_hapus_tanpa_alasan_ditolak(): void
    {
        $leave = $this->buatLeave('Pending');

        $this->actingAs($this->hrdUser)->deleteJson("/api/leaves/{$leave->id}", [])
            ->assertStatus(422);

        $this->assertDatabaseHas('leave_requests', ['id' => $leave->id]);
    }

    public function test_non_hrd_ditolak_hapus_cuti(): void
    {
        $peg = User::create([
            'nik' => '1234567890123458',
            'name' => 'Pegawai',
            'email' => 'peg2@example.com',
            'password' => 'password',
            'employee_id' => $this->pegEmployee->id,
        ]);
        $leave = $this->buatLeave('Pending');

        $this->actingAs($peg)->deleteJson("/api/leaves/{$leave->id}", [
            'reason' => 'Coba hapus.',
        ])->assertForbidden();
    }
}
