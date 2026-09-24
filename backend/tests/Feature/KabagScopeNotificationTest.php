<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Notification;
use App\Models\OrganizationalUnit;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KabagScopeNotificationTest extends TestCase
{
    use RefreshDatabase;

    private function buatUser(string $nik, string $roleCode, ?int $unitId = null): User
    {
        $employee = Employee::create([
            'nik' => $nik, 'nama_lengkap' => 'U' . $nik,
            'email' => 'u' . $nik . '@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
            'organizational_unit_id' => $unitId,
        ]);
        $user = User::create([
            'nik' => $nik, 'name' => 'U' . $nik, 'email' => 'u' . $nik . '@example.com',
            'password' => 'password', 'employee_id' => $employee->id,
        ]);
        $user->roles()->attach(Role::firstOrCreate(['code' => $roleCode], ['name' => $roleCode])->id);

        return $user;
    }

    private function annualType(): LeaveType
    {
        return LeaveType::create([
            'name' => 'Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => false,
        ]);
    }

    private function pendingLeave(User $pemohon, LeaveType $type): LeaveRequest
    {
        return LeaveRequest::create([
            'employee_id' => $pemohon->employee_id,
            'leave_type_id' => $type->id,
            'start_date' => now()->addWeek()->toDateString(),
            'end_date' => now()->addWeek()->toDateString(),
            'total_days' => 1,
            'status' => 'Pending',
            'submitted_at' => now(),
            'created_by' => $pemohon->id,
        ]);
    }

    public function test_kabag_hanya_melihat_cuti_unit_sendiri(): void
    {
        $unitA = OrganizationalUnit::create(['name' => 'Unit A', 'code' => 'UA']);
        $unitB = OrganizationalUnit::create(['name' => 'Unit B', 'code' => 'UB']);
        $kabag = $this->buatUser('1234567890123456', 'KABAG', $unitA->id);
        $bawahan = $this->buatUser('1234567890123457', 'PEG', $unitA->id);
        $luar = $this->buatUser('1234567890123458', 'PEG', $unitB->id);

        $type = $this->annualType();
        $milikUnit = $this->pendingLeave($bawahan, $type);
        $luarUnit = $this->pendingLeave($luar, $type);

        $ids = array_column($this->actingAs($kabag)->getJson('/api/leaves')->assertOk()->json('data'), 'id');
        $this->assertContains($milikUnit->id, $ids);
        $this->assertNotContains($luarUnit->id, $ids);

        $this->actingAs($kabag)->getJson("/api/leaves/{$milikUnit->id}")->assertOk();
        $this->actingAs($kabag)->getJson("/api/leaves/{$luarUnit->id}")->assertForbidden();
    }

    public function test_kabag_tidak_bisa_setujui_cuti_luar_unit(): void
    {
        $unitA = OrganizationalUnit::create(['name' => 'Unit A', 'code' => 'UA']);
        $unitB = OrganizationalUnit::create(['name' => 'Unit B', 'code' => 'UB']);
        $kabag = $this->buatUser('1234567890123456', 'KABAG', $unitA->id);
        $luar = $this->buatUser('1234567890123457', 'PEG', $unitB->id);

        $leave = $this->pendingLeave($luar, $this->annualType());

        $this->actingAs($kabag)->postJson("/api/leaves/{$leave->id}/approve")->assertForbidden();
    }

    public function test_kabag_dapat_notifikasi_saat_ada_pengajuan_baru(): void
    {
        $unitA = OrganizationalUnit::create(['name' => 'Unit A', 'code' => 'UA']);
        $kabag = $this->buatUser('1234567890123456', 'KABAG', $unitA->id);
        $bawahan = $this->buatUser('1234567890123457', 'PEG', $unitA->id);
        $luarUnit = $this->buatUser('1234567890123458', 'PEG');

        $type = $this->annualType();

        $this->actingAs($bawahan)->postJson('/api/leaves', [
            'leave_type_id' => $type->id,
            'start_date' => now()->addWeek()->toDateString(),
            'end_date' => now()->addWeek()->toDateString(),
        ])->assertOk();

        $this->assertDatabaseHas('notifications', [
            'user_id' => $kabag->id, 'type' => 'leave_submitted',
        ]);

        // pengaju tanpa unit → fallback: semua kabag tetap terkabari
        $this->actingAs($luarUnit)->postJson('/api/leaves', [
            'leave_type_id' => $type->id,
            'start_date' => now()->addWeek()->toDateString(),
            'end_date' => now()->addWeek()->toDateString(),
        ])->assertOk();

        $this->assertSame(2, Notification::where('user_id', $kabag->id)->where('type', 'leave_submitted')->count());
    }

    public function test_pengajuan_oleh_kabag_tidak_notif_diri_sendiri(): void
    {
        $unitA = OrganizationalUnit::create(['name' => 'Unit A', 'code' => 'UA']);
        $kabag = $this->buatUser('1234567890123456', 'KABAG', $unitA->id);

        $type = $this->annualType();
        $this->actingAs($kabag)->postJson('/api/leaves', [
            'leave_type_id' => $type->id,
            'start_date' => now()->addWeek()->toDateString(),
            'end_date' => now()->addWeek()->toDateString(),
        ])->assertOk();

        $this->assertSame(0, Notification::where('user_id', $kabag->id)->where('type', 'leave_submitted')->count());
    }
}
