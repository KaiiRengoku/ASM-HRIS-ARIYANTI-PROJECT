<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
 * Ringkasan Saldo Cuti Pegawai (GET /api/leave-balances):
 * hanya HRD/DIREKTUR/PD_I/PD_II/PD_III yang boleh melihat —
 * KABAG, DOSEN, dan PEGAWAI harus 403 (bukan 200).
 */
class LeaveBalanceSummaryTest extends TestCase
{
    use RefreshDatabase;

    private function buatUser(string $nik, string $roleCode): User
    {
        $employee = Employee::create([
            'nik' => $nik,
            'nama_lengkap' => 'User ' . $nik,
            'email' => 'user' . $nik . '@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
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

    /**
     * @dataProvider roleYangBoleh
     */
    public function test_role_berhak_mendapat_200(string $roleCode): void
    {
        $user = $this->buatUser('99999999999800' . crc32($roleCode) % 90, $roleCode);

        $this->actingAs($user)->getJson('/api/leave-balances')->assertOk();
    }

    /**
     * @dataProvider roleYangDilarang
     */
    public function test_role_tidak_berhak_ditolak_403(string $roleCode): void
    {
        $user = $this->buatUser('99999999999700' . crc32($roleCode) % 90, $roleCode);

        $this->actingAs($user)->getJson('/api/leave-balances')->assertForbidden();
    }

    public function test_respons_memuat_flag_memotong_saldo_dan_sisa_konsisten(): void
    {
        $hrd = $this->buatUser('9999999999960001', 'HRD');
        $type = LeaveType::create([
            'code' => 'CUTI_TAHUNAN',
            'name' => 'Cuti Tahunan',
            'is_leave_balance_deducted' => true,
        ]);

        LeaveBalance::create([
            'employee_id' => $hrd->employee_id,
            'leave_type_id' => $type->id,
            'period_year' => 2026,
            'entitled_days' => 12,
            'adjustment_days' => 2,
            'used_days' => 3,
            // Sengaja tidak konsisten (seharusnya 11) untuk menguji koreksi rumus:
            'remaining_days' => 99,
        ]);

        $this->actingAs($hrd)->getJson('/api/leave-balances?year=2026')
            ->assertOk()
            ->assertJsonPath('data.0.leave_type.is_leave_balance_deducted', true)
            ->assertJsonPath('data.0.remaining_days', 11)
            ->assertJsonPath('data.0.remaining_days_is_consistent', false);
    }

    public static function roleYangBoleh(): array
    {
        return [['HRD'], ['DIREKTUR'], ['PD_I'], ['PD_II'], ['PD_III']];
    }

    public static function roleYangDilarang(): array
    {
        return [['KABAG'], ['DOSEN'], ['PEGAWAI']];
    }
}
