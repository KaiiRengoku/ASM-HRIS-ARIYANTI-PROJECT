<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Role;
use Illuminate\Http\Request;

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
        return response()->json(['success' => true, 'data' => Role::all()]);
    }

    public function updateAll(Request $request)
    {
        $request->validate([
            'roles' => 'required|array',
            'roles.*.id' => 'required|integer|exists:roles,id',
            'roles.*.can_create' => 'required|boolean',
            'roles.*.can_read' => 'required|boolean',
            'roles.*.can_update' => 'required|boolean',
            'roles.*.can_delete' => 'required|boolean',
        ]);

        foreach ($request->roles as $row) {
            Role::where('id', $row['id'])->update([
                'can_create' => $row['can_create'],
                'can_read' => $row['can_read'],
                'can_update' => $row['can_update'],
                'can_delete' => $row['can_delete'],
            ]);
        }

        $this->audit($request, 'UPDATE_ROLE_PERMISSIONS', Role::class, 0, null, ['roles' => $request->roles]);

        return response()->json(['success' => true, 'data' => Role::all()]);
    }
}
