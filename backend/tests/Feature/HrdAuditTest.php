<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HrdAuditTest extends TestCase
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

    public function test_hrd_toggle_holiday_tercatat(): void
    {
        $hrd = $this->buatUser('1111111111111111', 'HRD');
        $holiday = Holiday::create([
            'date' => '2026-08-17',
            'name' => 'Hari Kemerdekaan',
            'holiday_type' => 'NATIONAL',
            'is_active' => true,
            'created_by' => $hrd->id,
        ]);

        $this->actingAs($hrd)->patchJson("/api/holidays/{$holiday->id}/toggle")->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $hrd->id,
            'action' => 'TOGGLE_HOLIDAY',
            'auditable_type' => Holiday::class,
            'auditable_id' => $holiday->id,
        ]);
    }

    public function test_hrd_export_pegawai_tercatat(): void
    {
        $hrd = $this->buatUser('1111111111111111', 'HRD');

        $this->actingAs($hrd)->get('/api/reports/employees/export')->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $hrd->id,
            'action' => 'EXPORT_REPORT',
        ]);
    }

    public function test_hrd_update_role_permissions_tercatat(): void
    {
        $hrd = $this->buatUser('1111111111111111', 'HRD');
        Role::firstOrCreate(['code' => 'PEG'], ['name' => 'PEG']);
        $role = Role::firstOrCreate(['code' => 'HRD'], ['name' => 'HRD']);

        $this->actingAs($hrd)->putJson('/api/role-permissions', [
            'roles' => [[
                'id' => $role->id,
                'can_create' => true,
                'can_read' => true,
                'can_update' => true,
                'can_delete' => false,
            ]],
        ])->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $hrd->id,
            'action' => 'UPDATE_ROLE_PERMISSIONS',
        ]);
    }

    public function test_peg_toggle_holiday_ditolak_tanpa_audit(): void
    {
        $hrd = $this->buatUser('1111111111111111', 'HRD');
        $peg = $this->buatUser('2222222222222222', 'PEG');
        $holiday = Holiday::create([
            'date' => '2026-08-17',
            'name' => 'Hari Kemerdekaan',
            'holiday_type' => 'NATIONAL',
            'is_active' => true,
            'created_by' => $hrd->id,
        ]);

        $before = AuditLog::count();

        $this->actingAs($peg)->patchJson("/api/holidays/{$holiday->id}/toggle")->assertForbidden();

        $this->assertSame($before, AuditLog::count());
    }
}
