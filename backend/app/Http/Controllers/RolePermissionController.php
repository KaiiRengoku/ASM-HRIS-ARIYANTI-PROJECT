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
                Role::find($row['id'])->permissions()->sync($row['permissions']);
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