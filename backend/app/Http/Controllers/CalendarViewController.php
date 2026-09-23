<?php

namespace App\Http\Controllers;

use App\Models\Holiday;
use App\Models\LeaveRequest;
use App\Models\WorkSchedule;
use Carbon\Carbon;
use Illuminate\Http\Request;

class CalendarViewController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
            'unit_id' => ['nullable', 'exists:organizational_units,id'],
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

        $leaves = LeaveRequest::with('employee:id,nama_lengkap')
            ->where('start_date', '<=', $to)
            ->where('end_date', '>=', $from)
            ->whereNotIn('status', ['Ditolak Kepala Bagian', 'Ditolak HRD', 'Cancelled'])
            ->latest()
            ->paginate(min((int) ($request->per_page ?? 20), 100));

        return response()->json([
            'success' => true,
            'data' => [
                'holidays' => $holidays,
                'schedules' => $schedules,
                'leaves' => $leaves->items(),
                'meta' => [
                    'current_page' => $leaves->currentPage(),
                    'last_page' => $leaves->lastPage(),
                    'per_page' => $leaves->perPage(),
                    'total' => $leaves->total(),
                ],
            ],
        ]);
    }
}
