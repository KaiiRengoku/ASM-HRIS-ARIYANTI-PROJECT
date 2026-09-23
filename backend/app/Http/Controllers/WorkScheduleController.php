<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\WorkSchedule;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WorkScheduleController extends Controller
{
    private function audit(Request $request, string $action, string $type, int $id, $old = null, $new = null)
    {
        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => $action,
            'auditable_type' => $type,
            'auditable_id' => $id,
            'old_values' => $old,
            'new_values' => $new,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);
    }
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
        $this->audit($request, 'CREATE_WORK_SCHEDULE', WorkSchedule::class, $schedule->id, null, $schedule->toArray());
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
        $this->audit($request, 'CREATE_WORK_SCHEDULE', WorkSchedule::class, 0, null, ['count' => count($schedules), 'days' => $data['days']]);
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

        $old = $workSchedule->toArray();
        $workSchedule->update($data);
        $this->audit($request, 'UPDATE_WORK_SCHEDULE', WorkSchedule::class, $workSchedule->id, $old, $workSchedule->toArray());
        return response()->json(['success' => true, 'data' => $workSchedule]);
    }

    public function toggle(Request $request, WorkSchedule $workSchedule)
    {
        $old = ['is_active' => $workSchedule->is_active];
        $workSchedule->update(['is_active' => !$workSchedule->is_active]);
        $this->audit($request, 'TOGGLE_WORK_SCHEDULE', WorkSchedule::class, $workSchedule->id, $old, ['is_active' => $workSchedule->is_active]);
        return response()->json(['success' => true, 'data' => $workSchedule]);
    }

    public function destroy(Request $request, WorkSchedule $workSchedule)
    {
        $old = $workSchedule->toArray();
        $id = $workSchedule->id;
        $workSchedule->delete();
        $this->audit($request, 'DELETE_WORK_SCHEDULE', WorkSchedule::class, $id, $old);
        return response()->json(['success' => true, 'message' => 'Jam kerja dihapus.']);
    }
}