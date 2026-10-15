<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Arr;

class ProfileController extends Controller
{
    // Dosen ditentukan dari kolom employees.is_dosen MAUPUN role 'DOSEN'.
    // Kolom is_dosen di database praktis kosong (semua 0), sehingga tanpa
    // pengecekan role, pengguna ber-role DOSEN akan dianggap bukan dosen
    // dan tab "Mata Kuliah"/"Penelitian & Pernyataan" tidak pernah tampil.
    private function isDosen($user): bool
    {
        if ($user?->employee?->is_dosen) {
            return true;
        }

        return $user?->roles?->contains(fn ($r) => ($r->code ?? null) === 'DOSEN') ?? false;
    }

    public function show(Request $request)
    {
        $user = $request->user()->load(['employee.position', 'employee.positionHistories', 'roles']);
        $data = $user->toArray();
        $data['is_dosen'] = $this->isDosen($user);
        $data['is_pegawai'] = $data['is_dosen'] || collect($user->roles)->contains(fn ($r) => in_array(($r['code'] ?? $r), ['PEGAWAI', 'DOSEN'], true));

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
            // Data identitas (dapat diedit pemilik akun untuk dirinya sendiri).
            'nama_lengkap' => 'nullable|string|max:150',
            'nip' => 'nullable|string|size:9|regex:/^[0-9]{9}$/|unique:employees,nip,' . $employee->id,
            'nidn' => 'nullable|string|size:10|regex:/^[0-9]{10}$/|unique:employees,nidn,' . $employee->id,
            'tempat_lahir' => 'nullable|string|max:100',
            'tanggal_lahir' => 'nullable|date',
            'jenis_kelamin' => 'nullable|in:L,P',
            'agama' => 'nullable|string|max:30',
            'status_pernikahan' => 'nullable|in:Kawin,Belum Kawin,Cerai',
            // Data kontak & penelitian.
            'alamat_ktp' => 'nullable|string',
            'alamat_domisili' => 'nullable|string',
            'nomor_hp' => 'nullable|string|max:25',
            'riwayat_penelitian_pengabdian' => 'nullable|string',
        ]);

        $employee->update(Arr::except($validated, ['riwayat_penelitian_pengabdian']));

        $employee->loadMissing('position');
        if ($request->filled('riwayat_penelitian_pengabdian') && $this->isDosen($user)) {
            $employee->functional()->updateOrCreate(
                ['employee_id' => $employee->id],
                ['riwayat_penelitian_pengabdian' => $validated['riwayat_penelitian_pengabdian']]
            );
        }

        $user->load(['employee.position', 'roles']);
        $data = $user->toArray();
        $data['is_dosen'] = $this->isDosen($user);
        $data['is_pegawai'] = $data['is_dosen'] || collect($user->roles)->contains(fn ($r) => in_array(($r['code'] ?? $r), ['PEGAWAI', 'DOSEN'], true));

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