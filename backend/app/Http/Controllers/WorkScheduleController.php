<?php

namespace App\Http\Controllers;

use App\Models\WorkSchedule;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WorkScheduleController extends Controller
{
    public function index()
    {
        $schedules = WorkSchedule::with('organizationalUnit')->get();
        return response()->json(['success' => true, 'data' => $schedules]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'organizational_unit_id' => ['nullable', 'exists:organizational_units,id'],
            'day_of_week' => ['required', 'integer', 'between:1,7'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'is_working_day' => ['nullable', 'boolean'],
            'effective_from' => ['nullable', 'date'],
            'effective_until' => ['nullable', 'date', 'after_or_equal:effective_from'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $schedule = WorkSchedule::create($data + ['is_working_day' => true, 'is_active' => true]);
        return response()->json(['success' => true, 'data' => $schedule]);
    }

    public function storeBulk(Request $request)
    {
        $data = $request->validate([
            'organizational_unit_id' => ['nullable', 'exists:organizational_units,id'],
            'days' => ['required', 'array', 'min:1'],
            'days.*' => ['integer', 'between:1,7'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
        ]);

        $schedules = [];
        foreach (array_unique($data['days']) as $day) {
            $schedules[] = WorkSchedule::updateOrCreate(
                ['organizational_unit_id' => $data['organizational_unit_id'] ?? null, 'day_of_week' => $day],
                [
                    'start_time' => $data['start_time'],
                    'end_time' => $data['end_time'],
                    'is_working_day' => true,
                    'is_active' => true,
                    'effective_from' => now()->toDateString(),
                ]
            );
        }
        return response()->json(['success' => true, 'data' => $schedules]);
    }

    public function update(Request $request, WorkSchedule $workSchedule)
    {
        $data = $request->validate([
            'organizational_unit_id' => ['nullable', 'exists:organizational_units,id'],
            'day_of_week' => ['sometimes', 'integer', 'between:1,7'],
            'start_time' => ['sometimes', 'date_format:H:i'],
            'end_time' => ['sometimes', 'date_format:H:i'],
            'is_working_day' => ['nullable', 'boolean'],
            'effective_from' => ['nullable', 'date'],
            'effective_until' => ['nullable', 'date'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $workSchedule->update($data);
        return response()->json(['success' => true, 'data' => $workSchedule]);
    }

    public function toggle(WorkSchedule $workSchedule)
    {
        $workSchedule->update(['is_active' => !$workSchedule->is_active]);
        return response()->json(['success' => true, 'data' => $workSchedule]);
    }

    public function destroy(WorkSchedule $workSchedule)
    {
        $workSchedule->delete();
        return response()->json(['success' => true, 'message' => 'Jam kerja dihapus.']);
    }
}