<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProfileEducationController extends Controller
{
    public function show(Request $request)
    {
        $employee = $request->user()->employee;
        $byJenjang = $employee->educations()->get()->keyBy('jenjang');

        return response()->json(['success' => true, 'data' => [
            'S1' => $byJenjang->get('S1'),
            'S2' => $byJenjang->get('S2'),
            'S3' => $byJenjang->get('S3'),
            'sertifikasi' => $employee->functional?->sertifikasi,
        ]]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'pendidikan' => 'required|array',
            'pendidikan.*.jenjang' => 'required|in:S1,S2,S3',
            'pendidikan.*.nama_pt' => 'nullable|string|max:150',
            'pendidikan.*.jurusan' => 'nullable|string|max:150',
            'pendidikan.*.tahun_masuk' => 'nullable|integer|min:1900|max:2100',
            'pendidikan.*.tahun_lulus' => 'nullable|integer|min:1900|max:2100',
            'sertifikasi' => 'nullable|string',
        ]);

        $employee = $request->user()->employee;

        DB::transaction(function () use ($employee, $validated) {
            foreach ($validated['pendidikan'] as $row) {
                $employee->educations()->updateOrCreate(
                    ['jenjang' => $row['jenjang']],
                    [
                        'nama_pt' => $row['nama_pt'] ?? null,
                        'jurusan' => $row['jurusan'] ?? null,
                        'tahun_masuk' => $row['tahun_masuk'] ?? null,
                        'tahun_lulus' => $row['tahun_lulus'] ?? null,
                    ]
                );
            }

            if (array_key_exists('sertifikasi', $validated)) {
                $employee->functional()->updateOrCreate(
                    ['employee_id' => $employee->id],
                    ['sertifikasi' => $validated['sertifikasi']]
                );
            }
        });

        return $this->show($request);
    }
}
