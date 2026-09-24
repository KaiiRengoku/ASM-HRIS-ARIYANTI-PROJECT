<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileFunctionalTest extends TestCase
{
    use RefreshDatabase;

    private User $lecturerUser;

    private User $hrdUser;

    private User $stafUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->lecturerUser = $this->buatUser('Dosen', '1234567890123456');
        $this->hrdUser = $this->buatUser('Staf', '1234567890123457', true);
        $this->stafUser = $this->buatUser('Staf', '1234567890123458');
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

    public function test_user_dapat_memperbarui_data_fungsional_miliknya(): void
    {
        $response = $this->actingAs($this->lecturerUser)->putJson('/api/profile/functional', [
            'pangkat' => 'Penata',
        ]);

        $response->assertOk();
        $this->assertSame('Penata', $this->lecturerUser->employee->fresh()->functional->pangkat);
    }

    public function test_hrd_dapat_memperbarui_data_fungsional_resmi(): void
    {
        $response = $this->actingAs($this->hrdUser)->putJson('/api/profile/functional', [
            'pangkat' => 'Penata',
            'golongan_ruang' => 'III/c',
            'jabatan_fungsional' => 'Lektor',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('employee_functionals', [
            'employee_id' => $this->hrdUser->employee->id,
            'pangkat' => 'Penata',
            'golongan_ruang' => 'III/c',
        ]);
    }

    public function test_dosen_dapat_memperbarui_riwayat_penelitian(): void
    {
        $response = $this->actingAs($this->lecturerUser)->putJson('/api/profile/functional', [
            'riwayat_penelitian_pengabdian' => 'Penelitian A',
        ]);

        $response->assertOk();
        $this->assertSame('Penelitian A', $this->lecturerUser->employee->fresh()->functional->riwayat_penelitian_pengabdian);
    }

    public function test_staf_dapat_memperbarui_riwayat_miliknya(): void
    {
        $response = $this->actingAs($this->stafUser)->putJson('/api/profile/functional', [
            'riwayat_penelitian_pengabdian' => 'Riwayat staf',
        ]);

        $response->assertOk();
        $this->assertSame('Riwayat staf', $this->stafUser->employee->fresh()->functional->riwayat_penelitian_pengabdian);
    }

    public function test_show_mengembalikan_data_fungsional(): void
    {
        $this->actingAs($this->lecturerUser)->getJson('/api/profile/functional')->assertOk();
    }

    public function test_pernyataan_true_menyimpan_timestamp(): void
    {
        $response = $this->actingAs($this->lecturerUser)->putJson('/api/profile/functional', [
            'riwayat_penelitian_pengabdian' => 'Penelitian A',
            'pernyataan' => true,
        ]);

        $response->assertOk();
        $this->assertNotNull($this->lecturerUser->employee->fresh()->functional->pernyataan_disetujui_pada);
    }

    public function test_pernyataan_false_tidak_menyimpan_timestamp(): void
    {
        $response = $this->actingAs($this->lecturerUser)->putJson('/api/profile/functional', [
            'riwayat_penelitian_pengabdian' => 'Penelitian A',
            'pernyataan' => false,
        ]);

        $response->assertOk();
        $this->assertNull($this->lecturerUser->employee->fresh()->functional->pernyataan_disetujui_pada);
    }
}
