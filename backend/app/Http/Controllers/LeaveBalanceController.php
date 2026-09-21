<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveBalanceTransaction;
use App\Models\LeaveType;
use App\Services\LeaveCalculationService;
use Illuminate\Http\Request;

class LeaveBalanceController extends Controller
{
    public function byEmployee(Request $request, $employeeId)
    {
        $isHrd = $request->user()->roles()->where('code', 'HRD')->exists();
        if (!$isHrd && (int) $employeeId !== (int) $request->user()->employee_id) {
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
}