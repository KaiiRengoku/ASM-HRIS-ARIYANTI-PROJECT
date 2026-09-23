<?php

namespace App\Services;

use App\Models\Holiday;
use App\Models\WorkSchedule;
use Illuminate\Support\Carbon;

class WorkingDayService
{
    public static function count(string $start, string $end, ?int $unitId): int
    {
        $holidays = Holiday::where('is_active', true)->whereBetween('date', [$start, $end])->pluck('date')->map(fn ($d) => Carbon::parse($d)->toDateString())->all();
        $sched = WorkSchedule::where('is_active', true)->where(function ($q) use ($unitId) {
            $q->whereNull('organizational_unit_id'); if ($unitId) $q->orWhere('organizational_unit_id', $unitId);
        })->where(function ($q) use ($start, $end) {
            $q->whereNull('effective_from')->orWhere('effective_from', '<=', $end);
        })->where(function ($q) use ($start, $end) {
            $q->whereNull('effective_until')->orWhere('effective_until', '>=', $start);
        })->orderByRaw('organizational_unit_id IS NULL')->get()->keyBy('day_of_week');
        $n = 0; $d = Carbon::parse($start); $e = Carbon::parse($end);
        while ($d->lte($e)) {
            $dow = $d->dayOfWeekIso;
            $isWeekend = $dow >= 6;
            $off = $isWeekend || in_array($d->toDateString(), $holidays)
                || (($s = $sched->get($dow)) && !$s->is_working_day);
            if (!$off) $n++;
            $d->addDay();
        }
        return $n;
    }
}
