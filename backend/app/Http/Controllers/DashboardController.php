<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\EmployeeFunctional;
use App\Models\Holiday;
use App\Models\LeaveRequest;
use App\Models\LeaveBalance;
use App\Models\Notification;
use App\Models\TeachingAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    private function isDosen(?Employee $employee): bool
    {
        return (bool) $employee?->is_dosen;
    }

    public function hrdStats(Request $request)
    {
        $totalPegawai = Employee::where('status_kepegawaian', 'aktif')->count();
        $cutiPending = LeaveRequest::where('status', 'Pending')->count();
        $verifikasiHrd = LeaveRequest::where('status', 'Disetujui Kepala Bagian')->count();
        $dokumenPerluDitinjau = \App\Models\LeaveAttachment::where('verification_status', 'PENDING')->count();

        $pengajuanTerbaru = LeaveRequest::with(['employee', 'leaveType'])
            ->whereIn('status', ['Pending', 'Disetujui Kepala Bagian'])
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'employee_name' => $item->employee->nama_lengkap ?? 'Tidak diketahui',
                    'leave_type' => $item->leaveType->name ?? 'Cuti',
                    'start_date' => $item->start_date->format('Y-m-d'),
                    'end_date' => $item->end_date->format('Y-m-d'),
                    'status' => $item->status,
                    'submitted_at' => $item->submitted_at?->format('Y-m-d H:i') ?? $item->created_at->format('Y-m-d H:i'),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'total_pegawai' => $totalPegawai,
                'cuti_pending' => $cutiPending,
                'verifikasi_hrd' => $verifikasiHrd,
                'dokumen_perlu_ditinjau' => $dokumenPerluDitinjau,
                'pengajuan_terbaru' => $pengajuanTerbaru,
            ],
        ]);
    }

    public function pegawaiStats(Request $request)
    {
        $user = $request->user();
        $employee = $user->employee()->with('position')->first();
        if (!$employee) {
            return response()->json(['success' => false, 'message' => 'Data pegawai tidak ditemukan.'], 404);
        }

        $balance = LeaveBalance::where('employee_id', $employee->id)
            ->where('period_year', date('Y'))
            ->first();

        $recentLeaves = LeaveRequest::where('employee_id', $employee->id)
            ->with('leaveType')
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'leave_type' => $item->leaveType->name ?? 'Cuti',
                    'start_date' => $item->start_date->format('Y-m-d'),
                    'end_date' => $item->end_date->format('Y-m-d'),
                    'status' => $item->status,
                    'total_days' => $item->total_days,
                ];
            });

        $unread = Notification::where('user_id', $user->id)->whereNull('read_at')->count();
        $totalCuti = (float) LeaveRequest::where('employee_id', $employee->id)->sum('total_days');

        $isDosen = $this->isDosen($employee);

        $mengajar = null;
        $penelitian = null;
        if ($isDosen) {
            $assignments = TeachingAssignment::where('employee_id', $employee->id)->get();
            $mengajar = [
                'total_sks' => (float) $assignments->sum('sks'),
                'matkul' => $assignments->map(fn ($a) => [
                    'kode_matkul' => $a->kode_matkul,
                    'nama_matkul' => $a->nama_matkul,
                    'sks' => $a->sks,
                    'kelas' => $a->kelas,
                ])->values(),
            ];
            $functional = EmployeeFunctional::where('employee_id', $employee->id)->first();
            $penelitian = ['terisi' => filled($functional?->riwayat_penelitian_pengabdian)];
        }

        $libur = Holiday::where('date', '>=', now()->toDateString())
            ->where('is_active', true)
            ->orderBy('date')
            ->limit(3)
            ->get(['date', 'name'])
            ->map(fn ($h) => ['date' => $h->date->format('Y-m-d'), 'name' => $h->name]);

        return response()->json([
            'success' => true,
            'data' => [
                'sisa_cuti' => $balance ? $balance->remaining_days : 0,
                'total_pengajuan' => LeaveRequest::where('employee_id', $employee->id)->count(),
                'pengajuan_terbaru' => $recentLeaves,
                'unread_notifications' => $unread,
                'total_cuti' => $totalCuti,
                'is_dosen' => $isDosen,
                'employee_id' => $employee->id,
                'mengajar' => $mengajar,
                'penelitian' => $penelitian,
                'libur_terdekat' => $libur,
            ],
        ]);
    }

    public function kabagStats(Request $request)
    {
        $user = $request->user();
        $unitId = $user->employee?->organizational_unit_id;
        // Kabag scope = unit organisasinya; tanpa unit terisi → global (data lama).
        $scoped = fn() => LeaveRequest::query()->when($unitId, function ($q) use ($unitId) {
            $q->whereHas('employee', fn($e) => $e->where('organizational_unit_id', $unitId));
        });

        $pending = $scoped()->where('status', 'Pending')->count();
        $total = $scoped()->count();
        $totalEmployees = $unitId ? Employee::where('organizational_unit_id', $unitId)->count() : 0;

        $recent = $scoped()->where('status', 'Pending')
            ->with(['employee', 'leaveType'])
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'employee_name' => $item->employee->nama_lengkap ?? 'Tidak diketahui',
                    'leave_type' => $item->leaveType->name ?? 'Cuti',
                    'start_date' => $item->start_date->format('Y-m-d'),
                    'end_date' => $item->end_date->format('Y-m-d'),
                    'status' => $item->status,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'pending_approval' => $pending,
                'total_pengajuan' => $total,
                'total_employees' => $totalEmployees,
                'pengajuan_terbaru' => $recent,
            ],
        ]);
    }

    public function direkturStats(Request $request)
    {
        $totalPegawai = Employee::count();
        $totalCuti = LeaveRequest::count();
        $totalPending = LeaveRequest::where('status', 'Pending')->count();
        $totalApproved = LeaveRequest::where('status', 'Disetujui HRD')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total_pegawai' => $totalPegawai,
                'total_cuti' => $totalCuti,
                'total_pending' => $totalPending,
                'total_approved' => $totalApproved,
            ],
        ]);
    }

    public function pdStats(Request $request)
    {
        // PD1/2/3 see academic staff data. For simplicity, we return similar to direktur.
        // Could filter by unit later.
        $totalPegawai = Employee::where('is_dosen', true)->count();
        $totalCuti = LeaveRequest::whereHas('employee', function ($q) {
            $q->where('is_dosen', true);
        })->count();
        $totalPending = LeaveRequest::where('status', 'Pending')
            ->whereHas('employee', function ($q) {
                $q->where('is_dosen', true);
            })->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total_dosen' => $totalPegawai,
                'total_cuti_dosen' => $totalCuti,
                'cuti_pending_dosen' => $totalPending,
            ],
        ]);
    }

    public function stats(Request $request)
    {
        $user = $request->user();
        $role = $user->roles->first()->code ?? null;

        switch ($role) {
            case 'PEG':
                return $this->pegawaiStats($request);
            case 'KABAG':
                return $this->kabagStats($request);
            case 'DIREKTUR':
                return $this->direkturStats($request);
            case 'PD_I':
            case 'PD_II':
            case 'PD_III':
                return $this->pdStats($request);
            default:
                return response()->json(['success' => false, 'message' => 'Role tidak dikenal'], 400);
        }
    }
}