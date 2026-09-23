<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Holiday;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\OrganizationalUnit;
use App\Models\Role;
use App\Models\User;
use App\Models\WorkSchedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CalendarViewTest extends TestCase
{
    use RefreshDatabase;

    private function buatUser(string $nik, ?string $roleCode = null): User
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
        ]);
        $user->employee_id = $employee->id;
        $user->save();
        if ($roleCode) {
            $role = Role::firstOrCreate(['code' => $roleCode], ['name' => $roleCode]);
            $user->roles()->attach($role->id);
        }

        return $user;
    }

    public function test_kalender_gabungan_menampilkan_libur_jadwal_dan_cuti_overlap(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');

        Holiday::create([
            'date' => '2026-10-17',
            'name' => 'Libur Uji',
            'holiday_type' => 'NATIONAL',
            'is_active' => true,
            'created_by' => $hrd->id,
        ]);
        WorkSchedule::create([
            'day_of_week' => 1,
            'start_time' => '08:00',
            'end_time' => '16:00',
            'is_working_day' => true,
            'effective_from' => '2026-10-01',
            'is_active' => true,
        ]);
        $type = LeaveType::create([
            'name' => 'Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => false,
        ]);
        $pending = LeaveRequest::create([
            'employee_id' => $hrd->employee_id,
            'leave_type_id' => $type->id,
            'start_date' => '2026-10-16',
            'end_date' => '2026-10-18',
            'total_days' => 3,
            'status' => 'Pending',
            'submitted_at' => now(),
            'created_by' => $hrd->id,
        ]);
        $ditolak = LeaveRequest::create([
            'employee_id' => $hrd->employee_id,
            'leave_type_id' => $type->id,
            'start_date' => '2026-10-16',
            'end_date' => '2026-10-18',
            'total_days' => 3,
            'status' => 'Ditolak HRD',
            'submitted_at' => now(),
            'created_by' => $hrd->id,
        ]);

        $response = $this->actingAs($hrd)->getJson('/api/calendar-view?from=2026-10-01&to=2026-10-31');

        $response->assertOk()->assertJsonPath('success', true);
        $response->assertJsonStructure(['success', 'data' => ['holidays', 'schedules', 'leaves'], 'meta']);
        $dates = array_map(fn ($d) => substr($d, 0, 10), array_column($response->json('data.holidays'), 'date'));
        $this->assertContains('2026-10-17', $dates);
        $ids = array_column($response->json('data.leaves'), 'id');
        $this->assertContains($pending->id, $ids);
        $this->assertNotContains($ditolak->id, $ids);
    }

    public function test_pegawai_hanya_melihat_cuti_sendiri(): void
    {
        $peg = $this->buatUser('1234567890123456', 'PEG');
        $lain = $this->buatUser('1234567890123457');
        $type = LeaveType::create([
            'name' => 'Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => false,
        ]);
        $milik = LeaveRequest::create([
            'employee_id' => $peg->employee_id, 'leave_type_id' => $type->id,
            'start_date' => '2026-10-16', 'end_date' => '2026-10-18',
            'total_days' => 3, 'status' => 'Pending', 'submitted_at' => now(), 'created_by' => $peg->id,
        ]);
        $orangLain = LeaveRequest::create([
            'employee_id' => $lain->employee_id, 'leave_type_id' => $type->id,
            'start_date' => '2026-10-16', 'end_date' => '2026-10-18',
            'total_days' => 3, 'status' => 'Pending', 'submitted_at' => now(), 'created_by' => $peg->id,
        ]);

        $response = $this->actingAs($peg)->getJson('/api/calendar-view?from=2026-10-01&to=2026-10-31');

        $response->assertOk()->assertJsonPath('success', true);
        $ids = array_column($response->json('data.leaves'), 'id');
        $this->assertContains($milik->id, $ids);
        $this->assertNotContains($orangLain->id, $ids);
    }

    public function test_validasi_from_to_dan_rentang_maksimal(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');

        $this->actingAs($hrd)->getJson('/api/calendar-view')->assertStatus(422);
        $this->actingAs($hrd)->getJson('/api/calendar-view?from=2026-01-01&to=2027-01-02')->assertStatus(422);
        $this->actingAs($hrd)->getJson('/api/calendar-view?from=2026-10-01&to=2026-10-31&per_page=0')->assertStatus(422);
        $this->actingAs($hrd)->getJson('/api/calendar-view?from=2026-10-01&to=2026-10-31&per_page=abc')->assertStatus(422);
    }

    public function test_exclusion_filter_unit_dan_cap_per_page(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');
        $unit = OrganizationalUnit::create(['name' => 'Unit A', 'code' => 'UA']);
        WorkSchedule::create([
            'organizational_unit_id' => $unit->id, 'day_of_week' => 1,
            'start_time' => '08:00', 'end_time' => '16:00',
            'is_working_day' => true, 'effective_from' => '2026-10-01', 'is_active' => true,
        ]);
        WorkSchedule::create([
            'day_of_week' => 2, 'start_time' => '08:00', 'end_time' => '16:00',
            'is_working_day' => true, 'effective_from' => '2026-10-01', 'is_active' => true,
        ]);
        $type = LeaveType::create([
            'name' => 'Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => false,
        ]);
        $mk = fn (string $status) => LeaveRequest::create([
            'employee_id' => $hrd->employee_id, 'leave_type_id' => $type->id,
            'start_date' => '2026-10-16', 'end_date' => '2026-10-18',
            'total_days' => 3, 'status' => $status, 'submitted_at' => now(), 'created_by' => $hrd->id,
        ]);
        $mk('Ditolak Kepala Bagian'); $mk('Cancelled'); $ok = $mk('Pending');

        $response = $this->actingAs($hrd)->getJson("/api/calendar-view?from=2026-10-01&to=2026-10-31&unit_id={$unit->id}");
        $ids = array_column($response->json('data.leaves'), 'id');
        $this->assertContains($ok->id, $ids);
        $this->assertCount(1, $ids);
        $this->assertCount(2, $response->json('data.schedules'));

        $this->actingAs($hrd)->getJson('/api/calendar-view?from=2026-10-01&to=2026-10-31&per_page=101')->assertStatus(422);
    }
}
