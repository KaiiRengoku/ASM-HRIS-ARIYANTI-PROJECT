<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    // KABAG hanya boleh melihat data unit organisasinya sendiri; role lain bebas unit.
    // Fallback: KABAG tanpa unit (data lama) tidak dibatasi — shortcut: isi unit KABAG.
    protected function kabagUnitId(Request $request): ?int
    {
        if (!$request->user()->roles()->where('code', 'KABAG')->exists()) {
            return null;
        }
        $unitId = $request->user()->employee?->organizational_unit_id;
        return $unitId ? (int) $unitId : null;
    }
}
