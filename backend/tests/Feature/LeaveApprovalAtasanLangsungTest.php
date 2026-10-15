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
 * Mengunci alur BARU (berbasis atasan langsung):
 *   [Pengaju] → [atasan langsung] → HRD
 * Yang menentukan tahap awal hanyalah kolom supervisor_id pada pegawai pengaju,
 * bukan role. Role hanya menentukan hak akses. Bila supervisor_id kosong,
 * pengajuan jatuh ke alur lama (lihat LeaveApprovalFlowTest).
 */
class LeaveApprovalAtasanLangsungTest extends TestCase
{
    use RefreshDatabase;

    private function employeeUser(string $nik, string $roleCode, ?int $supervisorId = null): User
    {
        $employee = Employee::create([
            'nik' => $nik,
            'nama_lengkap' => 'User ' . $nik,
            'email' => 'user' . $nik . '@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
            'supervisor_id' => $supervisorId,
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
    // guard "minimal 1 minggu" maupun WorkingDayService (0 hari kerja).
    private function tanggalKerja(): string
    {
        $d = now()->addDays(8);
        while ($d->isWeekend()) {
            $d->addDay();
        }

        return $d->toDateString();
    }

    private function leave(User $pengaju): LeaveRequest
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
            'status' => 'Pending',
            'submitted_at' => now(),
            'created_by' => $pengaju->id,
        ]);
    }

    public function test_alur_baru_atasan_langsung_lalu_hrd(): void
    {
        // Atasan langsung berrole Kabag (atasan struktural pada sistem nyata);
        // yang memberi kewenangan menyetujui adalah relasi supervisor_id.
        $atasan = $this->employeeUser('2222222222222201', 'KABAG');
        $bawahan = $this->employeeUser('2222222222222202', 'PEGAWAI', $atasan->employee_id);
        $hrd = $this->employeeUser('2222222222222203', 'HRD');

        $leave = $this->leave($bawahan);

        // Tahap 1: atasan langsung menyetujui → menunggu HRD, belum final.
        $this->actingAs($atasan)->postJson("/api/leaves/{$leave->id}/approve")->assertOk();
        $this->assertSame('Disetujui Atasan Langsung', $leave->fresh()->status);

        // Tahap 2: HRD finalisasi.
        $this->actingAs($hrd)->postJson("/api/leaves/{$leave->id}/approve")->assertOk();
        $this->assertSame('Disetujui HRD', $leave->fresh()->status);
    }

    public function test_notifikasi_pengajuan_masuk_ke_atasan_langsung(): void
    {
        $atasan = $this->employeeUser('2222222222222211', 'KABAG');
        $bawahan = $this->employeeUser('2222222222222212', 'PEGAWAI', $atasan->employee_id);
        $direktur = $this->employeeUser('2222222222222213', 'DIREKTUR');

        $type = LeaveType::firstOrCreate(['code' => 'ANNUAL'], ['name' => 'Cuti Tahunan', 'is_leave_balance_deducted' => false]);
        $this->actingAs($bawahan)->postJson('/api/leaves', [
            'leave_type_id' => $type->id,
            'start_date' => $this->tanggalKerja(),
            'end_date' => $this->tanggalKerja(),
        ])->assertOk();

        $this->assertSame(1, Notification::where('user_id', $atasan->id)->where('type', 'leave_submitted')->count());
        $this->assertSame(0, Notification::where('user_id', $direktur->id)->where('type', 'leave_submitted')->count());
    }

    public function test_atasan_bukan_penyetuju_yang_dipetakan_tidak_boleh(): void
    {
        $atasan = $this->employeeUser('2222222222222221', 'PEGAWAI');
        $bawahan = $this->employeeUser('2222222222222222', 'PEGAWAI', $atasan->employee_id);
        // Kabag lain: punya kewenangan lewat role di alur lama, tapi bukan atasan pengaju.
        $kabagLain = $this->employeeUser('2222222222222223', 'KABAG');

        $leave = $this->leave($bawahan);

        $this->actingAs($kabagLain)->postJson("/api/leaves/{$leave->id}/approve")->assertStatus(400);
        $this->assertSame('Pending', $leave->fresh()->status);
    }

    public function test_ditolak_atasan_langsung_berhenti_total(): void
    {
        $atasan = $this->employeeUser('2222222222222231', 'KABAG');
        $bawahan = $this->employeeUser('2222222222222232', 'PEGAWAI', $atasan->employee_id);
        $hrd = $this->employeeUser('2222222222222233', 'HRD');

        $leave = $this->leave($bawahan);

        $this->actingAs($atasan)->postJson("/api/leaves/{$leave->id}/reject", ['reason' => 'Tidak disetujui'])->assertOk();
        $this->assertSame('Ditolak Atasan Langsung', $leave->fresh()->status);

        $this->actingAs($hrd)->postJson("/api/leaves/{$leave->id}/approve")->assertStatus(400);
        $this->assertSame('Ditolak Atasan Langsung', $leave->fresh()->status);
    }

    public function test_hrd_tidak_dapat_melompati_tahap_atasan_langsung(): void
    {
        $atasan = $this->employeeUser('2222222222222241', 'PEGAWAI');
        $bawahan = $this->employeeUser('2222222222222242', 'PEGAWAI', $atasan->employee_id);
        $hrd = $this->employeeUser('2222222222222243', 'HRD');

        $leave = $this->leave($bawahan);

        $this->actingAs($hrd)->postJson("/api/leaves/{$leave->id}/approve")->assertStatus(400);
        $this->assertSame('Pending', $leave->fresh()->status);
    }

    public function test_antrean_atasan_menampilkan_pengajuan_bawahannya(): void
    {
        $atasan = $this->employeeUser('2222222222222251', 'PEGAWAI');
        $bawahan = $this->employeeUser('2222222222222252', 'PEGAWAI', $atasan->employee_id);

        $leave = $this->leave($bawahan);

        $antrean = $this->actingAs($atasan)->getJson('/api/leaves?level=queue')->assertOk()->json('data');
        $this->assertContains($leave->id, array_column($antrean, 'id'));
    }
}
