<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Notification;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
 * Mengunci aturan alur persetujuan berjenjang:
 *   Dosen/Pegawai        → Kabag    → HRD
 *   PD_I / PD_II / PD_III → Direktur → HRD
 *   Kabag                → HRD (langsung)
 *   Direktur             → HRD (langsung)
 *   Kabag/Direktur/HRD mengajukan → tertahan (tidak ada penyetuju di sistem)
 * Ditolak di tahap mana pun = berhenti total. Hanya HRD yang memotong saldo.
 */
class LeaveApprovalFlowTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $nik, string $roleCode): User
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
        $user->roles()->attach(Role::firstOrCreate(['code' => $roleCode], ['name' => $roleCode])->id);

        return $user;
    }

    // Tanggal ≥7 hari ke depan yang jatuh pada hari kerja, agar tidak kena
    // guard "minimal 1 minggu" maupun WorkingDayService (0 hari kerja bila akhir pekan).
    private function tanggalKerja(): string
    {
        $d = now()->addDays(8);
        while ($d->isWeekend()) {
            $d->addDay();
        }

        return $d->toDateString();
    }

    private function leave(User $pengaju, string $status = 'Pending'): LeaveRequest
    {
        $type = LeaveType::firstOrCreate(
            ['code' => 'ANNUAL'],
            ['name' => 'Cuti Tahunan', 'is_leave_balance_deducted' => false]
        );

        return LeaveRequest::create([
            'employee_id' => $pengaju->employee_id,
            'leave_type_id' => $type->id,
            'start_date' => $this->tanggalKerja(),
            'end_date' => $this->tanggalKerja(),
            'total_days' => 1,
            'status' => $status,
            'submitted_at' => now(),
            'created_by' => $pengaju->id,
        ]);
    }

    // ── Tahap awal sesuai role pengaju ────────────────────────────────────

    public function test_pengajuan_dosen_pegawai_menunggu_kabag_lalu_hrd(): void
    {
        $peg = $this->user('1111111111111101', 'PEGAWAI');
        $kabag = $this->user('1111111111111102', 'KABAG');
        $hrd = $this->user('1111111111111103', 'HRD');

        $leave = $this->leave($peg);

        // Tahap 1: Kabag menyetujui → menunggu HRD, belum final.
        $this->actingAs($kabag)->postJson("/api/leaves/{$leave->id}/approve")->assertOk();
        $this->assertSame('Disetujui Kepala Bagian', $leave->fresh()->status);

        // Tahap 2: HRD finalisasi.
        $this->actingAs($hrd)->postJson("/api/leaves/{$leave->id}/approve")->assertOk();
        $this->assertSame('Disetujui HRD', $leave->fresh()->status);
    }

    public function test_pengajuan_pd_menunggu_direktur_bukan_kabag(): void
    {
        $pd = $this->user('1111111111111111', 'PD_I');
        $kabag = $this->user('1111111111111112', 'KABAG');
        $direktur = $this->user('1111111111111113', 'DIREKTUR');
        $hrd = $this->user('1111111111111114', 'HRD');

        $leave = $this->leave($pd);

        // Kabag tidak berwenang di jalur PD.
        $this->actingAs($kabag)->postJson("/api/leaves/{$leave->id}/approve")->assertStatus(400);
        $this->assertSame('Pending', $leave->fresh()->status);

        // Direktur berwenang.
        $this->actingAs($direktur)->postJson("/api/leaves/{$leave->id}/approve")->assertOk();
        $this->assertSame('Disetujui Direktur', $leave->fresh()->status);

        // HRD finalisasi.
        $this->actingAs($hrd)->postJson("/api/leaves/{$leave->id}/approve")->assertOk();
        $this->assertSame('Disetujui HRD', $leave->fresh()->status);
    }

    public function test_pengajuan_kabag_langsung_ke_hrd(): void
    {
        $kabag = $this->user('1111111111111121', 'KABAG');
        $kabagLain = $this->user('1111111111111122', 'KABAG');
        $hrd = $this->user('1111111111111123', 'HRD');

        $leave = $this->leave($kabag);

        // Kabag lain tidak boleh menyetujui pengajuan sesama Kabag.
        $this->actingAs($kabagLain)->postJson("/api/leaves/{$leave->id}/approve")->assertStatus(400);

        // HRD langsung memproses.
        $this->actingAs($hrd)->postJson("/api/leaves/{$leave->id}/approve")->assertOk();
        $this->assertSame('Disetujui HRD', $leave->fresh()->status);
    }

    public function test_pengajuan_direktur_langsung_ke_hrd_tidak_menyetujui_sendiri(): void
    {
        $direktur = $this->user('1111111111111131', 'DIREKTUR');
        $direkturLain = $this->user('1111111111111132', 'DIREKTUR');
        $hrd = $this->user('1111111111111133', 'HRD');

        $leave = $this->leave($direktur);

        // Direktur lain pun tidak berwenang pada jalur Direktur.
        $this->actingAs($direkturLain)->postJson("/api/leaves/{$leave->id}/approve")->assertStatus(400);

        $this->actingAs($hrd)->postJson("/api/leaves/{$leave->id}/approve")->assertOk();
        $this->assertSame('Disetujui HRD', $leave->fresh()->status);
    }

    // ── Urutan & penolakan ────────────────────────────────────────────────

    public function test_ditolak_di_tahap_mana_pun_berhenti_total(): void
    {
        $peg = $this->user('1111111111111141', 'PEGAWAI');
        $kabag = $this->user('1111111111111142', 'KABAG');
        $hrd = $this->user('1111111111111143', 'HRD');

        $leave = $this->leave($peg);

        $this->actingAs($kabag)->postJson("/api/leaves/{$leave->id}/reject", ['reason' => 'Tidak disetujui'])->assertOk();
        $this->assertSame('Ditolak Kepala Bagian', $leave->fresh()->status);

        // HRD tidak dapat memproses pengajuan yang sudah berhenti.
        $this->actingAs($hrd)->postJson("/api/leaves/{$leave->id}/approve")->assertStatus(400);
        $this->assertSame('Ditolak Kepala Bagian', $leave->fresh()->status);
    }

    public function test_direktur_menolak_berhenti_tidak_sampai_hrd(): void
    {
        $pd = $this->user('1111111111111151', 'PD_II');
        $direktur = $this->user('1111111111111152', 'DIREKTUR');
        $hrd = $this->user('1111111111111153', 'HRD');

        $leave = $this->leave($pd);

        $this->actingAs($direktur)->postJson("/api/leaves/{$leave->id}/reject", ['reason' => 'Ditolak direktur'])->assertOk();
        $this->assertSame('Ditolak Direktur', $leave->fresh()->status);

        $this->actingAs($hrd)->postJson("/api/leaves/{$leave->id}/approve")->assertStatus(400);
        $this->assertSame('Ditolak Direktur', $leave->fresh()->status);
    }

    public function test_hrd_tidak_dapat_melompati_tahap_kabag(): void
    {
        $peg = $this->user('1111111111111161', 'PEGAWAI');
        $hrd = $this->user('1111111111111162', 'HRD');

        $leave = $this->leave($peg);

        // Pengajuan Dosen/Pegawai masih di tahap Kabag → HRD belum bisa.
        $this->actingAs($hrd)->postJson("/api/leaves/{$leave->id}/approve")->assertStatus(400);
        $this->assertSame('Pending', $leave->fresh()->status);
    }

    // ── Notifikasi ke meja yang benar ─────────────────────────────────────

    public function test_notifikasi_pengajuan_pd_masuk_ke_direktur_bukan_kabag(): void
    {
        $pd = $this->user('1111111111111171', 'PD_III');
        $kabag = $this->user('1111111111111172', 'KABAG');
        $direktur = $this->user('1111111111111173', 'DIREKTUR');

        $type = LeaveType::firstOrCreate(['code' => 'ANNUAL'], ['name' => 'Cuti Tahunan', 'is_leave_balance_deducted' => false]);
        $this->actingAs($pd)->postJson('/api/leaves', [
            'leave_type_id' => $type->id,
            'start_date' => $this->tanggalKerja(),
            'end_date' => $this->tanggalKerja(),
        ])->assertOk();

        $this->assertSame(1, Notification::where('user_id', $direktur->id)->where('type', 'leave_submitted')->count());
        $this->assertSame(0, Notification::where('user_id', $kabag->id)->where('type', 'leave_submitted')->count());
    }

    public function test_notifikasi_pengajuan_dosen_masuk_ke_kabag_bukan_direktur(): void
    {
        $peg = $this->user('1111111111111181', 'DOSEN');
        $kabag = $this->user('1111111111111182', 'KABAG');
        $direktur = $this->user('1111111111111183', 'DIREKTUR');

        // Dosen hanya boleh mengajukan Izin (guard backend), bukan Cuti.
        $type = LeaveType::firstOrCreate(['code' => 'PERMIT_ABSENT'], ['name' => 'Izin', 'is_leave_balance_deducted' => false]);
        $this->actingAs($peg)->postJson('/api/leaves', [
            'leave_type_id' => $type->id,
            'start_date' => $this->tanggalKerja(),
            'end_date' => $this->tanggalKerja(),
        ])->assertOk();

        $this->assertSame(1, Notification::where('user_id', $kabag->id)->where('type', 'leave_submitted')->count());
        $this->assertSame(0, Notification::where('user_id', $direktur->id)->where('type', 'leave_submitted')->count());
    }

    // ── Pengajuan tertahan (opsi a) ───────────────────────────────────────

    public function test_pengajuan_kabag_tertahan_bila_hrd_belum_ada(): void
    {
        $kabag = $this->user('1111111111111191', 'KABAG');

        $type = LeaveType::firstOrCreate(['code' => 'ANNUAL'], ['name' => 'Cuti Tahunan', 'is_leave_balance_deducted' => false]);
        $this->actingAs($kabag)->postJson('/api/leaves', [
            'leave_type_id' => $type->id,
            'start_date' => $this->tanggalKerja(),
            'end_date' => $this->tanggalKerja(),
        ])->assertOk();

        // Tertahan: tidak ada notifikasi ke siapa pun.
        $this->assertSame(0, Notification::where('type', 'leave_submitted')->count());

        // Begitu ada HRD, pengajuan itu muncul di antrean HRD dan bisa diproses.
        $hrd = $this->user('1111111111111192', 'HRD');
        $antrean = $this->actingAs($hrd)->getJson('/api/leaves?level=all')->assertOk()->json('data');
        $this->assertNotEmpty($antrean);
    }

    public function test_pengajuan_pd_tertahan_bila_direktur_belum_ada(): void
    {
        $pd = $this->user('1111111111111201', 'PD_I');

        $type = LeaveType::firstOrCreate(['code' => 'ANNUAL'], ['name' => 'Cuti Tahunan', 'is_leave_balance_deducted' => false]);
        $this->actingAs($pd)->postJson('/api/leaves', [
            'leave_type_id' => $type->id,
            'start_date' => $this->tanggalKerja(),
            'end_date' => $this->tanggalKerja(),
        ])->assertOk();

        $this->assertSame(0, Notification::where('type', 'leave_submitted')->count());

        // Begitu akun Direktur dibuat, pengajuan muncul di antreannya — tanpa penugasan manual.
        $direktur = $this->user('1111111111111202', 'DIREKTUR');
        $antrean = $this->actingAs($direktur)->getJson('/api/leaves?level=all')->assertOk()->json('data');
        $this->assertNotEmpty($antrean);

        $this->actingAs($direktur)->postJson("/api/leaves/{$antrean[0]['id']}/approve")->assertOk();
    }

    // ── Saldo hanya dipotong di tahap HRD ─────────────────────────────────

    public function test_saldo_baru_dipotong_setelah_hrd_finalisasi(): void
    {
        $peg = $this->user('1111111111111211', 'PEGAWAI');
        $kabag = $this->user('1111111111111212', 'KABAG');
        $hrd = $this->user('1111111111111213', 'HRD');

        $type = LeaveType::firstOrCreate(
            ['code' => 'ANNUAL'],
            ['name' => 'Cuti Tahunan', 'is_leave_balance_deducted' => true]
        );
        \App\Models\LeaveBalance::create([
            'employee_id' => $peg->employee_id,
            'leave_type_id' => $type->id,
            'period_year' => date('Y'),
            'entitled_days' => 12,
            'adjustment_days' => 0,
            'used_days' => 0,
            'remaining_days' => 12,
        ]);

        $leave = $this->leave($peg);

        // Setelah Kabag menyetujui, saldo BELUM berubah.
        $this->actingAs($kabag)->postJson("/api/leaves/{$leave->id}/approve")->assertOk();
        $this->assertDatabaseHas('leave_balances', [
            'employee_id' => $peg->employee_id, 'leave_type_id' => $type->id, 'used_days' => 0,
        ]);

        // Setelah HRD finalisasi, baru terpotong.
        $this->actingAs($hrd)->postJson("/api/leaves/{$leave->id}/approve")->assertOk();
        $this->assertDatabaseHas('leave_balances', [
            'employee_id' => $peg->employee_id, 'leave_type_id' => $type->id, 'used_days' => 1,
        ]);
    }
}
