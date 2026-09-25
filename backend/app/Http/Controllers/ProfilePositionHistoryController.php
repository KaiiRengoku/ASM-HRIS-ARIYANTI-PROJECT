<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeePositionHistory;
use Illuminate\Http\Request;

class ProfilePositionHistoryController extends Controller
{
    private function canManage(Request $request, Employee $employee): bool
    {
        return $request->user()->hasRole('HRD') || (int) $employee->id === (int) $request->user()->employee_id;
    }

    public function index(Request $request)
    {
        $employeeId = $request->query('employee_id') ?: $request->user()->employee_id;
        if (!$employeeId) {
            return response()->json(['success' => true, 'data' => []]);
        }
        $employee = Employee::findOrFail($employeeId);

        // Pegawai lain cukup bisa melihat riwayat dirinya; perubahan data pegawai via hak employee.view sudah ter-guard route pegawai.
        if ((int) $employeeId !== (int) $request->user()->employee_id && !$request->user()->hasPermission('employee.view')) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $histories = EmployeePositionHistory::where('employee_id', $employee->id)
            ->orderByDesc('start_date')
            ->get();

        return response()->json(['success' => true, 'data' => $histories]);
    }

    public function store(Request $request)
    {
        $employee = Employee::findOrFail($request->input('employee_id') ?: $request->user()->employee_id);
        if (!$this->canManage($request, $employee)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'jabatan' => ['required', 'string', 'max:150'],
            'unit_kerja' => ['nullable', 'string', 'max:150'],
            'no_sk' => ['nullable', 'string', 'max:100'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'keterangan' => ['nullable', 'string', 'max:255'],
        ]);
        $validated['employee_id'] = $employee->id;

        $history = EmployeePositionHistory::create($validated);

        return response()->json(['success' => true, 'data' => $history]);
    }

    public function update(Request $request, EmployeePositionHistory $positionHistory)
    {
        if (!$this->canManage($request, $positionHistory->employee)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate([
            'jabatan' => ['required', 'string', 'max:150'],
            'unit_kerja' => ['nullable', 'string', 'max:150'],
            'no_sk' => ['nullable', 'string', 'max:100'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'keterangan' => ['nullable', 'string', 'max:255'],
        ]);

        $positionHistory->update($validated);

        return response()->json(['success' => true, 'data' => $positionHistory->fresh()]);
    }

    public function destroy(Request $request, EmployeePositionHistory $positionHistory)
    {
        if (!$this->canManage($request, $positionHistory->employee)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $positionHistory->delete();

        return response()->json(['success' => true]);
    }
}
