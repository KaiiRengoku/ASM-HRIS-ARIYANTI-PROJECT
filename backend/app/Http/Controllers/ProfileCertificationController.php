<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeeCertification;
use Illuminate\Http\Request;

class ProfileCertificationController extends Controller
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

        if ((int) $employeeId !== (int) $request->user()->employee_id && !$request->user()->hasPermission('employee.view')) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $items = EmployeeCertification::with('document')->where('employee_id', $employee->id)
            ->orderByDesc('issued_at')
            ->get();

        return response()->json(['success' => true, 'data' => $items]);
    }

    private function rules(): array
    {
        return [
            'category' => ['required', 'in:' . implode(',', EmployeeCertification::CATEGORIES)],
            'name' => ['required', 'string', 'max:200'],
            'organizer' => ['nullable', 'string', 'max:200'],
            'certificate_number' => ['nullable', 'string', 'max:100'],
            'issued_at' => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:issued_at'],
            'duration' => ['nullable', 'string', 'max:100'],
            'participant_role' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'document_id' => ['nullable', 'exists:employee_documents,id'],
        ];
    }

    private function resolveEmployee(Request $request, ?int $employeeId): Employee
    {
        return Employee::findOrFail($employeeId ?: $request->user()->employee_id);
    }

    private function ensureDocumentBelongsTo(Employee $employee, ?int $documentId): void
    {
        if ($documentId === null) {
            return;
        }
        abort_if(!$employee->documents()->find($documentId), 422, 'Dokumen harus milik pegawai yang sama.');
    }

    public function store(Request $request)
    {
        $employee = $this->resolveEmployee($request, $request->input('employee_id') ? (int) $request->input('employee_id') : null);
        if (!$this->canManage($request, $employee)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate($this->rules());
        $this->ensureDocumentBelongsTo($employee, $validated['document_id'] ?? null);
        $validated['employee_id'] = $employee->id;

        $item = EmployeeCertification::create($validated);

        return response()->json(['success' => true, 'data' => $item]);
    }

    public function update(Request $request, EmployeeCertification $certification)
    {
        if (!$this->canManage($request, $certification->employee)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate($this->rules());
        $this->ensureDocumentBelongsTo($certification->employee, $validated['document_id'] ?? null);

        $certification->update($validated);

        return response()->json(['success' => true, 'data' => $certification->fresh()]);
    }

    public function destroy(Request $request, EmployeeCertification $certification)
    {
        if (!$this->canManage($request, $certification->employee)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $certification->delete();

        return response()->json(['success' => true]);
    }
}
