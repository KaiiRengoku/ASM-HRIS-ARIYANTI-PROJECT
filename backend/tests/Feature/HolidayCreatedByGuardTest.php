<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Holiday;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HolidayCreatedByGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_update_libur_abaikan_created_by(): void
    {
        $employee = Employee::create([
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
            'employee_id' => $employee->id,
        ]);
        $role = Role::create(['name' => 'HRD', 'code' => 'HRD']);
        $user->roles()->attach($role->id);

        $other = User::create([
            'nik' => '1234567890123456',
            'name' => 'Lain',
            'email' => 'lain@example.com',
            'password' => 'password',
        ]);

        $holiday = Holiday::create([
            'date' => '2026-12-25',
            'name' => 'Natal',
            'holiday_type' => 'NATIONAL',
            'is_active' => true,
            'created_by' => $user->id,
        ]);

        $this->actingAs($user)->putJson("/api/holidays/{$holiday->id}", [
            'date' => '2026-12-25',
            'name' => 'Natal Ubah',
            'holiday_type' => 'NATIONAL',
            'created_by' => $other->id,
        ])->assertOk();

        $this->assertDatabaseHas('holidays', ['id' => $holiday->id, 'name' => 'Natal Ubah', 'created_by' => $user->id]);
    }
}
