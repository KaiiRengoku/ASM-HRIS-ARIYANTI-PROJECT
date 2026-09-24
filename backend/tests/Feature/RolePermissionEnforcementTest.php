<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RolePermissionEnforcementTest extends TestCase
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

    public function test_seeder_assigns_peg_permissions_but_not_employee_view(): void
    {
        $codes = Role::where('code', 'PEG')->first()->permissions()->pluck('code')->all();

        $this->assertContains('leave.create', $codes);
        $this->assertNotContains('employee.view', $codes);
    }

    public function test_revoke_leave_view_blocks_peg_from_leaves(): void
    {
        $pegRole = Role::where('code', 'PEG')->first();
        $pegRole->permissions()->detach(Permission::where('code', 'leave.view')->first());

        $peg = $this->buatUser('1111111111111111', 'PEG');

        $this->actingAs($peg)->getJson('/api/leaves')->assertForbidden();
    }

    public function test_revoke_employee_view_blocks_direktur_from_employees(): void
    {
        $dirRole = Role::where('code', 'DIREKTUR')->first();
        $dirRole->permissions()->detach(Permission::where('code', 'employee.view')->first());

        $dir = $this->buatUser('2222222222222222', 'DIREKTUR');

        $this->actingAs($dir)->getJson('/api/employees')->assertForbidden();
    }

    public function test_revoke_leave_approve_blocks_kabag(): void
    {
        $kabagRole = Role::where('code', 'KABAG')->first();
        $kabagRole->permissions()->detach(Permission::where('code', 'leave.approve')->first());

        $type = \App\Models\LeaveType::create([
            'name' => 'Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => false,
        ]);
        $peg = $this->buatUser('3333333333333333', 'PEG');
        $kabag = $this->buatUser('3333333333333334', 'KABAG');
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

        $this->actingAs($kabag)->postJson("/api/leaves/{$leave->id}/approve")->assertForbidden();
    }

    public function test_self_lockout_guard_blocks_request(): void
    {
        $hrd = $this->buatUser('4444444444444444', 'HRD');
        $hrdRole = Role::where('code', 'HRD')->first();
        $roleManage = Permission::where('code', 'auth.role.manage')->first();

        $newPerms = $hrdRole->permissions()
            ->pluck('permissions.id')
            ->filter(fn ($id) => (int) $id !== (int) $roleManage->id)
            ->values()
            ->all();

        $this->actingAs($hrd)->putJson('/api/role-permissions', [
            'roles' => [['id' => $hrdRole->id, 'permissions' => $newPerms]],
        ])->assertStatus(400);

        $this->assertSame(
            1,
            $hrdRole->permissions()->where('permission_id', $roleManage->id)->count()
        );
    }

    public function test_unpermissioned_route_stays_accessible(): void
    {
        $peg = $this->buatUser('5555555555555555', 'PEG');

        $this->actingAs($peg)->getJson('/api/leave-types')->assertOk();
    }

    public function test_non_hrd_cannot_access_audit_logs(): void
    {
        $peg = $this->buatUser('6666666666666666', 'PEG');

        $this->actingAs($peg)->getJson('/api/audit-logs')->assertForbidden();
    }

    public function test_hrd_with_defaults_can_access_audit_logs(): void
    {
        $hrd = $this->buatUser('7777777777777777', 'HRD');

        $this->actingAs($hrd)->getJson('/api/audit-logs')->assertOk();
    }
}