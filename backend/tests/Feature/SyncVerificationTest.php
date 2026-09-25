<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

// Verifikasi 9 item sinkronisasi Kebutuhanfungsional.md.
class SyncVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $nik, string $roleCode, array $empAttrs = []): User
    {
        $employee = Employee::create(array_merge([
            'nik' => $nik,
            'nama_lengkap' => 'User ' . $nik,
            'email' => 'user' . $nik . '@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ], $empAttrs));
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

    public function test_item9_route_roles_diguard_permission_employee_view(): void
    {
        $peg = $this->user('1234567890123401', 'PEG');
        $hrd = $this->user('1234567890123402', 'HRD');

        $this->actingAs($peg)->getJson('/api/roles')->assertForbidden();
        $this->actingAs($hrd)->getJson('/api/roles')->assertOk();
    }

    public function test_item2_riwayat_jabatan_crud_sendiri(): void
    {
        $peg = $this->user('1234567890123403', 'PEG');

        $this->actingAs($peg)->postJson('/api/profile/position-histories', [
            'jabatan' => 'Kepala Urusan', 'start_date' => '2021-03-01', 'end_date' => '2024-02-28', 'no_sk' => 'SK-1',
        ])->assertOk();

        $this->actingAs($peg)->getJson('/api/profile/position-histories')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.jabatan', 'Kepala Urusan');

        // end_date sebelum start_date ditolak
        $this->actingAs($peg)->postJson('/api/profile/position-histories', [
            'jabatan' => 'X', 'start_date' => '2024-05-01', 'end_date' => '2023-01-01',
        ])->assertStatus(422);

        // bukan HRD tidak boleh bikin untuk pegawai lain (yang ada pun ditolak 403)
        $other = $this->user('1234567890123499', 'PEG');
        $this->actingAs($peg)->postJson('/api/profile/position-histories', [
            'employee_id' => $other->employee_id, 'jabatan' => 'Y',
        ])->assertForbidden();
    }

    public function test_item2_riwayat_jabatan_muncul_di_resource_dan_profile(): void
    {
        $hrd = $this->user('1234567890123404', 'HRD');
        $peg = $this->user('1234567890123405', 'PEG');
        \App\Models\EmployeePositionHistory::create([
            'employee_id' => $peg->employee_id, 'jabatan' => 'Staf', 'start_date' => '2022-01-01',
        ]);

        $this->actingAs($hrd)->getJson("/api/employees/{$peg->employee_id}")
            ->assertOk()->assertJsonPath('data.position_histories.0.jabatan', 'Staf');

        $this->actingAs($peg)->getJson('/api/profile')
            ->assertOk()->assertJsonPath('data.employee.position_histories.0.jabatan', 'Staf');
    }

    public function test_item3_command_accrue_menbuat_saldo(): void
    {
        $peg = $this->user('1234567890123406', 'PEG');
        $annual = LeaveType::create(['name' => 'Cuti Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => true]);

        Artisan::call('leave:accrue');

        $balance = LeaveBalance::where('employee_id', $peg->employee_id)->where('period_year', now()->year)->first();
        $this->assertNotNull($balance);
        $this->assertEquals(14, (float) $balance->entitled_days); // masa kerja 2020 → tier 5-10 th

        Artisan::call('leave:accrue'); // idempotent
        $this->assertEquals(1, LeaveBalance::where('employee_id', $peg->employee_id)->where('period_year', now()->year)->count());
    }

    public function test_item4_6_sisa_cuti_di_stats_pimpinan(): void
    {
        foreach (['DIREKTUR', 'PD_I', 'KABAG'] as $i => $role) {
            $u = $this->user('123456789012341' . $i . '', $role);
            LeaveType::firstOrCreate(['code' => 'ANNUAL'], ['name' => 'Cuti Tahunan', 'is_leave_balance_deducted' => true]);
            $annualId = LeaveType::where('code', 'ANNUAL')->value('id');
            LeaveBalance::create([
                'employee_id' => $u->employee_id, 'leave_type_id' => $annualId,
                'period_year' => now()->year, 'entitled_days' => 12, 'adjustment_days' => 0, 'used_days' => 2, 'remaining_days' => 10,
            ]);
            $this->actingAs($u)->getJson('/api/dashboard/stats')
                ->assertOk()->assertJsonPath('data.sisa_cuti', 10);
        }
    }

    public function test_item7_rekap_scope_akademik(): void
    {
        $direktur = $this->user('1234567890123420', 'DIREKTUR');
        $dosen = $this->user('1234567890123421', 'PEG', ['is_dosen' => true]);
        $staf = $this->user('1234567890123422', 'PEG');

        $type = LeaveType::create(['name' => 'Cuti Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => false]);
        LeaveRequest::create([
            'employee_id' => $dosen->employee_id, 'leave_type_id' => $type->id,
            'start_date' => now()->startOfYear()->addMonth()->toDateString(),
            'end_date' => now()->startOfYear()->addMonth()->toDateString(),
            'total_days' => 1, 'status' => 'Disetujui HRD', 'submitted_at' => now(), 'created_by' => $direktur->id,
        ]);

        $res = $this->actingAs($direktur)->getJson('/api/reports/leaves/recap?scope=akademik')->assertOk();
        $nama = collect($res->json('data'))->pluck('nama_lengkap');
        $this->assertTrue($nama->contains('User 1234567890123421'));
        $this->assertFalse($nama->contains('User 1234567890123422'));

        $row = collect($res->json('data'))->firstWhere('nik', '1234567890123421');
        $this->assertNotEmpty($row['riwayat_cuti']);
        $this->assertSame('Disetujui HRD', $row['riwayat_cuti'][0]['status']);
    }

    public function test_item8_finalisasi_hrd_mengarsipkan_pdf_keputusan(): void
    {
        Storage::fake('public');
        $hrd = $this->user('1234567890123430', 'HRD');
        $peg = $this->user('1234567890123431', 'PEG');
        $type = LeaveType::create(['name' => 'Cuti Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => false]);
        $leave = LeaveRequest::create([
            'employee_id' => $peg->employee_id, 'leave_type_id' => $type->id,
            'start_date' => now()->addWeek()->toDateString(), 'end_date' => now()->addWeek()->toDateString(),
            'total_days' => 1, 'status' => 'Disetujui Kepala Bagian', 'submitted_at' => now(), 'created_by' => $hrd->id,
        ]);

        $this->actingAs($hrd)->postJson("/api/leaves/{$leave->id}/approve")->assertOk();

        $doc = \App\Models\EmployeeDocument::where('employee_id', $peg->employee_id)->where('document_type', 'SK Cuti')->first();
        $this->assertNotNull($doc, 'Arsip digital keputusan cuti harus terbentuk setelah finalisasi HRD.');
        Storage::disk('public')->assertExists($doc->storage_path);
    }

    public function test_item8_pembatalan_cuti_menghapus_arsip_keputusan(): void
    {
        Storage::fake('public');
        $hrd = $this->user('1234567890123440', 'HRD');
        $peg = $this->user('1234567890123441', 'PEG');
        $type = LeaveType::create(['name' => 'Cuti Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => false]);
        $leave = LeaveRequest::create([
            'employee_id' => $peg->employee_id, 'leave_type_id' => $type->id,
            'start_date' => now()->addWeek()->toDateString(), 'end_date' => now()->addWeek()->toDateString(),
            'total_days' => 1, 'status' => 'Disetujui Kepala Bagian', 'submitted_at' => now(), 'created_by' => $hrd->id,
        ]);
        $this->actingAs($hrd)->postJson("/api/leaves/{$leave->id}/approve")->assertOk();
        $this->assertDatabaseHas('employee_documents', ['employee_id' => $peg->employee_id, 'document_type' => 'SK Cuti']);

        $this->actingAs($hrd)->postJson("/api/leaves/{$leave->id}/cancel")->assertOk();
        $this->assertDatabaseMissing('employee_documents', ['employee_id' => $peg->employee_id, 'document_type' => 'SK Cuti']);
    }
}
