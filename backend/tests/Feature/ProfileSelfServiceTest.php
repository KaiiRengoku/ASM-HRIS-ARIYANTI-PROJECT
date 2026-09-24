<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileSelfServiceTest extends TestCase
{
    use RefreshDatabase;

    private function buatUserDenganPegawai(string $jenisPegawai, string $nik = '1234567890123456'): User
    {
        $positionId = null;
        if ($jenisPegawai === 'Dosen') {
            $positionId = \App\Models\Position::where('code', 'DOSEN')->first()?->id
                ?? \App\Models\Position::create(['name' => 'Dosen', 'code' => 'DOSEN', 'is_active' => true])->id;
        }
        $employee = Employee::create([
            'nik' => $nik,
            'nama_lengkap' => 'Pegawai ' . $jenisPegawai,
            'email' => strtolower($jenisPegawai) . $nik . '@asm-ariyanti.ac.id',
            'position_id' => $positionId,
            'is_dosen' => $jenisPegawai === 'Dosen',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);

        $user = User::create([
            'nik' => $nik,
            'name' => 'User ' . $jenisPegawai,
            'email' => 'user' . strtolower($jenisPegawai) . $nik . '@asm-ariyanti.ac.id',
            'password' => 'password',
        ]);
        $user->employee_id = $employee->id;
        $user->save();

        return $user;
    }

    public function test_get_profile_mengembalikan_is_dosen(): void
    {
        $dosen = $this->buatUserDenganPegawai('Dosen', '1234567890123456');
        $staf = $this->buatUserDenganPegawai('Staf', '1234567890123457');

        $this->actingAs($dosen)->getJson('/api/profile')->assertOk()->assertJsonPath('data.is_dosen', true);
        $this->actingAs($staf)->getJson('/api/profile')->assertOk()->assertJsonPath('data.is_dosen', false);
    }

    public function test_user_updates_only_permitted_contact_fields(): void
    {
        $user = $this->buatUserDenganPegawai('Staf');
        $employee = $user->employee;

        $response = $this->actingAs($user)->putJson('/api/profile', [
            'alamat_ktp' => 'Jl. Merdeka 10',
            'alamat_domisili' => 'Jl. Domisili 2',
            'nomor_hp' => '081234567890',
            'nama_lengkap' => 'Tidak boleh berubah',
        ]);

        $response->assertOk();
        $this->assertSame('Jl. Merdeka 10', $employee->fresh()->alamat_ktp);
        $this->assertSame('Jl. Domisili 2', $employee->fresh()->alamat_domisili);
        $this->assertSame('081234567890', $employee->fresh()->nomor_hp);
        $this->assertNotSame('Tidak boleh berubah', $employee->fresh()->nama_lengkap);
    }

    public function test_dosen_dapat_memperbarui_riwayat_penelitian(): void
    {
        $user = $this->buatUserDenganPegawai('Dosen');

        $this->actingAs($user)->putJson('/api/profile', [
            'riwayat_penelitian_pengabdian' => 'Penelitian A',
        ])->assertOk();

        $this->assertSame('Penelitian A', $user->employee->fresh()->functional->riwayat_penelitian_pengabdian);
    }

    public function test_non_dosen_tidak_dapat_memperbarui_riwayat_penelitian(): void
    {
        $user = $this->buatUserDenganPegawai('Staf');

        $this->actingAs($user)->putJson('/api/profile', [
            'riwayat_penelitian_pengabdian' => 'Tidak boleh tersimpan',
        ])->assertOk();

        $this->assertTrue($user->employee->fresh()->functional === null);
    }
}
