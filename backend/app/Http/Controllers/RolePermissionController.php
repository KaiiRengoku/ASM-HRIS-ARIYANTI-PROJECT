<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\Request;

class RolePermissionController extends Controller
{
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

        return response()->json(['success' => true, 'data' => Role::all()]);
    }
}
