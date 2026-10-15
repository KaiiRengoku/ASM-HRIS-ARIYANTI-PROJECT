<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Http\Resources\EmployeeResource;
use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\Position;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $query = Employee::with(['organizationalUnit', 'position', 'supervisor', 'user.roles']);

        if ($search = $request->search) {
            $query->where(function ($q) use ($search) {
                $q->where('nik', 'LIKE', "%{$search}%")
                  ->orWhere('nama_lengkap', 'LIKE', "%{$search}%")
                  ->orWhere('nip', 'LIKE', "%{$search}%")
                  ->orWhere('nidn', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }

        // Filter pegawai yang belum punya atasan langsung (untuk pemetaan HRD).
        if ($request->boolean('tanpa_atasan')) {
            $query->whereNull('supervisor_id');
        }

        $employees = $query->latest()->paginate($request->per_page ?? 20);

        return EmployeeResource::collection($employees);
    }

    public function store(StoreEmployeeRequest $request)
    {
        $validated = $request->validated();

        $employee = DB::transaction(function () use ($validated, $request) {
            $employee = Employee::create($validated);

            $user = User::create([
                'name' => $employee->nama_lengkap,
                'nik' => $employee->nik,
                'email' => $employee->email,
                'password' => Hash::make($validated['password']),
                'employee_id' => $employee->id,
            ]);

            $role = Role::where('code', $validated['role'])->firstOrFail();
            $user->roles()->attach($role->id);

            if (!empty($validated['position_id'])) {
                $employee->position_id = $validated['position_id'];
            } else {
                // IKATAN JABATAN-ROLE DILEPAS: jabatan TIDAK lagi dibuat otomatis dari nama role.
                // Bila tidak dipilih, pakai jabatan umum "PEGAWAI" (bila ada) agar perilaku jelas;
                // bila master jabatan belum ada, biarkan kosong (NULL).
                $employee->position_id = Position::where('code', 'PEGAWAI')->value('id');
            }
            $employee->user_id = $user->id;
            $employee->save();

            return $employee;
        });

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'CREATE_EMPLOYEE',
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
            'new_values' => $employee->only(['nik', 'nama_lengkap', 'email']) + ['role' => $validated['role']],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return (new EmployeeResource($employee->load(['organizationalUnit', 'position', 'supervisor', 'user.roles'])))->response()->setStatusCode(201);
    }

    public function show(Request $request, Employee $employee)
    {
        return new EmployeeResource($employee->load(['organizationalUnit', 'position', 'supervisor', 'user.roles', 'educations', 'positionHistories', 'certifications']));
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee)
    {
        $validated = $request->validated();
        // Catat semua field yang diubah, bukan hanya 3, supaya jejak audit utuh.
        $old = $employee->only(array_keys($validated));

        DB::transaction(function () use ($employee, $validated) {
            $employee->update($validated);

            if ($employee->user) {
                $employee->user->update([
                    'name' => $employee->nama_lengkap,
                    'nik' => $employee->nik,
                    'email' => $employee->email,
                ]);
            }
        });

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'UPDATE_EMPLOYEE',
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
            'old_values' => $old,
            'new_values' => $employee->only(array_keys($validated)),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return new EmployeeResource($employee->load(['organizationalUnit', 'position', 'supervisor', 'user.roles']));
    }

    public function destroy(Request $request, Employee $employee)
    {
        $employee->loadMissing('user');
        try {
            DB::transaction(function () use ($employee) {
                if ($employee->user) {
                    $employee->user->roles()->detach();
                    $employee->user->delete();
                }
                $employee->delete();
            });
        } catch (QueryException $e) {
            // FK RESTRICT: pegawai masih dipakai riwayat cuti/saldo/dokumen.
            // Nonaktifkan, jangan hapus — riwayat wajib disimpan HRIS.
            if ($e->getCode() === '23000') {
                return response()->json([
                    'success' => false,
                    'message' => 'Pegawai masih memiliki riwayat cuti/saldo/dokumen. Nonaktifkan akunnya, jangan hapus datanya.',
                ], 422);
            }
            throw $e;
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'DELETE_EMPLOYEE',
            'auditable_type' => Employee::class,
            'auditable_id' => $employee->id,
            'old_values' => $employee->only(['nik', 'nama_lengkap']),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json(['success' => true, 'message' => 'Data pegawai dan akun dihapus permanen.']);
    }

    public function updateAccount(Request $request, Employee $employee)
    {
        $request->validate([
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', 'string', Rule::in(['HRD', 'DIREKTUR', 'PD_I', 'PD_II', 'PD_III', 'KABAG', 'DOSEN', 'PEGAWAI'])],
            'position_id' => ['nullable', 'exists:positions,id'],
        ]);

        // Hanya HRD (admin akun) yang boleh mengubah role/kata sandi akun lain.
        // Route juga sudah dijaga middleware role:HRD + permission:auth.user.update;
        // pengecekan ini melindungi method dari pemanggilan internal di masa depan.
        if (!$request->user()->hasRole('HRD')) {
            return response()->json(['success' => false, 'message' => 'Hanya HRD yang dapat mengubah akun pengguna.'], 403);
        }

        $user = $employee->user;
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Pegawai ini belum memiliki akun.'], 404);
        }

        // Guard "tidak dapat mengubah role akun sendiri" sementara dimatikan atas permintaan pemilik.

        // Jaring pengaman: jangan sampai sistem kehilangan admin terakhir. Menurunkan
        // role HRD (akun sendiri atau akun HRD lain) ditolak bila ini satu-satunya HRD.
        $isCurrentlyHrd = $user->roles()->where('code', 'HRD')->exists();
        if ($isCurrentlyHrd && $request->role !== 'HRD') {
            $hrdCount = User::whereHas('roles', fn ($q) => $q->where('code', 'HRD'))->count();
            if ($hrdCount <= 1) {
                return response()->json(['success' => false, 'message' => 'Tidak dapat menghapus role HRD terakhir. Tambahkan HRD lain terlebih dahulu.'], 400);
            }
        }

        DB::transaction(function () use ($request, $employee, $user) {
            if ($request->filled('password')) {
                $user->password = Hash::make($request->password);
                $user->save();
            }

            $role = Role::where('code', $request->role)->firstOrFail();
            $user->roles()->sync([$role->id]);

            if ($request->filled('position_id')) {
                $employee->position_id = $request->position_id;
            } else {
                // IKATAN JABATAN-ROLE DILEPAS: jabatan TIDAK lagi dibuat otomatis dari nama role.
                // Bila tidak dipilih, pakai jabatan umum "PEGAWAI" (bila ada); bila belum ada, kosong (NULL).
                $employee->position_id = Position::where('code', 'PEGAWAI')->value('id');
            }
            $employee->save();
        });

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'UPDATE_ACCOUNT',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'new_values' => [
                'role' => $request->role,
                'password_changed' => $request->filled('password'),
                'actor_role' => $request->user()->roles()->pluck('code')->all(),
                'target_user_id' => $user->id,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return new EmployeeResource($employee->load(['organizationalUnit', 'position', 'user.roles']));
    }

    public function destroyAccount(Request $request, Employee $employee)
    {
        $user = $employee->user;
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Pegawai ini belum memiliki akun.'], 404);
        }
        if ($user->id === $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Tidak dapat menghapus akun sendiri.'], 400);
        }

        $deleted = $user->only(['nik', 'name']);
        DB::transaction(function () use ($employee, $user) {
            $user->roles()->detach();
            $user->delete();
            $employee->user_id = null;
            $employee->save();
        });

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'DELETE_ACCOUNT',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'old_values' => $deleted,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json(['success' => true, 'message' => 'Akun dihapus permanen. Data pegawai tetap ada.']);
    }

}
