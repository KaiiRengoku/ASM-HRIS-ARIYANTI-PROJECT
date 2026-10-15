<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveBalanceTransaction;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/*
 * Regresi Bug 2: pemotongan saldo cuti harus mengikuti TAHUN tanggal MULAI cuti,
 * bukan tahun saat HRD menyetujui. Cuti 28 Dec 2026 yang disetujui 3 Jan 2027
 * harus memotong saldo periode 2026 — saldo 2027 tidak boleh tersentuh.
 */
class LeaveBalanceYearTest extends TestCase
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

    public function test_approve_memotong_saldo_tahun_mulai_cuti_bukan_tahun_persetujuan(): void
    {
        $hrd = $this->buatUser('9999999999990001', 'HRD');
        // Pengaju berbeda dari HRD: HRD tidak boleh menyetujui pengajuan sendiri.
        $pegawai = $this->buatUser('9999999999990002', 'PEGAWAI');

        $type = LeaveType::create([
            'name' => 'Cuti Tahunan',
            'code' => 'ANNUAL',
            'is_leave_balance_deducted' => true,
        ]);

        // Dua baris saldo karyawan yang sama: periode 2026 dan 2027.
        $balance2026 = LeaveBalance::create([
            'employee_id' => $pegawai->employee_id,
            'leave_type_id' => $type->id,
            'period_year' => 2026,
            'entitled_days' => 12,
            'adjustment_days' => 0,
            'used_days' => 0,
            'remaining_days' => 12,
        ]);
        $balance2027 = LeaveBalance::create([
            'employee_id' => $pegawai->employee_id,
            'leave_type_id' => $type->id,
            'period_year' => 2027,
            'entitled_days' => 12,
            'adjustment_days' => 0,
            'used_days' => 0,
            'remaining_days' => 12,
        ]);

        // Cuti lintas tahun: mulai 28 Dec 2026, selesai 2 Jan 2027.
        $leave = LeaveRequest::create([
            'employee_id' => $pegawai->employee_id,
            'leave_type_id' => $type->id,
            'start_date' => '2026-12-28',
            'end_date' => '2027-01-02',
            'total_days' => 3,
            'status' => 'Disetujui Kepala Bagian', // sudah siap difinalisasi di meja HRD
            'submitted_at' => now(),
            'created_by' => $hrd->id,
        ]);

        // Persetujuan HRD terjadi pada 2027 (waktu sistem dimundurkan ke 2027).
        Carbon::setTestNow('2027-01-03 09:00:00');
        $this->assertEquals(2027, now()->year);

        $this->actingAs($hrd)->postJson("/api/leaves/{$leave->id}/approve")
            ->assertOk();

        Carbon::setTestNow();

        // Saldo 2026 terpotong 3 hari.
        $this->assertDatabaseHas('leave_balances', [
            'id' => $balance2026->id,
            'used_days' => 3,
            'remaining_days' => 9,
        ]);

        // Saldo 2027 sama sekali tidak berubah.
        $this->assertDatabaseHas('leave_balances', [
            'id' => $balance2027->id,
            'used_days' => 0,
            'remaining_days' => 12,
        ]);

        // Transaksi DEDUCT menunjuk baris saldo 2026.
        $this->assertDatabaseHas('leave_balance_transactions', [
            'leave_balance_id' => $balance2026->id,
            'leave_request_id' => $leave->id,
            'transaction_type' => 'DEDUCT',
            'amount' => -3,
        ]);
        $this->assertDatabaseMissing('leave_balance_transactions', [
            'leave_balance_id' => $balance2027->id,
        ]);
    }

    public function test_login_keenam_ditolak_429_oleh_throttle(): void
    {
        $nik = '999999002';
        $employee = Employee::create([
            'nik' => $nik,
            'nama_lengkap' => 'User ' . $nik,
            'email' => 'user' . $nik . '@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);
        User::create([
            'nik' => $nik,
            'name' => 'User ' . $nik,
            'email' => 'user' . $nik . '@example.com',
            'password' => 'password',
            'employee_id' => $employee->id,
        ]);

        // Rute /api/login memakai throttle:5,1 → percobaan ke-6 harus 429.
        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/api/login', ['nik' => $nik, 'password' => 'salah'])
                ->assertStatus(401);
        }

        $this->postJson('/api/login', ['nik' => $nik, 'password' => 'salah'])
            ->assertStatus(429);
    }
}
