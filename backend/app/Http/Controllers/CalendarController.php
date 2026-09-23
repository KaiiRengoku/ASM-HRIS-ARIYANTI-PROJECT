<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Holiday;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CalendarController extends Controller
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
        $holidays = Holiday::orderBy('date')->get();
        return response()->json(['success' => true, 'data' => $holidays]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'date' => ['required', 'date', 'unique:holidays,date'],
            'name' => ['required', 'string', 'max:150'],
            'holiday_type' => ['required', 'string', 'in:NATIONAL,JOINT_LEAVE,OTHER'],
            'notes' => ['nullable', 'string'],
        ]);

        $holiday = Holiday::create([
            'date' => $request->date,
            'name' => $request->name,
            'holiday_type' => $request->holiday_type,
            'notes' => $request->notes,
            'is_active' => true,
            'created_by' => $request->user()->id,
        ]);

        $this->audit($request, 'CREATE_HOLIDAY', Holiday::class, $holiday->id, null, $holiday->only(['date', 'name', 'holiday_type', 'is_active']));

        return response()->json(['success' => true, 'data' => $holiday]);
    }

    public function update(Request $request, Holiday $holiday)
    {
        $request->validate([
            'date' => ['required', 'date', Rule::unique('holidays', 'date')->ignore($holiday->id)],
            'name' => ['required', 'string', 'max:150'],
            'holiday_type' => ['required', 'string', 'in:NATIONAL,JOINT_LEAVE,OTHER'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ]);

        $old = $holiday->only(['date', 'name', 'holiday_type', 'is_active']);
        $holiday->update($request->all());
        $this->audit($request, 'UPDATE_HOLIDAY', Holiday::class, $holiday->id, $old, $holiday->only(['date', 'name', 'holiday_type', 'is_active']));
        return response()->json(['success' => true, 'data' => $holiday]);
    }

    public function destroy(Request $request, Holiday $holiday)
    {
        $old = $holiday->only(['date', 'name', 'holiday_type']);
        $id = $holiday->id;
        $holiday->delete();
        $this->audit($request, 'DELETE_HOLIDAY', Holiday::class, $id, $old);
        return response()->json(['success' => true, 'message' => 'Hari libur dihapus.']);
    }

    public function toggle(Request $request, Holiday $holiday)
    {
        $old = ['is_active' => $holiday->is_active];
        $holiday->update(['is_active' => !$holiday->is_active]);
        $this->audit($request, 'TOGGLE_HOLIDAY', Holiday::class, $holiday->id, $old, ['is_active' => $holiday->is_active]);
        return response()->json(['success' => true, 'data' => $holiday]);
    }
}