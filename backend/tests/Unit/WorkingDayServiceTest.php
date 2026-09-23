<?php

namespace Tests\Unit;

use App\Models\Employee;
use App\Models\Holiday;
use App\Models\OrganizationalUnit;
use App\Models\User;
use App\Models\WorkSchedule;
use App\Services\WorkingDayService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkingDayServiceTest extends TestCase
{
    use RefreshDatabase;

    private function buatUser(): User
    {
        $employee = Employee::create([
            'nik' => '1234567890123456',
            'nama_lengkap' => 'User Test',
            'email' => 'usertest@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);
        $user = User::create([
            'nik' => '1234567890123456',
            'name' => 'User Test',
            'email' => 'usertest@example.com',
            'password' => 'password',
        ]);
        $user->employee_id = $employee->id;
        $user->save();

        return $user;
    }

    public function test_libur_aktif_mengurangi_hitungan(): void
    {
        $user = $this->buatUser();
        Holiday::create([
            'date' => '2026-08-17',
            'name' => 'Kemerdekaan',
            'holiday_type' => 'NATIONAL',
            'is_active' => true,
            'created_by' => $user->id,
        ]);

        $this->assertSame(4, WorkingDayService::count('2026-08-17', '2026-08-21', null));
    }

    public function test_sabtu_minggu_nol(): void
    {
        $this->assertSame(0, WorkingDayService::count('2026-08-22', '2026-08-23', null));
    }

    public function test_jadwal_unit_non_kerja_mengurangi(): void
    {
        $unit = OrganizationalUnit::create(['name' => 'Unit A', 'code' => 'UA']);
        WorkSchedule::create([
            'organizational_unit_id' => $unit->id,
            'day_of_week' => 3,
            'start_time' => '08:00',
            'end_time' => '16:00',
            'is_working_day' => false,
            'effective_from' => '2026-01-01',
            'is_active' => true,
        ]);

        $this->assertSame(4, WorkingDayService::count('2026-08-17', '2026-08-21', $unit->id));
    }

    public function test_libur_non_aktif_tidak_mengurangi(): void
    {
        $user = $this->buatUser();
        Holiday::create([
            'date' => '2026-08-17',
            'name' => 'Nonaktif',
            'holiday_type' => 'NATIONAL',
            'is_active' => false,
            'created_by' => $user->id,
        ]);

        $this->assertSame(5, WorkingDayService::count('2026-08-17', '2026-08-21', null));
    }
}
