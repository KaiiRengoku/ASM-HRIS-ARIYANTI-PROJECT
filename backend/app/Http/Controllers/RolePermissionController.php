<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class RolePermissionController extends Controller
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
        return response()->json([
            'success' => true,
            'data' => [
                'roles' => Role::with('permissions')->get()->map(fn ($role) => $role->toArray() + [
                    'permission_ids' => $role->permissions->pluck('id')->all(),
                ]),
                'permissions' => Permission::all(['id', 'code', 'name', 'description']),
            ],
        ]);
    }

    public function updateAll(Request $request)
    {
        $request->validate([
            'roles' => 'required|array',
            'roles.*.id' => 'required|integer|exists:roles,id',
            'roles.*.permissions' => 'sometimes|array',
            'roles.*.permissions.*' => 'integer|exists:permissions,id',
            'roles.*.can_create' => 'sometimes|boolean',
            'roles.*.can_read' => 'sometimes|boolean',
            'roles.*.can_update' => 'sometimes|boolean',
            'roles.*.can_delete' => 'sometimes|boolean',
        ]);

        $currentRoleIds = $request->user()->roles->pluck('id')->all();
        $roleManageId = Permission::where('code', 'auth.role.manage')->value('id');

        foreach ($request->roles as $row) {
            if (in_array($row['id'], $currentRoleIds, true)
                && array_key_exists('permissions', $row)
                && !in_array($roleManageId, $row['permissions'], true)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak dapat menghapus akses kelola role pada role Anda sendiri.',
                ], 400);
            }

            Role::where('id', $row['id'])->update(
                Arr::only($row, ['can_create', 'can_read', 'can_update', 'can_delete'])
            );

            if (array_key_exists('permissions', $row)) {
                $role = Role::find($row['id']);
                $before = $role->permissions()->pluck('permissions.id')->all();
                $role->permissions()->sync($row['permissions']);

                // Perubahan permission = sesi anggota role itu basi → revoke token mereka
                // (kecuali token yang sedang dipakai, supaya HRD tidak ter-logout sendiri).
                if (array_diff($before, $row['permissions']) || array_diff($row['permissions'], $before)) {
                    $activeTokenId = $request->user()->currentAccessToken() instanceof \Laravel\Sanctum\PersonalAccessToken
                        ? $request->user()->currentAccessToken()->id
                        : null;
                    \App\Models\User::whereHas('roles', fn ($q) => $q->where('roles.id', $role->id))
                        ->get()
                        ->each(function ($u) use ($activeTokenId) {
                            $u->tokens()->when($activeTokenId, fn ($q) => $q->where('id', '!=', $activeTokenId))->delete();
                        });
                }
            }
        }

        $this->audit($request, 'UPDATE_ROLE_PERMISSIONS', Role::class, 0, null, [
            'roles' => collect($request->roles)->map(fn ($row) => [
                'id' => $row['id'],
                'permissions' => $row['permissions'] ?? null,
            ])->all(),
        ]);

        return $this->index();
    }
}