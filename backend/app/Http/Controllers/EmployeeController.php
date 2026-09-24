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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    private function canViewEmployees(Request $request): bool
    {
        return $request->user()->roles()->whereIn('code', ['HRD', 'DIREKTUR', 'PD_I', 'PD_II', 'PD_III'])->exists();
    }

    public function index(Request $request)
    {
        if (!$this->canViewEmployees($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }
        $query = Employee::with(['organizationalUnit', 'position', 'user.roles']);

        if ($search = $request->search) {
            $query->where(function ($q) use ($search) {
                $q->where('nik', 'LIKE', "%{$search}%")
                  ->orWhere('nama_lengkap', 'LIKE', "%{$search}%")
                  ->orWhere('nip', 'LIKE', "%{$search}%")
                  ->orWhere('nidn', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%");
            });
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
                $employee->position_id = Position::firstOrCreate(
                    ['code' => $role->code],
                    ['name' => $role->name, 'is_active' => true]
                )->id;
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

        return (new EmployeeResource($employee->load(['organizationalUnit', 'position', 'user.roles'])))->response()->setStatusCode(201);
    }

    public function show(Request $request, Employee $employee)
    {
        if (!$this->canViewEmployees($request)) {
            return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
        }
        return new EmployeeResource($employee->load(['organizationalUnit', 'position', 'user.roles', 'educations']));
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee)
    {
        $old = $employee->only(['nik', 'nama_lengkap', 'email']);
        $validated = $request->validated();

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
            'new_values' => $employee->only(['nik', 'nama_lengkap', 'email']),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return new EmployeeResource($employee->load(['organizationalUnit', 'position', 'user.roles']));
    }

    public function destroy(Request $request, Employee $employee)
    {
        $employee->loadMissing('user');
        DB::transaction(function () use ($employee) {
            if ($employee->user) {
                $employee->user->roles()->detach();
                $employee->user->delete();
            }
            $employee->delete();
        });

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
            'role' => ['required', 'string', Rule::in(['HRD', 'DIREKTUR', 'PD_I', 'PD_II', 'PD_III', 'KABAG', 'PEG'])],
            'position_id' => ['nullable', 'exists:positions,id'],
        ]);

        $user = $employee->user;
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Pegawai ini belum memiliki akun.'], 404);
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
                $employee->position_id = Position::firstOrCreate(
                    ['code' => $role->code],
                    ['name' => $role->name, 'is_active' => true]
                )->id;
            }
            $employee->save();
        });

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'UPDATE_ACCOUNT',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'new_values' => ['role' => $request->role, 'password_changed' => $request->filled('password')],
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
