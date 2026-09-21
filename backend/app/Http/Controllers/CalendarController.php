<?php

namespace App\Http\Controllers;

use App\Models\Holiday;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CalendarController extends Controller
{
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

        $holiday->update($request->all());
        return response()->json(['success' => true, 'data' => $holiday]);
    }

    public function destroy(Holiday $holiday)
    {
        $holiday->delete();
        return response()->json(['success' => true, 'message' => 'Hari libur dihapus.']);
    }

    public function toggle(Holiday $holiday)
    {
        $holiday->update(['is_active' => !$holiday->is_active]);
        return response()->json(['success' => true, 'data' => $holiday]);
    }
}