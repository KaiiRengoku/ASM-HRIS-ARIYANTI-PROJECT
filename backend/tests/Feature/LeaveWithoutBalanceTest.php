<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\LeaveType;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class LeaveWithoutBalanceTest extends TestCase
{
    use RefreshDatabase;

    private function buatUser(string $nik, string $roleCode): User
    {
        $employee = Employee::create([
            'nik' => $nik,
            'nama_lengkap' => 'User ' . $nik,
            'email' => 'user' . $nik . '@example.com',
            'tanggal_masuk_kerja' => Carbon::today()->toDateString(),
        ]);
        $user = User::create([
            'nik' => $nik,
            'name' => 'User ' . $nik,
            'email' => 'user' . $nik . '@example.com',
            'password' => 'password',
            'employee_id' => $employee->id,
        ]);
        $role = Role::firstOrCreate(['code' => $roleCode], ['name' => $roleCode]);
        $user->roles()->attach($role->id);

        return $user;
    }

    // Tanggal ≥7 hari ke depan yang jatuh pada hari kerja, agar tidak kena
    // guard "minimal 1 minggu" maupun WorkingDayService (0 hari kerja).
    private function tanggalKerja(int $offset = 8): Carbon
    {
        $d = Carbon::today()->addDays($offset);
        while ($d->isWeekend()) {
            $d->addDay();
        }

        return $d;
    }

    // Dosen hanya boleh mengajukan Izin (bukan Cuti), jadi skenario "jenis
    // pemotong saldo tanpa saldo" diuji dengan pegawai.
    public function test_pegawai_baru_tanpa_saldo_tetap_bisa_mengajukan(): void
    {
        $pegawai = $this->buatUser('1234567890123456', 'PEGAWAI');
        $annual = LeaveType::create([
            'name' => 'Cuti Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => true,
        ]);

        $start = $this->tanggalKerja();
        $end = $start->copy()->addDay();

        // Tidak ada LeaveBalance sama sekali untuk pegawai ini.
        $this->actingAs($pegawai)->postJson('/api/leaves', [
            'leave_type_id' => $annual->id,
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'reason' => 'keperluan keluarga',
        ])->assertOk()->assertJsonPath('success', true);

        $this->assertDatabaseHas('leave_requests', [
            'employee_id' => $pegawai->employee_id,
            'status' => 'Pending',
        ]);
    }

    public function test_pegawai_baru_izin_tidak_memerlukan_saldo(): void
    {
        $pegawai = $this->buatUser('1234567890123457', 'PEGAWAI');
        $permit = LeaveType::create([
            'name' => 'Izin Tidak Masuk', 'code' => 'PERMIT_ABSENT', 'is_leave_balance_deducted' => false,
        ]);

        $start = $this->tanggalKerja();

        $this->actingAs($pegawai)->postJson('/api/leaves', [
            'leave_type_id' => $permit->id,
            'start_date' => $start->toDateString(),
            'end_date' => $start->toDateString(),
            'reason' => 'urusan pribadi',
        ])->assertOk()->assertJsonPath('success', true);
    }
}
