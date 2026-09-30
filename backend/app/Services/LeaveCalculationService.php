<?php

namespace App\Services;

use App\Models\Employee;

class LeaveCalculationService
{
    /**
     * Jatah cuti tahunan awal.
     *
     * Sistem tidak lagi menghitung hak cuti berdasarkan masa kerja.
     * Jatah awal seragam 12 hari; penyesuaian (kuota berbeda per orang)
     * dilakukan HRD secara manual melalui leave-balances/adjust.
     */
    public const DEFAULT_ENTITLED_DAYS = 12.0;

    public static function entitledDays(Employee $employee, int $year): float
    {
        return self::DEFAULT_ENTITLED_DAYS;
    }
}
