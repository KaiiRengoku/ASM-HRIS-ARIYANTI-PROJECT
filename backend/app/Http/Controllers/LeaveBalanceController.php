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
        // Rekap/lihat sisa cuti pegawai lain hanya untuk HRD dan pimpinan (DIREKTUR/PD).
        // KABAG menyusul menunggu keputusan tim; saat ini hanya boleh melihat miliknya sendiri.
        $canViewAll = $request->user()->roles()->whereIn('code', ['HRD', 'DIREKTUR', 'PD_I', 'PD_II', 'PD_III'])->exists();
        if (!$canViewAll && (int) $employeeId !== (int) $request->user()->employee_id) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }
        // Tahun periode bisa dipilih eksplisit (mis. cuti lintas tahun dipotong pada
        // tahun start_date oleh LeaveController::approve). Default: tahun berjalan.
        $year = (int) $request->query('year', date('Y'));
        $balances = LeaveBalance::with('leaveType')
            ->where('employee_id', $employeeId)
            ->where('period_year', $year)
            ->get();

        return response()->json(['success' => true, 'data' => $balances]);
    }

    // Daftar ringkasan saldo cuti SELURUH pegawai (khusus HRD & pimpinan).
    // Otorisasi role ditegakkan di rute (role:HRD,DIREKTUR,PD_I,PD_II,PD_III),
    // sehingga KABAG/DOSEN/PEGAWAI tidak dapat menembus endpoint ini.
    public function index(Request $request)
    {
        $query = LeaveBalance::with(['leaveType', 'employee'])
            ->when($request->filled('year'), fn ($q) => $q->where('period_year', (int) $request->year))
            ->when($request->filled('leave_type_id'), fn ($q) => $q->where('leave_type_id', (int) $request->leave_type_id))
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->search;
                $q->whereHas('employee', fn ($e) => $e->where('nama_lengkap', 'like', "%{$search}%")
                    ->orWhere('nik', 'like', "%{$search}%")
                    ->orWhere('nip', 'like', "%{$search}%"));
            })
            ->orderByDesc('period_year')
            ->orderBy('employee_id');

        $balances = $query->get()->map(function (LeaveBalance $b) {
            // Samakan sisa dengan rumus baku backend (LeaveBalanceController::adjust &
            // LeaveController::approve): sisa = jatah + penyesuaian - terpakai.
            // remaining_days dipakai bila ada, tetapi bila tidak konsisten dengan rumus
            // tersebut, nilai hasil rumus yang ditampilkan agar tidak menyesatkan.
            $computed = (float) $b->entitled_days + (float) $b->adjustment_days - (float) $b->used_days;
            $remaining = $b->remaining_days === null ? $computed : (float) $b->remaining_days;
            $isConsistent = $b->remaining_days !== null && abs($remaining - $computed) < 0.005;

            return [
                'id' => $b->id,
                'employee_id' => $b->employee_id,
                'employee' => [
                    'id' => $b->employee?->id,
                    'nama_lengkap' => $b->employee?->nama_lengkap,
                    'nik' => $b->employee?->nik,
                    'nip' => $b->employee?->nip,
                ],
                'leave_type' => [
                    'id' => $b->leaveType?->id,
                    'name' => $b->leaveType?->name,
                    // Sumber kebenaran apakah jenis cuti ini memotong saldo.
                    'is_leave_balance_deducted' => (bool) ($b->leaveType?->is_leave_balance_deducted ?? false),
                ],
                'period_year' => $b->period_year,
                'entitled_days' => (float) $b->entitled_days,
                'adjustment_days' => (float) $b->adjustment_days,
                'used_days' => (float) $b->used_days,
                'remaining_days' => $isConsistent ? (float) $b->remaining_days : $computed,
                'remaining_days_is_consistent' => $isConsistent,
            ];
        });

        return response()->json(['success' => true, 'data' => $balances]);
    }

    public function adjust(Request $request)
    {
        $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'leave_type_id' => ['required', 'exists:leave_types,id'],
            'amount' => ['required', 'numeric', 'between:-365,365'],
            'reason' => ['required', 'string'],
            'year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        // Tahun target penyesuaian. Default tahun berjalan; bisa dipilih eksplisit agar
        // HRD dapat mengoreksi saldo tahun lain (mis. cuti lintas tahun).
        $year = (int) $request->input('year', date('Y'));

        $balance = DB::transaction(function () use ($request, $year) {
            // lockForUpdate: kunci baris saldo selama transaksi agar dua penyesuaian
            // bersamaan (atau penyesuaian vs approval) tidak saling menimpa.
            $balance = LeaveBalance::where('employee_id', $request->employee_id)
                ->where('leave_type_id', $request->leave_type_id)
                ->where('period_year', $year)
                ->lockForUpdate()
                ->first();

            if (!$balance) {
                $employee = Employee::findOrFail($request->employee_id);
                $entitled = LeaveCalculationService::entitledDays($employee, $year);
                $balance = LeaveBalance::create([
                    'employee_id' => $request->employee_id,
                    'leave_type_id' => $request->leave_type_id,
                    'period_year' => $year,
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

            return $balance;
        });

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