<?php

namespace Tests\Unit;

use App\Models\Employee;
use App\Services\LeaveCalculationService;
use Tests\TestCase;

class LeaveCalculationServiceTest extends TestCase
{
    private function emp(string $tanggalMasuk): Employee
    {
        $e = new Employee();
        $e->tanggal_masuk_kerja = $tanggalMasuk;
        return $e;
    }

    public function test_new_employee_under_one_year_gets_zero(): void
    {
        $this->assertSame(0.0, LeaveCalculationService::entitledDays($this->emp('2026-03-01'), 2026));
    }

    public function test_first_year_accrual_jan_jun_gets_six(): void
    {
        $this->assertSame(6.0, LeaveCalculationService::entitledDays($this->emp('2025-04-01'), 2026));
    }

    public function test_first_year_accrual_jul_dec_defers_to_january(): void
    {
        $this->assertSame(0.0, LeaveCalculationService::entitledDays($this->emp('2025-09-01'), 2026));
        $this->assertSame(6.0, LeaveCalculationService::entitledDays($this->emp('2025-09-01'), 2027));
    }

    public function test_tier_by_service_years(): void
    {
        $this->assertSame(12.0, LeaveCalculationService::entitledDays($this->emp('2022-01-01'), 2026));
        $this->assertSame(14.0, LeaveCalculationService::entitledDays($this->emp('2018-01-01'), 2026));
        $this->assertSame(18.0, LeaveCalculationService::entitledDays($this->emp('2015-01-01'), 2026));
        $this->assertSame(21.0, LeaveCalculationService::entitledDays($this->emp('2008-01-01'), 2026));
        $this->assertSame(26.0, LeaveCalculationService::entitledDays($this->emp('2000-01-01'), 2026));
    }
}