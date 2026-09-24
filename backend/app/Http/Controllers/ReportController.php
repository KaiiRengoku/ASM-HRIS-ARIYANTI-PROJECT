<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\LeaveRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

class ReportController extends Controller
{
    private function audit(Request $request, string $endpoint, string $type, int $id)
    {
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'EXPORT_REPORT',
            'auditable_type' => $type,
            'auditable_id' => $id,
            'new_values' => ['endpoint' => $endpoint, 'filter' => $request->query()],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);
    }

public function exportEmployees(Request $request)
{
    $employees = Employee::with(['position', 'organizationalUnit'])->get();

    $fh = fopen('php://temp', 'r+');
    fputcsv($fh, ['NIK', 'Nama', 'Email', 'Jabatan', 'Unit', 'Status', 'Telepon', 'Tanggal Masuk']);
    foreach ($employees as $emp) {
        fputcsv($fh, [
            $emp->nik,
            $emp->nama_lengkap,
            $emp->email,
            $emp->position?->name ?? '',
            $emp->organizationalUnit?->name ?? '',
            $emp->status_kepegawaian ?? '',
            $emp->nomor_hp ?? '',
            $emp->tanggal_masuk_kerja ?? '',
        ]);
    }
    rewind($fh);
    $csv = stream_get_contents($fh);
    fclose($fh);

    $this->audit($request, 'reports/employees/export', Employee::class, 0);

    return Response::make($csv, 200, [
        'Content-Type' => 'text/csv',
        'Content-Disposition' => 'attachment; filename="pegawai_' . date('Y-m-d') . '.csv"',
    ]);
}

public function exportLeaves(Request $request)
{
    $leaves = $this->leaveQuery($request)->get();

    $fh = fopen('php://temp', 'r+');
    fputcsv($fh, ['Pegawai', 'Jenis', 'Tanggal Mulai', 'Tanggal Selesai', 'Total Hari', 'Status']);
    foreach ($leaves as $l) {
        fputcsv($fh, [
            $l->employee->nama_lengkap ?? '',
            $l->leaveType->name ?? '',
            $l->start_date,
            $l->end_date,
            $l->total_days,
            $l->status,
        ]);
    }
    rewind($fh);
    $csv = stream_get_contents($fh);
    fclose($fh);

    $this->audit($request, 'reports/leaves/export', LeaveRequest::class, 0);

    return Response::make($csv, 200, [
        'Content-Type' => 'text/csv',
        'Content-Disposition' => 'attachment; filename="cuti_' . date('Y-m-d') . '.csv"',
    ]);
}

private function leaveQuery(Request $request)
{
    $request->validate([
        'status' => 'nullable|string',
        'leave_type_id' => 'nullable|exists:leave_types,id',
        'employee_id' => 'nullable|exists:employees,id',
        'from' => 'nullable|date',
        'to' => 'nullable|date|after_or_equal:from',
    ], [
        'status.string' => 'Status harus berupa teks.',
        'leave_type_id.exists' => 'Jenis cuti tidak valid.',
        'employee_id.exists' => 'Pegawai tidak valid.',
        'from.date' => 'Tanggal mulai tidak valid.',
        'to.date' => 'Tanggal selesai tidak valid.',
        'to.after_or_equal' => 'Tanggal selesai harus setelah atau sama dengan tanggal mulai.',
    ]);

    $query = LeaveRequest::with(['employee', 'leaveType']);

    if ($request->filled('from') || $request->filled('to')) {
        if ($request->filled('from')) {
            $query->where('created_at', '>=', \Carbon\Carbon::parse($request->from)->startOfDay());
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', \Carbon\Carbon::parse($request->to)->endOfDay());
        }
    } else {
        $query->whereBetween('created_at', [now()->startOfYear(), now()->endOfYear()]);
    }

    return $query
        ->when($request->filled('status'), fn ($q) => $q->where('status', $request->status))
        ->when($request->filled('leave_type_id'), fn ($q) => $q->where('leave_type_id', $request->leave_type_id))
        ->when($request->filled('employee_id'), fn ($q) => $q->where('employee_id', $request->employee_id));
}

