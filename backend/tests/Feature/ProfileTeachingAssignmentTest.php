<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Role;
use App\Models\TeachingAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileTeachingAssignmentTest extends TestCase
{
    use RefreshDatabase;

    private User $hrdUser;

    private User $dosenUser;

    private Employee $dosen;

    private Employee $staf;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dosenUser = $this->buatUser('Dosen', '1234567890123456');
        $this->dosen = $this->dosenUser->employee;
        $this->hrdUser = $this->buatUser('Staf', '1234567890123457', true);
        $this->staf = $this->hrdUser->employee;
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
            'is_dosen' => $jenisPegawai === 'Dosen',
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

    public function test_hrd_creates_teaching_assignment_for_selected_employee(): void
    {
        $response = $this->actingAs($this->hrdUser)->postJson('/api/profile/teaching-assignments', [
            'employee_id' => $this->dosen->id,
            'kode_matkul' => 'IF101',
            'nama_matkul' => 'Pemrograman Web',
            'sks' => 3,
            'semester' => 'Ganjil 2026/2027',
            'program_studi' => 'Informatika',
            'kelas' => 'A',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('teaching_assignments', ['kode_matkul' => 'IF101']);
    }

    public function test_user_dapat_membuat_teaching_assignment_miliknya(): void
    {
        $response = $this->actingAs($this->dosenUser)->postJson('/api/profile/teaching-assignments', [
            'kode_matkul' => 'IF101',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('teaching_assignments', ['employee_id' => $this->dosen->id, 'kode_matkul' => 'IF101']);
    }

    public function test_staf_non_pegawai_tidak_dapat_membuat_teaching_assignment(): void
    {
        $staf = $this->buatUser('Staf', '1234567890123458');

        $this->actingAs($staf)->postJson('/api/profile/teaching-assignments', [
            'kode_matkul' => 'IF101',
        ])->assertForbidden();
    }

    public function test_staf_role_pegawai_dapat_membuat_teaching_assignment(): void
    {
        $staf = $this->buatUser('Staf', '1234567890123459');
        $role = Role::firstOrCreate(['code' => 'PEG'], ['name' => 'Pegawai']);
        $staf->roles()->attach($role->id);

        $response = $this->actingAs($staf)->postJson('/api/profile/teaching-assignments', [
            'kode_matkul' => 'IF102',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('teaching_assignments', ['employee_id' => $staf->employee->id, 'kode_matkul' => 'IF102']);
    }

    public function test_staf_non_pegawai_index_kosong(): void
    {
        $staf = $this->buatUser('Staf', '1234567890123460');

        $this->actingAs($staf)
            ->getJson('/api/profile/teaching-assignments')
            ->assertOk()
            ->assertJsonPath('data', []);
    }

    public function test_hrd_melihat_daftar_milik_employee_terpilih(): void
    {
        TeachingAssignment::create(['employee_id' => $this->dosen->id, 'kode_matkul' => 'IF101']);

        $this->actingAs($this->hrdUser)
            ->getJson('/api/profile/teaching-assignments?employee_id=' . $this->dosen->id)
            ->assertOk()
            ->assertJsonPath('data.0.kode_matkul', 'IF101');
    }

    public function test_user_melihat_daftar_milik_sendiri(): void
    {
        TeachingAssignment::create(['employee_id' => $this->dosen->id, 'kode_matkul' => 'IF101']);

        $this->actingAs($this->dosenUser)
            ->getJson('/api/profile/teaching-assignments')
            ->assertOk()
            ->assertJsonPath('data.0.kode_matkul', 'IF101');
    }

    public function test_non_hrd_tidak_dapat_melihat_milik_employee_lain(): void
    {
        $this->actingAs($this->dosenUser)
            ->getJson('/api/profile/teaching-assignments?employee_id=' . $this->staf->id)
            ->assertForbidden();
    }

    public function test_hrd_memperbarui_teaching_assignment(): void
    {
        $assignment = TeachingAssignment::create(['employee_id' => $this->dosen->id, 'nama_matkul' => 'Lama']);

        $response = $this->actingAs($this->hrdUser)->putJson('/api/profile/teaching-assignments/' . $assignment->id, [
            'nama_matkul' => 'Pemrograman Web',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('teaching_assignments', ['id' => $assignment->id, 'nama_matkul' => 'Pemrograman Web']);
    }

    public function test_user_dapat_memperbarui_teaching_assignment_miliknya(): void
    {
        $assignment = TeachingAssignment::create(['employee_id' => $this->dosen->id, 'nama_matkul' => 'Lama']);

        $response = $this->actingAs($this->dosenUser)->putJson('/api/profile/teaching-assignments/' . $assignment->id, [
            'nama_matkul' => 'Diubah',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('teaching_assignments', ['id' => $assignment->id, 'nama_matkul' => 'Diubah']);
    }

    public function test_hrd_menghapus_teaching_assignment(): void
    {
        $assignment = TeachingAssignment::create(['employee_id' => $this->dosen->id, 'kode_matkul' => 'IF101']);

        $this->actingAs($this->hrdUser)->deleteJson('/api/profile/teaching-assignments/' . $assignment->id)->assertOk();
        $this->assertDatabaseMissing('teaching_assignments', ['id' => $assignment->id]);
    }

    public function test_user_dapat_menghapus_teaching_assignment_miliknya(): void
    {
        $assignment = TeachingAssignment::create(['employee_id' => $this->dosen->id, 'kode_matkul' => 'IF101']);

        $this->actingAs($this->dosenUser)->deleteJson('/api/profile/teaching-assignments/' . $assignment->id)->assertOk();
        $this->assertDatabaseMissing('teaching_assignments', ['id' => $assignment->id]);
    }
}
