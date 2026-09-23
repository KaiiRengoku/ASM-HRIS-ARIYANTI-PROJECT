<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;

class ProfileTeachingAssignmentController extends Controller
{
    private function isDosen($employee): bool
    {
        return $employee?->position?->code === 'DOSEN';
    }

    public function index(Request $request)
    {
        $user = $request->user()->load(['employee.position', 'roles']);
        $isPegawai = $this->isDosen($user->employee)
            || collect($user->roles)->contains(fn ($r) => ($r['code'] ?? $r) === 'PEG');
        $employeeId = $request->query('employee_id');

        if ($employeeId && (int) $employeeId !== (int) $user->employee->id && !$user->hasRole('HRD')) {
            abort(403, 'Hanya HRD yang dapat melihat data employee lain.');
        }
        if (!$employeeId && !$isPegawai && !$user->hasRole('HRD')) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $assignments = TeachingAssignment::where('employee_id', $employeeId ?: $user->employee->id)->get();

        return response()->json(['success' => true, 'data' => $assignments]);
    }

    public function store(Request $request)
    {
        $user = $request->user()->load(['employee.position', 'roles']);
        $isPegawai = $this->isDosen($user->employee)
            || collect($user->roles)->contains(fn ($r) => ($r['code'] ?? $r) === 'PEG');
        if (!$isPegawai && !$user->hasRole('HRD')) {
            abort(403, 'Mata kuliah hanya untuk Dosen/Pegawai.');
        }

        $validated = $request->validate([
            'employee_id' => ['nullable', 'exists:employees,id'],
            'kode_matkul' => ['nullable', 'string', 'max:50'],
            'nama_matkul' => ['nullable', 'string', 'max:150'],
            'sks' => ['nullable', 'numeric', 'min:0', 'max:99.9'],
            'semester' => ['nullable', 'string', 'max:50'],
            'program_studi' => ['nullable', 'string', 'max:150'],
            'kelas' => ['nullable', 'string', 'max:50'],
        ]);

        $employeeId = $validated['employee_id'] ?? $user->employee->id;
        if ((int) $employeeId !== (int) $user->employee->id && !$user->hasRole('HRD')) {
            abort(403, 'Hanya HRD yang dapat menambah mata kuliah milik orang lain.');
        }

        $employee = Employee::findOrFail($employeeId);
        $validated['employee_id'] = $employee->id;

        $assignment = TeachingAssignment::create($validated);

        return response()->json(['success' => true, 'data' => $assignment]);
    }

    public function update(Request $request, TeachingAssignment $teachingAssignment)
    {
        $user = $request->user();
        $user->employee?->loadMissing('position');
        if (!$user->hasRole('HRD') && !$this->isDosen($user->employee) && !$user->hasRole('PEG')) {
            abort(403, 'Mata kuliah hanya untuk Dosen/Pegawai.');
        }
        if ((int) $teachingAssignment->employee_id !== (int) $user->employee->id && !$user->hasRole('HRD')) {
            abort(403, 'Hanya HRD yang dapat mengubah mata kuliah milik orang lain.');
        }

        $validated = $request->validate([
            'kode_matkul' => ['nullable', 'string', 'max:50'],
            'nama_matkul' => ['nullable', 'string', 'max:150'],
            'sks' => ['nullable', 'numeric', 'min:0', 'max:99.9'],
            'semester' => ['nullable', 'string', 'max:50'],
            'program_studi' => ['nullable', 'string', 'max:150'],
            'kelas' => ['nullable', 'string', 'max:50'],
        ]);

        $teachingAssignment->update($validated);

        return response()->json(['success' => true, 'data' => $teachingAssignment->fresh()]);
    }

    public function destroy(Request $request, TeachingAssignment $teachingAssignment)
    {
        $user = $request->user();
        $user->employee?->loadMissing('position');
        if (!$user->hasRole('HRD') && !$this->isDosen($user->employee) && !$user->hasRole('PEG')) {
            abort(403, 'Mata kuliah hanya untuk Dosen/Pegawai.');
        }
        if ((int) $teachingAssignment->employee_id !== (int) $user->employee->id && !$user->hasRole('HRD')) {
            abort(403, 'Hanya HRD yang dapat menghapus mata kuliah milik orang lain.');
        }

        $teachingAssignment->delete();

        return response()->json(['success' => true]);
    }
}
