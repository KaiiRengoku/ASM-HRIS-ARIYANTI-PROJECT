<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportFilterTest extends TestCase
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

    private function buatCuti(int $employeeId, int $typeId, string $status, string $createdAt, int $createdBy = 1): LeaveRequest
    {
        $leave = LeaveRequest::create([
            'employee_id' => $employeeId,
            'leave_type_id' => $typeId,
            'start_date' => now()->startOfYear()->addMonth()->toDateString(),
            'end_date' => now()->startOfYear()->addMonth()->toDateString(),
            'total_days' => 1,
            'status' => $status,
            'submitted_at' => now(),
            'created_by' => $createdBy,
        ]);
        LeaveRequest::where('id', $leave->id)->update(['created_at' => $createdAt, 'updated_at' => $createdAt]);

        return $leave->refresh();
    }

    public function test_filter_status_hanya_keluarkan_status_diminta(): void
    {
        $hrd = $this->buatUser('1111111111111111', 'HRD');
        $pegA = $this->buatUser('2222222222222222');
        $pegB = $this->buatUser('3333333333333333');
        $type = LeaveType::create(['name' => 'Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => false]);
        $now = now()->startOfYear()->addMonths(2)->toDateTimeString();
        $this->buatCuti($pegA->employee_id, $type->id, 'Pending', $now, $hrd->id);
        $this->buatCuti($pegB->employee_id, $type->id, 'Disetujui HRD', $now, $hrd->id);

        $csv = $this->actingAs($hrd)->get('/api/reports/leaves/export?status=Pending')->getContent();

        $this->assertStringContainsString('Pending', $csv);
        $this->assertStringNotContainsString('Disetujui HRD', $csv);
    }

    public function test_csv_escape_nama_mengandung_koma(): void
    {
        $hrd = $this->buatUser('1111111111111111', 'HRD');
        $peg = $this->buatUser('2222222222222222');
        $peg->employee->update(['nama_lengkap' => 'Doe, John']);
        $type = LeaveType::create(['name' => 'Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => false]);
        $now = now()->startOfYear()->addMonths(2)->toDateTimeString();
        $this->buatCuti($peg->employee_id, $type->id, 'Pending', $now, $hrd->id);

        $csv = $this->actingAs($hrd)->get('/api/reports/leaves/export')->getContent();

        $this->assertStringContainsString('"Doe, John"', $csv);
    }

    public function test_filter_from_to_mengecualikan_di_luar_range(): void
    {
        $hrd = $this->buatUser('1111111111111111', 'HRD');
        $peg = $this->buatUser('2222222222222222');
        $type = LeaveType::create(['name' => 'Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => false]);
        $this->buatCuti($peg->employee_id, $type->id, 'Pending', now()->startOfYear()->addMonths(3)->toDateTimeString(), $hrd->id);
        $this->buatCuti($peg->employee_id, $type->id, 'Pending', now()->startOfYear()->addMonths(6)->toDateTimeString(), $hrd->id);

        $from = now()->startOfYear()->addMonths(2)->toDateString();
        $to = now()->startOfYear()->addMonths(4)->toDateString();
        $csv = $this->actingAs($hrd)->get("/api/reports/leaves/export?from={$from}&to={$to}")->getContent();

        $rows = array_filter(explode("\n", trim($csv)));
        $this->assertCount(2, $rows);
    }

    public function test_filter_leave_type_dan_employee(): void
    {
        $hrd = $this->buatUser('1111111111111111', 'HRD');
        $pegA = $this->buatUser('2222222222222222');
        $pegB = $this->buatUser('3333333333333333');
        $typeA = LeaveType::create(['name' => 'Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => false]);
        $typeB = LeaveType::create(['name' => 'Sakit', 'code' => 'SICK', 'is_leave_balance_deducted' => false]);
        $now = now()->startOfYear()->addMonths(2)->toDateTimeString();
        $this->buatCuti($pegA->employee_id, $typeA->id, 'Pending', $now, $hrd->id);
        $this->buatCuti($pegB->employee_id, $typeB->id, 'Pending', $now, $hrd->id);

        $csvType = $this->actingAs($hrd)->get("/api/reports/leaves/export?leave_type_id={$typeA->id}")->getContent();
        $this->assertStringContainsString('Tahunan', $csvType);
        $this->assertStringNotContainsString('Sakit', $csvType);

        $csvEmp = $this->actingAs($hrd)->get("/api/reports/leaves/export?employee_id={$pegA->employee_id}")->getContent();
        $this->assertStringContainsString('User 2222222222222222', $csvEmp);
        $this->assertStringNotContainsString('User 3333333333333333', $csvEmp);
    }
}
