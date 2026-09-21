<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ProfileFunctionalController extends Controller
{
    public function show(Request $request)
    {
        $employee = $request->user()->employee;

        return response()->json(['success' => true, 'data' => $employee->functional]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'status_kepegawaian_detail' => 'nullable|in:PNS,DPK,Non-PNS',
            'jabatan_fungsional' => 'nullable|in:Asisten Ahli,Lektor,Lektor Kepala,Guru Besar',
            'pangkat' => 'nullable|string|max:100',
            'golongan_ruang' => 'nullable|string|max:50',
            'tmt_pangkat' => 'nullable|date',
            'bidang_keahlian' => 'nullable|string|max:150',
            'unit_kerja' => 'nullable|string|max:150',
            'sertifikasi' => 'nullable|string',
            'riwayat_penelitian_pengabdian' => 'nullable|string',
            'pernyataan' => 'nullable|boolean',
        ]);

        $employee = $request->user()->employee;

        $data = collect($validated)->except(['pernyataan'])->toArray();

        if (($validated['pernyataan'] ?? false) === true) {
            $data['pernyataan_disetujui_pada'] = now();
        }

        $employee->functional()->updateOrCreate(
            ['employee_id' => $employee->id],
            $data
        );

        return response()->json(['success' => true, 'data' => $employee->fresh()->functional]);
    }
}
