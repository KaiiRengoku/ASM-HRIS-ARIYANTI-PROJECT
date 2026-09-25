<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveBalanceTransaction;
use App\Models\LeaveType;
use App\Services\LeaveCalculationService;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class AccrueAnnualLeave extends Command
{
    protected $signature = 'leave:accrue {--year= : Tahun berjalan jika kosong} {--carry-over : Bawa sisa cuti tahun sebelumnya}';

    protected $description = 'Akrual otomatis jatah cuti tahunan seluruh pegawai (dijadwalkan tiap 1 Januari)';

    public function handle(): int
    {
        $year = (int) ($this->option('year') ?: now()->year);
        $annual = LeaveType::where('code', 'ANNUAL')->first();
        if (!$annual) {
            $this->error('Jenis cuti ANNUAL tidak ditemukan.');
            return self::FAILURE;
        }

        $created = 0;
        $skipped = 0;
        DB::transaction(function () use ($annual, $year, &$created, &$skipped) {
            foreach (Employee::all() as $employee) {
                if (LeaveBalance::where('employee_id', $employee->id)
                    ->where('leave_type_id', $annual->id)
                    ->where('period_year', $year)
                    ->exists()) {
                    $skipped++;
                    continue;
                }
                $entitled = LeaveCalculationService::entitledDays($employee, $year);
                $prev = (float) (LeaveBalance::where('employee_id', $employee->id)
                    ->where('leave_type_id', $annual->id)
                    ->where('period_year', $year - 1)
                    ->value('remaining_days') ?? 0);
                $remaining = $entitled + $prev;
                try {
                    $balance = LeaveBalance::create([
                        'employee_id' => $employee->id,
                        'leave_type_id' => $annual->id,
                        'period_year' => $year,
                        'entitled_days' => $entitled,
                        'adjustment_days' => $prev,
                        'used_days' => 0,
                        'remaining_days' => $remaining,
                    ]);
                } catch (QueryException $e) {
                    if ($e->getCode() !== '23000') {
                        throw $e;
                    }
                    $skipped++;
                    continue;
                }
                LeaveBalanceTransaction::create([
                    'leave_balance_id' => $balance->id,
                    'employee_id' => $employee->id,
                    'transaction_type' => 'ACCRUAL',
                    'amount' => $remaining,
                    'balance_before' => 0,
                    'balance_after' => $remaining,
                    'reason' => "Akrual otomatis {$year}",
                    'created_by' => null,
                ]);
                AuditLog::create([
                    'user_id' => null,
                    'action' => 'ACCRUE_LEAVE_BALANCE',
                    'auditable_type' => LeaveBalance::class,
                    'auditable_id' => $balance->id,
                    'new_values' => ['period_year' => $year, 'entitled_days' => $entitled, 'remaining_days' => $remaining, 'auto' => true],
                    'created_at' => now(),
                ]);
                $created++;
            }
        });

        $this->info("Akrual {$year}: created={$created}, skipped={$skipped}");
        return self::SUCCESS;
    }
}
