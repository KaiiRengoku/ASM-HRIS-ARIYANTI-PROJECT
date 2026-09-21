<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\LeaveRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;

class ReportController extends Controller
{
public function exportEmployees(Request $request)
{
    $employees = Employee::with(['position', 'organizationalUnit'])->get();

    $csv = "NIK,Nama,Email,Jabatan,Unit,Status,Telepon,Tanggal Masuk\n";
    foreach ($employees as $emp) {
        $csv .= implode(',', [
            $emp->nik,
            $emp->nama_lengkap,
            $emp->email,
            $emp->position?->name ?? '',
            $emp->organizationalUnit?->name ?? '',
            $emp->status_kepegawaian ?? '',
            $emp->nomor_hp ?? '',
            $emp->tanggal_masuk_kerja ?? '',
        ]) . "\n";
    }

    return Response::make($csv, 200, [
        'Content-Type' => 'text/csv',
        'Content-Disposition' => 'attachment; filename="pegawai_' . date('Y-m-d') . '.csv"',
    ]);
}

public function exportLeaves(Request $request)
{
    $leaves = LeaveRequest::with(['employee', 'leaveType'])
        ->whereBetween('created_at', [now()->startOfYear(), now()->endOfYear()])
        ->get();

    $csv = "Pegawai,Jenis,Tanggal Mulai,Tanggal Selesai,Total Hari,Status\n";
    foreach ($leaves as $l) {
        $csv .= implode(',', [
            $l->employee->nama_lengkap ?? '',
            $l->leaveType->name ?? '',
            $l->start_date,
            $l->end_date,
            $l->total_days,
            $l->status,
        ]) . "\n";
    }

    return Response::make($csv, 200, [
        'Content-Type' => 'text/csv',
        'Content-Disposition' => 'attachment; filename="cuti_' . date('Y-m-d') . '.csv"',
    ]);
}

public function exportEmployeesExcel(Request $request)
{
    $employees = Employee::with(['position', 'organizationalUnit'])->get();
    $rows = '';
    foreach ($employees as $emp) {
        $rows .= '<tr><td>' . e($emp->nik) . '</td><td>' . e($emp->nama_lengkap) . '</td><td>' . e($emp->email) . '</td><td>' . e($emp->position?->name ?? '') . '</td><td>' . e($emp->organizationalUnit?->name ?? '') . '</td><td>' . e($emp->status_kepegawaian ?? '') . '</td><td>' . e($emp->nomor_hp ?? '') . '</td><td>' . e($emp->tanggal_masuk_kerja ?? '') . '</td></tr>';
    }
    $html = '<table border="1"><tr><th>NIK</th><th>Nama</th><th>Email</th><th>Jabatan</th><th>Unit</th><th>Status</th><th>Telepon</th><th>Tanggal Masuk</th></tr>' . $rows . '</table>';
    return Response::make($html, 200, [
        'Content-Type' => 'application/vnd.ms-excel',
        'Content-Disposition' => 'attachment; filename="pegawai_' . date('Y-m-d') . '.xls"',
    ]);
}

public function exportLeavesExcel(Request $request)
{
    $leaves = LeaveRequest::with(['employee', 'leaveType'])
        ->whereBetween('created_at', [now()->startOfYear(), now()->endOfYear()])
        ->get();
    $rows = '';
    foreach ($leaves as $l) {
        $rows .= '<tr><td>' . e($l->employee->nama_lengkap ?? '') . '</td><td>' . e($l->leaveType->name ?? '') . '</td><td>' . e($l->start_date) . '</td><td>' . e($l->end_date) . '</td><td>' . e($l->total_days) . '</td><td>' . e($l->status) . '</td></tr>';
    }
    $html = '<table border="1"><tr><th>Pegawai</th><th>Jenis</th><th>Mulai</th><th>Selesai</th><th>Total</th><th>Status</th></tr>' . $rows . '</table>';
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
    $isDosen = $employee->jenis_pegawai === 'Dosen';
    $isPegawai = $isDosen || collect($employee->user?->roles)->contains(fn ($r) => ($r['code'] ?? $r) === 'PEG');
    $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.biodata', compact('employee', 'isDosen', 'isPegawai'));
    return $pdf->download('biodata_' . $employee->nik . '.pdf');
}

public function exportBiodataWord(Request $request, $id)
{
    if (!$this->canViewBiodata($request, (int) $id)) {
        return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
    }
    $employee = Employee::with(['position', 'organizationalUnit', 'educations', 'functional', 'teachingAssignments', 'user.roles'])->findOrFail($id);
    $isDosen = $employee->jenis_pegawai === 'Dosen';
    $isPegawai = $isDosen || collect($employee->user?->roles)->contains(fn ($r) => ($r['code'] ?? $r) === 'PEG');
    $html = view('pdf.biodata', compact('employee', 'isDosen', 'isPegawai'))->render();
    $filename = 'biodata_' . $employee->nik . '.doc';
    return Response::make($html, 200, [
        'Content-Type' => 'application/msword',
        'Content-Disposition' => 'attachment; filename="' . $filename . '"',
    ]);
}

public function exportEmployeesPdf(Request $request)
{
    $employees = Employee::with(['position', 'organizationalUnit'])->get();
    $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.employees', compact('employees'));
    return $pdf->download('pegawai_' . date('Y-m-d') . '.pdf');
}

public function exportLeavesPdf(Request $request)
{
    $leaves = LeaveRequest::with(['employee', 'leaveType'])
        ->whereBetween('created_at', [now()->startOfYear(), now()->endOfYear()])
        ->get();
    $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.leaves', compact('leaves'));
    return $pdf->download('cuti_' . date('Y-m-d') . '.pdf');
}
}