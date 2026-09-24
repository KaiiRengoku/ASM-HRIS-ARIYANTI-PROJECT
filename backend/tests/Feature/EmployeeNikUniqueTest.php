<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeNikUniqueTest extends TestCase
{
    use RefreshDatabase;

    private User $hrdUser;

    protected function setUp(): void
    {
        parent::setUp();

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
        ]);
        $user->employee_id = $employee->id;
        $user->save();

        $role = Role::firstOrCreate(['code' => 'HRD'], ['name' => 'HRD']);
        $user->roles()->attach($role->id);

        $this->hrdUser = $user;
    }

    public function test_update_nik_duplikat_users_ditolak(): void
    {
        $target = Employee::create([
            'nik' => '1234567890123456',
            'nama_lengkap' => 'Target',
            'email' => 'target@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);
        User::create([
            'nik' => '8888888888888888',
            'name' => 'Yatim',
            'email' => 'yatim@example.com',
            'password' => 'password',
        ]);

        $this->actingAs($this->hrdUser)->putJson("/api/employees/{$target->id}", [
            'nik' => '8888888888888888',
            'nama_lengkap' => 'Target',
            'email' => 'target@example.com',
        ])->assertStatus(422);
    }

    public function test_update_nik_milik_sendiri_lolos(): void
    {
        $target = Employee::create([
            'nik' => '1234567890123456',
            'nama_lengkap' => 'Target',
            'email' => 'target@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);
        $user = User::create([
            'nik' => '1234567890123456',
            'name' => 'Target',
            'email' => 'target@example.com',
            'password' => 'password',
            'employee_id' => $target->id,
        ]);
        $target->user_id = $user->id;
        $target->save();

        $this->actingAs($this->hrdUser)->putJson("/api/employees/{$target->id}", [
            'nik' => '1234567890123456',
            'nama_lengkap' => 'Target Ubah',
            'email' => 'target@example.com',
        ])->assertOk();
    }
}
