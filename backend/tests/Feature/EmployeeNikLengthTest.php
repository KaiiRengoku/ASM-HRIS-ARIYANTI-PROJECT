<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * `nik` = Nomor Induk Kepegawaian (identifier login, hanya angka).
 * Aturan: tepat 9 digit. File ini mengunci perilaku tersebut.
 */
class EmployeeNikLengthTest extends TestCase
{
    use RefreshDatabase;

    private function buatHrd(): User
    {
        $employee = Employee::create([
            'nik' => '447199054',
            'nama_lengkap' => 'HRD Contoh',
            'email' => 'hrd@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);

        $user = User::create([
            'nik' => '447199054',
            'name' => 'HRD',
            'email' => 'hrd@example.com',
            'password' => 'password',
        ]);
        $user->employee_id = $employee->id;
        $user->save();

        $role = Role::firstOrCreate(['code' => 'HRD'], ['name' => 'HRD']);
        $user->roles()->attach($role->id);

        return $user;
    }

    private function buatUserLogin(string $nik): User
    {
        return User::create([
            'nik' => $nik,
            'name' => 'User ' . $nik,
            'email' => 'user' . $nik . '@example.com',
            'password' => Hash::make('password'),
        ]);
    }

    public function test_login_dengan_nik_9_digit_berhasil(): void
    {
        $this->buatUserLogin('447199054');

        $this->postJson('/api/login', ['nik' => '447199054', 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.nik', '447199054');
    }

    public function test_login_nik_kurang_dari_9_digit_ditolak(): void
    {
        $this->postJson('/api/login', ['nik' => '12345', 'password' => 'password'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nik');
    }

    public function test_login_nik_lebih_dari_9_digit_ditolak(): void
    {
        $this->postJson('/api/login', ['nik' => str_repeat('9', 10), 'password' => 'password'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nik');
    }

    public function test_login_nik_non_angka_ditolak(): void
    {
        $this->postJson('/api/login', ['nik' => '44719A054', 'password' => 'password'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nik');
    }

    public function test_login_nik_8_digit_ditolak(): void
    {
        $this->postJson('/api/login', ['nik' => '12345678', 'password' => 'password'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nik');
    }

    public function test_login_nik_10_digit_ditolak(): void
    {
        $this->postJson('/api/login', ['nik' => '1234567890', 'password' => 'password'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nik');
    }

    public function test_store_employee_nik_9_digit_diterima(): void
    {
        $hrd = $this->buatHrd();

        $this->actingAs($hrd)->postJson('/api/employees', [
            'nik' => '555666777',
            'nama_lengkap' => 'Pegawai Baru',
            'email' => 'baru@example.com',
            'password' => 'password123',
            'role' => 'PEGAWAI',
            'tanggal_masuk_kerja' => '2024-01-10',
        ])->assertStatus(201);

        $this->assertDatabaseHas('employees', ['nik' => '555666777']);
    }

    public function test_forgot_password_nik_9_digit_diterima(): void
    {
        $this->buatUserLogin('447199054');

        $this->postJson('/api/forgot-password', ['nik' => '447199054'])
            ->assertOk();
    }

    public function test_forgot_password_nik_non_angka_ditolak(): void
    {
        $this->postJson('/api/forgot-password', ['nik' => '44719A054'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('nik');
    }
}
