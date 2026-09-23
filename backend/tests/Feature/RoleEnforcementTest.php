<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleEnforcementTest extends TestCase
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
        ]);
        $user->employee_id = $employee->id;
        $user->save();
        if ($roleCode) {
            $role = Role::firstOrCreate(['code' => $roleCode], ['name' => $roleCode]);
            $user->roles()->attach($role->id);
        }

        return $user;
    }

    public function test_non_hrd_ditolak_di_endpoint_terkunci(): void
    {
        $peg = $this->buatUser('1234567890123456', 'PEG');

        $this->actingAs($peg)->putJson("/api/employees/{$peg->employee_id}/account", ['role' => 'PEG'])->assertForbidden();
        $this->actingAs($peg)->deleteJson("/api/employees/{$peg->employee_id}/account")->assertForbidden();
        $this->actingAs($peg)->getJson('/api/role-permissions')->assertForbidden();
        $this->actingAs($peg)->getJson('/api/audit-logs')->assertForbidden();
        $this->actingAs($peg)->postJson('/api/leave-balances/adjust', [])->assertForbidden();
        $this->actingAs($peg)->getJson('/api/reports/employees/export')->assertForbidden();
    }

    public function test_non_hrd_hanya_melihat_cuti_milik_sendiri(): void
    {
        $peg = $this->buatUser('1234567890123456', 'PEG');
        $other = $this->buatUser('1234567890123457', 'PEG');

        $type = \App\Models\LeaveType::create([
            'name' => 'Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => false,
        ]);
        $leave = \App\Models\LeaveRequest::create([
            'employee_id' => $other->employee_id,
            'leave_type_id' => $type->id,
            'start_date' => now()->addWeek()->toDateString(),
            'end_date' => now()->addWeek()->toDateString(),
            'total_days' => 1,
            'status' => 'Pending',
            'submitted_at' => now(),
            'created_by' => $other->id,
        ]);

        $this->actingAs($peg)->getJson("/api/leaves/{$leave->id}")->assertForbidden();
        $this->actingAs($peg)->getJson('/api/leaves')->assertOk()->assertJsonMissing(['id' => $leave->id]);
    }

    public function test_hrd_tetap_bisa_akses_endpoint_terkunci(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');

        $this->actingAs($hrd)->getJson('/api/audit-logs')->assertOk();
        $this->actingAs($hrd)->putJson("/api/employees/{$hrd->employee_id}/account", ['role' => 'HRD'])->assertOk();
    }

    public function test_hrd_tambah_pegawai_otomatis_buat_akun(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');
        \App\Models\Role::firstOrCreate(['code' => 'PEG'], ['name' => 'Dosen & Pegawai']);

        $response = $this->actingAs($hrd)->postJson('/api/employees', [
            'nik' => '1234567890123457',
            'nama_lengkap' => 'Pegawai Baru',
            'email' => 'baru@example.com',
            'tanggal_masuk_kerja' => '2024-01-15',
            'password' => 'password123',
            'role' => 'PEG',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('users', ['nik' => '1234567890123457']);
        $response->assertJsonPath('data.has_account', true);
        $response->assertJsonPath('data.account.role', 'PEG');
    }

    public function test_hrd_hapus_akun_permanen_data_pegawai_utuh(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');
        $peg = $this->buatUser('1234567890123457', 'PEG');

        $this->actingAs($hrd)->deleteJson("/api/employees/{$peg->employee_id}/account")->assertOk();
        $this->assertDatabaseMissing('users', ['nik' => '1234567890123457']);
        $this->assertDatabaseHas('employees', ['nik' => '1234567890123457']);
    }

    public function test_approve_reject_hanya_kabag_dan_hrd(): void
    {
        $peg = $this->buatUser('1234567890123456', 'PEG');
        $kabag = $this->buatUser('1234567890123457', 'KABAG');

        $type = \App\Models\LeaveType::create([
            'name' => 'Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => false,
        ]);
        $leave = \App\Models\LeaveRequest::create([
            'employee_id' => $peg->employee_id,
            'leave_type_id' => $type->id,
            'start_date' => now()->addWeek()->toDateString(),
            'end_date' => now()->addWeek()->toDateString(),
            'total_days' => 1,
            'status' => 'Pending',
            'submitted_at' => now(),
            'created_by' => $peg->id,
        ]);

        $this->actingAs($peg)->postJson("/api/leaves/{$leave->id}/approve")->assertForbidden();
        $this->actingAs($peg)->postJson("/api/leaves/{$leave->id}/reject", ['reason' => 'x'])->assertForbidden();
        $this->actingAs($kabag)->postJson("/api/leaves/{$leave->id}/approve")->assertOk();
    }

    public function test_level_filter_memisahkan_antrean(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');

        $type = \App\Models\LeaveType::create([
            'name' => 'Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => false,
        ]);
        $pending = \App\Models\LeaveRequest::create([
            'employee_id' => $hrd->employee_id,
            'leave_type_id' => $type->id,
            'start_date' => now()->addWeek()->toDateString(),
            'end_date' => now()->addWeek()->toDateString(),
            'total_days' => 1,
            'status' => 'Pending',
            'submitted_at' => now(),
            'created_by' => $hrd->id,
        ]);
        $kabagOk = \App\Models\LeaveRequest::create([
            'employee_id' => $hrd->employee_id,
            'leave_type_id' => $type->id,
            'start_date' => now()->addWeek()->toDateString(),
            'end_date' => now()->addWeek()->toDateString(),
            'total_days' => 1,
            'status' => 'Disetujui Kepala Bagian',
            'submitted_at' => now(),
            'created_by' => $hrd->id,
        ]);

        $l1 = $this->actingAs($hrd)->getJson('/api/leaves?level=1')->assertOk()->json('data');
        $l2 = $this->actingAs($hrd)->getJson('/api/leaves?level=2')->assertOk()->json('data');

        $this->assertContains($pending->id, array_column($l1, 'id'));
        $this->assertNotContains($kabagOk->id, array_column($l1, 'id'));
        $this->assertContains($kabagOk->id, array_column($l2, 'id'));
        $this->assertNotContains($pending->id, array_column($l2, 'id'));
    }
}
