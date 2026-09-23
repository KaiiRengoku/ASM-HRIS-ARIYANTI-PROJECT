<?php

namespace App\Http\Controllers;

use App\Models\Holiday;
use App\Models\LeaveRequest;
use App\Models\WorkSchedule;
use Carbon\Carbon;
use Illuminate\Http\Request;

class CalendarViewController extends Controller
{
    private function canViewAll(Request $request): bool
    {
        return $request->user()->roles()->whereIn('code', ['HRD', 'KABAG', 'DIREKTUR', 'PD_I', 'PD_II', 'PD_III'])->exists();
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
            'unit_id' => ['nullable', 'exists:organizational_units,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ], [
            'from.required' => 'Tanggal mulai wajib diisi.',
            'from.date' => 'Tanggal mulai tidak valid.',
            'to.required' => 'Tanggal akhir wajib diisi.',
            'to.date' => 'Tanggal akhir tidak valid.',
            'to.after_or_equal' => 'Tanggal akhir harus sama atau setelah tanggal mulai.',
            'unit_id.exists' => 'Unit kerja tidak ditemukan.',
            'per_page.integer' => 'Jumlah per halaman harus berupa angka.',
            'per_page.min' => 'Jumlah per halaman minimal 1.',
            'per_page.max' => 'Jumlah per halaman maksimal 100.',
        ]);

        $from = Carbon::parse($request->from)->toDateString();
        $to = Carbon::parse($request->to)->toDateString();

        if (Carbon::parse($from)->diffInDays(Carbon::parse($to)) + 1 > 366) {
            return response()->json(['success' => false, 'message' => 'Rentang tanggal maksimal 366 hari.'], 422);
        }

        $holidays = Holiday::where('is_active', true)
            ->whereBetween('date', [$from, $to])
            ->orderBy('date')
            ->get();

        $schedules = WorkSchedule::with('organizationalUnit')
            ->where('is_active', true)
            ->when($request->unit_id, fn ($q) => $q->where(fn ($w) => $w->whereNull('organizational_unit_id')->orWhere('organizational_unit_id', $request->unit_id)))
            ->get();

        $leaves = LeaveRequest::select('id', 'employee_id', 'leave_type_id', 'start_date', 'end_date', 'status')
            ->with('employee:id,nama_lengkap')
            ->where('start_date', '<=', $to)
            ->where('end_date', '>=', $from)
            ->whereNotIn('status', ['Ditolak Kepala Bagian', 'Ditolak HRD', 'Cancelled'])
            ->when(!$this->canViewAll($request), fn ($q) => $q->where('employee_id', $request->user()->employee_id))
            ->latest()
            ->paginate($validated['per_page'] ?? 20);

        return response()->json([
            'success' => true,
            'data' => [
                'holidays' => $holidays,
                'schedules' => $schedules,
                'leaves' => $leaves->items(),
            ],
            'meta' => [
                'current_page' => $leaves->currentPage(),
                'last_page' => $leaves->lastPage(),
                'per_page' => $leaves->perPage(),
                'total' => $leaves->total(),
            ],
        ]);
    }
}
