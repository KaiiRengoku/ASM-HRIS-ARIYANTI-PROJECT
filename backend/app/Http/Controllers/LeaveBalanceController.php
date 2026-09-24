<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveBalanceTransaction;
use App\Models\LeaveType;
use App\Services\LeaveCalculationService;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class LeaveBalanceController extends Controller
{
    public function byEmployee(Request $request, $employeeId)
    {
        $canViewAll = $request->user()->roles()->whereIn('code', ['HRD', 'KABAG', 'DIREKTUR', 'PD_I', 'PD_II', 'PD_III'])->exists();
        if (!$canViewAll && (int) $employeeId !== (int) $request->user()->employee_id) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }
        $balances = LeaveBalance::with('leaveType')
            ->where('employee_id', $employeeId)
            ->where('period_year', date('Y'))
            ->get();

        return response()->json(['success' => true, 'data' => $balances]);
    }

    public function adjust(Request $request)
    {
        $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'leave_type_id' => ['required', 'exists:leave_types,id'],
            'amount' => ['required', 'numeric'],
            'reason' => ['required', 'string'],
        ]);

        $balance = LeaveBalance::where('employee_id', $request->employee_id)
            ->where('leave_type_id', $request->leave_type_id)
            ->where('period_year', date('Y'))
            ->first();

        if (!$balance) {
            $employee = Employee::findOrFail($request->employee_id);
            $entitled = LeaveCalculationService::entitledDays($employee, (int) date('Y'));
            $balance = LeaveBalance::create([
                'employee_id' => $request->employee_id,
                'leave_type_id' => $request->leave_type_id,
                'period_year' => date('Y'),
                'entitled_days' => $entitled,
                'adjustment_days' => 0,
                'used_days' => 0,
                'remaining_days' => $entitled,
            ]);
        }

        $before = $balance->remaining_days;
        $balance->adjustment_days += $request->amount;
        $balance->remaining_days = $balance->entitled_days + $balance->adjustment_days - $balance->used_days;
        $balance->save();

        LeaveBalanceTransaction::create([
            'leave_balance_id' => $balance->id,
            'employee_id' => $request->employee_id,
            'transaction_type' => 'ADJUSTMENT',
            'amount' => $request->amount,
            'balance_before' => $before,
            'balance_after' => $balance->remaining_days,
            'reason' => $request->reason,
            'created_by' => $request->user()->id,
        ]);

        \App\Models\AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'ADJUST_LEAVE_BALANCE',
            'auditable_type' => \App\Models\LeaveBalance::class,
            'auditable_id' => $balance->id,
            'old_values' => ['remaining_days' => $before],
            'new_values' => ['remaining_days' => $balance->remaining_days, 'amount' => $request->amount, 'reason' => $request->reason],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json(['success' => true, 'data' => $balance]);
    }

    public function accrue(Request $request)
    {
        $request->validate([
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'employee_ids' => ['nullable', 'array'],
            'employee_ids.*' => ['exists:employees,id'],
            'carry_over' => ['boolean'],
            'carry_reason' => ['required_if:carry_over,true', 'string'],
        ], [
            'year.required' => 'Tahun wajib diisi.',
            'year.integer' => 'Tahun harus berupa angka.',
            'year.min' => 'Tahun minimal 2000.',
            'year.max' => 'Tahun maksimal 2100.',
            'employee_ids.array' => 'Daftar pegawai harus berupa array.',
            'employee_ids.*.exists' => 'Pegawai tidak ditemukan.',
            'carry_over.boolean' => 'Carry over harus berupa boolean.',
            'carry_reason.required_if' => 'Alasan carry over wajib diisi.',
            'carry_reason.string' => 'Alasan carry over harus berupa teks.',
        ]);

        $year = (int) $request->year;
        $carryOver = (bool) $request->input('carry_over', false);
        $annual = LeaveType::where('code', 'ANNUAL')->first();
        if (!$annual) {
            return response()->json(['success' => false, 'message' => 'Jenis cuti ANNUAL tidak ditemukan.'], 404);
        }

        $employees = $request->filled('employee_ids')
            ? Employee::whereIn('id', $request->employee_ids)->get()
            : Employee::all();

        $result = DB::transaction(function () use ($employees, $annual, $year, $carryOver, $request) {
            $created = [];
            $skipped = [];
            foreach ($employees as $employee) {
                $exists = LeaveBalance::where('employee_id', $employee->id)
                    ->where('leave_type_id', $annual->id)
                    ->where('period_year', $year)
                    ->exists();
                if ($exists) {
                    $skipped[] = $employee->id;
                    continue;
                }
                $entitled = LeaveCalculationService::entitledDays($employee, $year);
                $prev = 0;
                if ($carryOver) {
                    $prevBalance = LeaveBalance::where('employee_id', $employee->id)
                        ->where('leave_type_id', $annual->id)
                        ->where('period_year', $year - 1)
                        ->first();
                    $prev = $prevBalance ? (float) $prevBalance->remaining_days : 0;
                }
                $remaining = $entitled + $prev;
                $reason = "Akrual tahunan {$year}" . ($carryOver ? " - {$request->carry_reason}" : '');
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
                    $skipped[] = $employee->id;
                    continue;
                }
                LeaveBalanceTransaction::create([
                    'leave_balance_id' => $balance->id,
                    'employee_id' => $employee->id,
                    'transaction_type' => 'ACCRUAL',
                    'amount' => $remaining,
                    'balance_before' => 0,
                    'balance_after' => $remaining,
                    'reason' => $reason,
                    'created_by' => $request->user()->id,
                ]);
                \App\Models\AuditLog::create([
                    'user_id' => $request->user()->id,
                    'action' => 'ACCRUE_LEAVE_BALANCE',
                    'auditable_type' => \App\Models\LeaveBalance::class,
                    'auditable_id' => $balance->id,
                    'old_values' => null,
                    'new_values' => ['period_year' => $year, 'entitled_days' => $entitled, 'carry_over' => $carryOver, 'remaining_days' => $remaining],
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'created_at' => now(),
                ]);
                $created[] = $balance->id;
            }

            return ['created' => $created, 'skipped' => $skipped];
        });

        return response()->json(['success' => true, 'data' => ['year' => $year] + $result]);
    }
}