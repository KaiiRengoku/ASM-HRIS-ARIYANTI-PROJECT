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

    public function test_dosen_baru_tanpa_saldo_tetap_bisa_mengajukan(): void
    {
        $dosen = $this->buatUser('1234567890123456', 'DOSEN');
        $annual = LeaveType::create([
            'name' => 'Cuti Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => true,
        ]);

        $start = Carbon::today()->addDays(10);
        $end = $start->copy()->addDays(1);

        // Tidak ada LeaveBalance sama sekali untuk pegawai ini.
        $this->actingAs($dosen)->postJson('/api/leaves', [
            'leave_type_id' => $annual->id,
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'reason' => 'keperluan keluarga',
        ])->assertOk()->assertJsonPath('success', true);

        $this->assertDatabaseHas('leave_requests', [
            'employee_id' => $dosen->employee_id,
            'status' => 'Pending',
        ]);
    }

    public function test_pegawai_baru_izin_tidak_memerlukan_saldo(): void
    {
        $pegawai = $this->buatUser('1234567890123457', 'PEGAWAI');
        $permit = LeaveType::create([
            'name' => 'Izin Tidak Masuk', 'code' => 'PERMIT_ABSENT', 'is_leave_balance_deducted' => false,
        ]);

        $start = Carbon::today()->addDays(10);

        $this->actingAs($pegawai)->postJson('/api/leaves', [
            'leave_type_id' => $permit->id,
            'start_date' => $start->toDateString(),
            'end_date' => $start->toDateString(),
            'reason' => 'urusan pribadi',
        ])->assertOk()->assertJsonPath('success', true);
    }
}
