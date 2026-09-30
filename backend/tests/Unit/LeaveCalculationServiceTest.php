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

    public function test_jatah_seragam_dua_belas_untuk_semua(): void
    {
        $this->assertSame(12.0, LeaveCalculationService::entitledDays($this->emp('2026-03-01'), 2026));
        $this->assertSame(12.0, LeaveCalculationService::entitledDays($this->emp('2020-01-15'), 2026));
        $this->assertSame(12.0, LeaveCalculationService::entitledDays($this->emp('2000-01-01'), 2026));
    }
}
