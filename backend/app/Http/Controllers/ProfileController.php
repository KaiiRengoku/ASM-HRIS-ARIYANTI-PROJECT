<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Arr;

class ProfileController extends Controller
{
    private function isDosen($employee): bool
    {
        return (bool) $employee?->is_dosen;
    }

    public function show(Request $request)
    {
        $user = $request->user()->load(['employee.position', 'roles']);
        $data = $user->toArray();
        $data['is_dosen'] = $this->isDosen($user->employee);
        $data['is_pegawai'] = $data['is_dosen'] || collect($user->roles)->contains(fn ($r) => ($r['code'] ?? $r) === 'PEG');

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $employee = $user->employee;
        if (!$employee) {
            return response()->json(['success' => false, 'message' => 'Data pegawai tidak ditemukan untuk akun ini.'], 404);
        }

        $validated = $request->validate([
            'alamat_ktp' => 'nullable|string',
            'alamat_domisili' => 'nullable|string',
            'nomor_hp' => 'nullable|string|max:25',
            'riwayat_penelitian_pengabdian' => 'nullable|string',
        ]);

        $employee->update(Arr::except($validated, ['riwayat_penelitian_pengabdian']));

        $employee->loadMissing('position');
        if ($request->filled('riwayat_penelitian_pengabdian') && $this->isDosen($employee)) {
            $employee->functional()->updateOrCreate(
                ['employee_id' => $employee->id],
                ['riwayat_penelitian_pengabdian' => $validated['riwayat_penelitian_pengabdian']]
            );
        }

        $user->load(['employee.position', 'roles']);
        $data = $user->toArray();
        $data['is_dosen'] = $this->isDosen($user->employee);
        $data['is_pegawai'] = $data['is_dosen'] || collect($user->roles)->contains(fn ($r) => ($r['code'] ?? $r) === 'PEG');

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function updatePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string', 'current_password'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $request->user()->update(['password' => Hash::make($validated['password'])]);

        return response()->json(['success' => true, 'message' => 'Kata sandi berhasil diubah.']);
    }
}