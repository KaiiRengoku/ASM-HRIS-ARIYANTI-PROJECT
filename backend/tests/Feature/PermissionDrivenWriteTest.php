<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class PermissionDrivenWriteTest extends TestCase
{
    use RefreshDatabase;

    private function buatUser(string $nik, string $roleCode): User
    {
        $employee = Employee::create([
            'nik' => $nik, 'nama_lengkap' => 'U' . $nik,
            'email' => 'u' . $nik . '@example.com', 'tanggal_masuk_kerja' => '2020-01-15',
        ]);
        $user = User::create([
            'nik' => $nik, 'name' => 'U' . $nik, 'email' => 'u' . $nik . '@example.com',
            'password' => 'password', 'employee_id' => $employee->id,
        ]);
        $user->roles()->attach(Role::firstOrCreate(['code' => $roleCode], ['name' => $roleCode])->id);

        return $user;
    }

    public function test_direktur_dengan_permission_bisa_membuat_pegawai(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');
        $dir = $this->buatUser('1234567890123457', 'DIREKTUR');

        // default tanpa employee.create → 403
        $this->actingAs($dir)->postJson('/api/employees', [
            'nik' => '1234567890123458', 'nama_lengkap' => 'Baru',
            'email' => 'baru@example.com', 'password' => 'password123',
            'role' => 'PEG', 'tanggal_masuk_kerja' => '2024-01-01',
        ])->assertForbidden();

        // HRD grant permission ke role DIREKTUR
        $dirRole = Role::where('code', 'DIREKTUR')->first();
        $dirRole->permissions()->attach(Permission::where('code', 'employee.create')->first());

        $this->actingAs($dir)->postJson('/api/employees', [
            'nik' => '1234567890123458', 'nama_lengkap' => 'Baru',
            'email' => 'baru@example.com', 'password' => 'password123',
            'role' => 'PEG', 'tanggal_masuk_kerja' => '2024-01-01',
        ])->assertCreated();
    }

    public function test_simpan_hak_access_merevoke_token_anggota_role_tapi_bukan_pemanggil(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');
        $dir = $this->buatUser('1234567890123457', 'DIREKTUR');

        $hrdToken = $hrd->createToken('t')->plainTextToken;
        $dirToken = $dir->createToken('t')->plainTextToken;

        $dirRole = Role::where('code', 'DIREKTUR')->first();
        $permIds = $dirRole->permissions()->pluck('permissions.id')->all();

        $this->withToken($hrdToken)->putJson('/api/role-permissions', [
            'roles' => [['id' => $dirRole->id, 'permissions' => $permIds]],
        ])->assertOk();

        // token direktur hilang (permission row berubah? tidak — sama persis → tidak revoke)
        $this->assertNotNull(PersonalAccessToken::findToken(explode('|', $dirToken)[1]));

        // sekarang hapus satu permission → berubah → token direktur di-revoke
        $this->withToken($hrdToken)->putJson('/api/role-permissions', [
            'roles' => [['id' => $dirRole->id, 'permissions' => array_slice($permIds, 0, -1)]],
        ])->assertOk();

        $this->assertNull(PersonalAccessToken::findToken(explode('|', $dirToken)[1]));
        // token HRD (pemanggil) tetap hidup
        $this->withToken($hrdToken)->getJson('/api/user')->assertOk();
    }
}
