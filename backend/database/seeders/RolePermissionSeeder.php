<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Default permission set per role.
     * Mirrors the current role-based access so behaviour is unchanged
     * until HRD adjusts permissions from the UI.
     * '*' = all available permissions (used for HRD).
     */
    private array $defaults = [
        'HRD' => ['*'],
        'DIREKTUR' => [
            'employee.view', 'employee.export',
            'document.view', 'document.upload', 'document.delete',
            'leave.view', 'leave.export', 'leave.create', 'leave.cancel',
            'report.view', 'report.export',
        ],
        'PD_I' => [
            'employee.view', 'employee.export',
            'document.view', 'document.upload', 'document.delete',
            'leave.view', 'leave.export', 'leave.create', 'leave.cancel',
            'report.view', 'report.export',
        ],
        'PD_II' => [
            'employee.view', 'employee.export',
            'document.view', 'document.upload', 'document.delete',
            'leave.view', 'leave.export', 'leave.create', 'leave.cancel',
            'report.view', 'report.export',
        ],
        'PD_III' => [
            'employee.view', 'employee.export',
            'document.view', 'document.upload', 'document.delete',
            'leave.view', 'leave.export', 'leave.create', 'leave.cancel',
            'report.view', 'report.export',
        ],
        'KABAG' => [
            'leave.view', 'leave.export', 'leave.create', 'leave.cancel',
            'leave.approve', 'leave.reject',
            'document.view', 'document.upload', 'document.delete',
            'report.view',
        ],
        'PEG' => [
            'document.view', 'document.upload', 'document.delete',
            'leave.view', 'leave.create', 'leave.cancel',
            'report.view',
        ],
    ];

    public function run(): void
    {
        $all = Permission::pluck('code')->all();

        foreach ($this->defaults as $code => $perms) {
            $role = Role::where('code', $code)->first();
            if (!$role) {
                continue;
            }

            $codes = in_array('*', $perms, true) ? $all : $perms;
            $role->permissions()->sync(
                Permission::whereIn('code', $codes)->pluck('id')->all()
            );
        }
    }
}
