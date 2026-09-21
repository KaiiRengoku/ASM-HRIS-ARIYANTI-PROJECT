<?php

namespace App\Services;

use App\Models\Employee;
use Illuminate\Support\Carbon;

class LeaveCalculationService
{
    public static function entitledDays(Employee $employee, int $year): float
    {
        if (!$employee->tanggal_masuk_kerja) {
            return 12;
        }

        $masuk = Carbon::parse($employee->tanggal_masuk_kerja);
        $periodStart = Carbon::create($year, 1, 1);
        $periodEnd = Carbon::create($year, 12, 31);
        $anniversary = $masuk->copy()->addYear();

        if ($anniversary->gt($periodEnd)) {
            return 0;
        }

        $firstAccrualYear = $anniversary->month <= 6 ? $anniversary->year : $anniversary->year + 1;
        if ($firstAccrualYear > $year) {
            return 0;
        }
        if ($year === $firstAccrualYear) {
            return 6;
        }

        $years = (int) $masuk->diffInYears($periodStart);
        if ($years < 5) return 12;
        if ($years <= 10) return 14;
        if ($years <= 15) return 18;
        if ($years <= 20) return 21;
        return 26;
    }
}