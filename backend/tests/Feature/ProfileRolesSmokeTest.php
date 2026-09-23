<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileRolesSmokeTest extends TestCase
{
    use RefreshDatabase;

    private User $hrdUser;

    private User $dosenUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dosenUser = $this->buatUser('Dosen', '1234567890123456');
        $this->hrdUser = $this->buatUser('Staf', '1234567890123457', true);
    }

    private function buatUser(string $jenisPegawai, string $nik, bool $isHrd = false): User
    {
        $positionId = null;
        if ($jenisPegawai === 'Dosen') {
            $positionId = \App\Models\Position::where('code', 'DOSEN')->first()?->id
                ?? \App\Models\Position::create(['name' => 'Dosen', 'code' => 'DOSEN', 'is_active' => true])->id;
        }
        $employee = Employee::create([
            'nik' => $nik,
            'nama_lengkap' => 'Pegawai ' . $nik,
            'email' => 'pegawai' . $nik . '@asm-ariyanti.ac.id',
            'position_id' => $positionId,
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);

        $user = User::create([
            'nik' => $nik,
            'name' => 'User ' . $nik,
            'email' => 'user' . $nik . '@asm-ariyanti.ac.id',
            'password' => 'password',
        ]);
        $user->employee_id = $employee->id;
        $user->save();

        if ($isHrd) {
            $role = Role::firstOrCreate(['code' => 'HRD'], ['name' => 'HRD']);
            $user->roles()->attach($role->id);
        }

        return $user;
    }

    public function test_non_lecturer_profile_hides_research_section(): void
    {
        $response = $this->actingAs($this->hrdUser)->getJson('/api/profile');

        $response->assertOk()->assertJsonPath('data.is_dosen', false);
    }

    public function test_lecturer_profile_menandai_is_dosen_true(): void
    {
        $response = $this->actingAs($this->dosenUser)->getJson('/api/profile');

        $response->assertOk()->assertJsonPath('data.is_dosen', true);
    }
}
