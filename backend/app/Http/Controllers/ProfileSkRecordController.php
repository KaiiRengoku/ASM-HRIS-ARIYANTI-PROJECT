<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeeSkRecord;
use Illuminate\Http\Request;

// Menangani Riwayat SK pegawai (SK Jabatan Fungsional, SK Angka Kredit/PAK,
// SK Kenaikan Pangkat). Pola izin mengikuti ProfilePositionHistoryController:
// HRD boleh mengelola semua pegawai, pegawai biasa hanya boleh miliknya sendiri.
class ProfileSkRecordController extends Controller
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

        $records = EmployeeSkRecord::with('document')->where('employee_id', $employee->id)
            ->orderByDesc('tanggal_sk')
            ->orderByDesc('id')
            ->get();

        return response()->json(['success' => true, 'data' => $records]);
    }

    private function rules(): array
    {
        return [
            'jenis_sk' => ['required', 'in:' . implode(',', EmployeeSkRecord::JENIS)],
            'nomor_sk' => ['nullable', 'string', 'max:100'],
            'tanggal_sk' => ['nullable', 'date'],
            'tmt' => ['nullable', 'date'],
            'pejabat_penetap' => ['nullable', 'string', 'max:150'],
            'keterangan' => ['nullable', 'string'],
            'document_id' => ['nullable', 'exists:employee_documents,id'],
        ];
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
        $employee = $this->resolveEmployee($request);
        if (!$this->canManage($request, $employee)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate($this->rules());
        $this->ensureDocumentBelongsTo($employee, $validated['document_id'] ?? null);
        $validated['employee_id'] = $employee->id;

        $record = EmployeeSkRecord::create($validated);

        return response()->json(['success' => true, 'data' => $record->load('document')]);
    }

    public function update(Request $request, EmployeeSkRecord $skRecord)
    {
        if (!$this->canManage($request, $skRecord->employee)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $validated = $request->validate($this->rules());
        $this->ensureDocumentBelongsTo($skRecord->employee, $validated['document_id'] ?? null);

        $skRecord->update($validated);

        return response()->json(['success' => true, 'data' => $skRecord->fresh()->load('document')]);
    }

    public function destroy(Request $request, EmployeeSkRecord $skRecord)
    {
        if (!$this->canManage($request, $skRecord->employee)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }

        $skRecord->delete();

        return response()->json(['success' => true]);
    }

    // Non-HRD selalu terkunci ke employee miliknya sendiri, betapapun
    // employee_id yang dikirim di request. HRD bebas memilih pegawai.
    private function resolveEmployee(Request $request): Employee
    {
        $user = $request->user();
        if ($user->hasRole('HRD') && $request->filled('employee_id')) {
            return Employee::findOrFail((int) $request->input('employee_id'));
        }

        return Employee::findOrFail($user->employee_id);
    }
}
