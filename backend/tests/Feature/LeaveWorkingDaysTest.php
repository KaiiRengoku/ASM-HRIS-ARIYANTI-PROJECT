<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class LeaveWorkingDaysTest extends TestCase
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

    private function buatAnnualDenganSaldo(Employee $employee): LeaveType
    {
        $type = LeaveType::create([
            'name' => 'Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => true,
        ]);
        LeaveBalance::create([
            'employee_id' => $employee->id,
            'leave_type_id' => $type->id,
            'period_year' => date('Y'),
            'entitled_days' => 20,
            'used_days' => 0,
            'adjustment_days' => 0,
            'remaining_days' => 20,
        ]);

        return $type;
    }

    private function weekendFuture(): array
    {
        $sat = Carbon::now()->next(Carbon::SATURDAY);
        while (Carbon::today()->diffInDays($sat, false) < 7) {
            $sat->addWeek();
        }

        return [$sat->toDateString(), $sat->copy()->addDay()->toDateString()];
    }

    private function fridayMondayFuture(): array
    {
        $fri = Carbon::now()->next(Carbon::FRIDAY);
        while (Carbon::today()->diffInDays($fri, false) < 7) {
            $fri->addWeek();
        }

        return [$fri->toDateString(), $fri->copy()->addDays(3)->toDateString()];
    }

    public function test_post_rentang_weekend_ditolak_400(): void
    {
        $peg = $this->buatUser('1234567890123456', 'PEG');
        $employee = Employee::find($peg->employee_id);
        $type = $this->buatAnnualDenganSaldo($employee);
        [$sat, $sun] = $this->weekendFuture();

        $this->actingAs($peg)->postJson('/api/leaves', [
            'leave_type_id' => $type->id,
            'start_date' => $sat,
            'end_date' => $sun,
        ])->assertStatus(400)->assertJsonFragment(['message' => 'Total hari kerja 0. Rentang hanya berisi akhir pekan/libur.']);
    }

    public function test_post_jumat_senin_total_dua_hari_kerja(): void
    {
        $peg = $this->buatUser('1234567890123456', 'PEG');
        $employee = Employee::find($peg->employee_id);
        $type = $this->buatAnnualDenganSaldo($employee);
        [$fri, $mon] = $this->fridayMondayFuture();

        $this->actingAs($peg)->postJson('/api/leaves', [
            'leave_type_id' => $type->id,
            'start_date' => $fri,
            'end_date' => $mon,
        ])->assertOk()->assertJsonPath('data.total_days', '2.00');
    }

    public function test_put_hrd_ke_rentang_weekend_ditolak_400(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');
        $peg = $this->buatUser('1234567890123457', 'PEG');
        $employee = Employee::find($peg->employee_id);
        $type = $this->buatAnnualDenganSaldo($employee);
        [$fri, $mon] = $this->fridayMondayFuture();
        [$sat, $sun] = $this->weekendFuture();

        $leave = LeaveRequest::create([
            'employee_id' => $employee->id,
            'leave_type_id' => $type->id,
            'start_date' => $fri,
            'end_date' => $mon,
            'total_days' => 2,
            'status' => 'Pending',
            'submitted_at' => now(),
            'created_by' => $hrd->id,
        ]);

        $this->actingAs($hrd)->putJson("/api/leaves/{$leave->id}", [
            'leave_type_id' => $type->id,
            'start_date' => $sat,
            'end_date' => $sun,
            'reason' => 'ubah jadwal',
        ])->assertStatus(400)->assertJsonFragment(['message' => 'Total hari kerja 0. Rentang hanya berisi akhir pekan/libur.']);
    }
}