public function exportEmployeesExcel(Request $request)
{
    $employees = Employee::with(['position', 'organizationalUnit'])->get();
    $rows = '';
    foreach ($employees as $emp) {
        $rows .= '<tr><td>' . e($emp->nik) . '</td><td>' . e($emp->nama_lengkap) . '</td><td>' . e($emp->email) . '</td><td>' . e($emp->position?->name ?? '') . '</td><td>' . e($emp->organizationalUnit?->name ?? '') . '</td><td>' . e($emp->status_kepegawaian ?? '') . '</td><td>' . e($emp->nomor_hp ?? '') . '</td><td>' . e($emp->tanggal_masuk_kerja ?? '') . '</td></tr>';
    }
    $html = '<table border="1"><tr><th>NIK</th><th>Nama</th><th>Email</th><th>Jabatan</th><th>Unit</th><th>Status</th><th>Telepon</th><th>Tanggal Masuk</th></tr>' . $rows . '</table>';
    $this->audit($request, 'reports/employees/excel', Employee::class, 0);
    return Response::make($html, 200, [
        'Content-Type' => 'application/vnd.ms-excel',
        'Content-Disposition' => 'attachment; filename="pegawai_' . date('Y-m-d') . '.xls"',
    ]);
}

public function exportLeavesExcel(Request $request)
{
    $leaves = $this->leaveQuery($request)->get();
    $rows = '';
    foreach ($leaves as $l) {
        $rows .= '<tr><td>' . e($l->employee->nama_lengkap ?? '') . '</td><td>' . e($l->leaveType->name ?? '') . '</td><td>' . e($l->start_date) . '</td><td>' . e($l->end_date) . '</td><td>' . e($l->total_days) . '</td><td>' . e($l->status) . '</td></tr>';
    }
    $html = '<table border="1"><tr><th>Pegawai</th><th>Jenis</th><th>Mulai</th><th>Selesai</th><th>Total</th><th>Status</th></tr>' . $rows . '</table>';
    $this->audit($request, 'reports/leaves/excel', LeaveRequest::class, 0);
    return Response::make($html, 200, [
        'Content-Type' => 'application/vnd.ms-excel',
        'Content-Disposition' => 'attachment; filename="cuti_' . date('Y-m-d') . '.xls"',
    ]);
}

private function canViewBiodata(Request $request, int $employeeId): bool
{
    if ($request->user()->roles()->whereIn('code', ['HRD', 'DIREKTUR', 'PD_I', 'PD_II', 'PD_III'])->exists()) {
        return true;
    }
    return $employeeId === (int) $request->user()->employee_id;
}

public function exportBiodataPdf(Request $request, $id)
{
    if (!$this->canViewBiodata($request, (int) $id)) {
        return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
    }
    $employee = Employee::with(['position', 'organizationalUnit', 'educations', 'functional', 'teachingAssignments', 'user.roles'])->findOrFail($id);
    $isDosen = (bool) $employee->is_dosen;
    $isPegawai = $isDosen || collect($employee->user?->roles)->contains(fn ($r) => ($r['code'] ?? $r) === 'PEG');
    $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.biodata', compact('employee', 'isDosen', 'isPegawai'));
    $this->audit($request, 'reports/biodata-pdf/' . $id, Employee::class, (int) $id);
    return $pdf->download('biodata_' . $employee->nik . '.pdf');
}

public function exportBiodataWord(Request $request, $id)
{
    if (!$this->canViewBiodata($request, (int) $id)) {
        return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
    }
    $employee = Employee::with(['position', 'organizationalUnit', 'educations', 'functional', 'teachingAssignments', 'user.roles'])->findOrFail($id);
    $isDosen = (bool) $employee->is_dosen;
    $isPegawai = $isDosen || collect($employee->user?->roles)->contains(fn ($r) => ($r['code'] ?? $r) === 'PEG');
    $html = view('pdf.biodata', compact('employee', 'isDosen', 'isPegawai'))->render();
    $filename = 'biodata_' . $employee->nik . '.doc';
    $this->audit($request, 'reports/biodata-word/' . $id, Employee::class, (int) $id);
    return Response::make($html, 200, [
        'Content-Type' => 'application/msword',
        'Content-Disposition' => 'attachment; filename="' . $filename . '"',
    ]);
}

public function exportEmployeesPdf(Request $request)
{
    $employees = Employee::with(['position', 'organizationalUnit'])->get();
    $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.employees', compact('employees'));
    $this->audit($request, 'reports/employees/pdf', Employee::class, 0);
    return $pdf->download('pegawai_' . date('Y-m-d') . '.pdf');
}

public function exportLeavesPdf(Request $request)
{
    $leaves = $this->leaveQuery($request)->get();
    $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.leaves', compact('leaves'));
    $this->audit($request, 'reports/leaves/pdf', LeaveRequest::class, 0);
    return $pdf->download('cuti_' . date('Y-m-d') . '.pdf');
}
}