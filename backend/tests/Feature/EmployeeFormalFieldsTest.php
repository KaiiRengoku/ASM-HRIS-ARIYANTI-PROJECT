<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeFormalFieldsTest extends TestCase
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

        $role = Role::create(['name' => 'HRD', 'code' => 'HRD']);
        $user->roles()->attach($role->id);

        $this->hrdUser = $user;
    }

    public function test_hrd_creates_employee_with_formal_identity_fields(): void
    {
        \App\Models\Role::firstOrCreate(['code' => 'PEG'], ['name' => 'Dosen & Pegawai']);
        $response = $this->actingAs($this->hrdUser)->postJson('/api/employees', [
            'nik' => '1234567890123456',
            'nama_lengkap' => 'Dosen Contoh',
            'email' => 'dosen@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
            'password' => 'password123',
            'role' => 'PEG',
            'gelar_depan' => 'Dr.',
            'gelar_belakang' => 'M.Kom.',
            'tempat_lahir' => 'Jakarta',
            'agama' => 'Islam',
            'status_pernikahan' => 'Kawin',
            'alamat_ktp' => 'Jl. KTP 1',
            'alamat_domisili' => 'Jl. Domisili 2',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('employees', ['nik' => '1234567890123456', 'gelar_depan' => 'Dr.']);
        $response->assertJsonPath('data.gelar_depan', 'Dr.');
        $response->assertJsonPath('data.gelar_belakang', 'M.Kom.');
        $response->assertJsonPath('data.tempat_lahir', 'Jakarta');
        $response->assertJsonPath('data.agama', 'Islam');
        $response->assertJsonPath('data.status_pernikahan', 'Kawin');
        $response->assertJsonPath('data.alamat_ktp', 'Jl. KTP 1');
        $response->assertJsonPath('data.alamat_domisili', 'Jl. Domisili 2');
    }

    public function test_hrd_updates_employee_with_linked_account_keeps_email(): void
    {
        $employee = Employee::create([
            'nik' => '1234567890123412',
            'nama_lengkap' => 'Pegawai Akun',
            'email' => 'akun@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);
        $user = User::create([
            'nik' => '1234567890123412',
            'name' => 'Pegawai Akun',
            'email' => 'akun@example.com',
            'password' => 'password',
        ]);
        $user->employee_id = $employee->id;
        $user->save();
        $employee->user_id = $user->id;
        $employee->save();

        $response = $this->actingAs($this->hrdUser)->putJson("/api/employees/{$employee->id}", [
            'nik' => '1234567890123412',
            'nama_lengkap' => 'Pegawai Akun',
            'email' => 'akun@example.com',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('users', ['id' => $user->id, 'email' => 'akun@example.com']);
    }

    public function test_hrd_updates_employee_with_formal_identity_fields(): void
    {
        $employee = Employee::create([
            'nik' => '1234567890123411',
            'nama_lengkap' => 'Pegawai Lama',
            'email' => 'lama@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);

        $response = $this->actingAs($this->hrdUser)->putJson("/api/employees/{$employee->id}", [
            'nik' => '1234567890123411',
            'nama_lengkap' => 'Pegawai Lama',
            'email' => 'lama@example.com',
            'gelar_depan' => 'Hj.',
            'gelar_belakang' => 'S.E.',
            'tempat_lahir' => 'Bandung',
            'agama' => 'Islam',
            'status_pernikahan' => 'Belum Kawin',
            'alamat_ktp' => 'Jl. KTP 9',
            'alamat_domisili' => 'Jl. Domisili 9',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('employees', ['id' => $employee->id, 'gelar_depan' => 'Hj.', 'tempat_lahir' => 'Bandung']);
        $response->assertJsonPath('data.gelar_depan', 'Hj.');
        $response->assertJsonPath('data.alamat_domisili', 'Jl. Domisili 9');
    }
}
