<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        $peg = DB::table('roles')->where('code', 'PEG')->first();

        DB::table('roles')->updateOrInsert(
            ['code' => 'DOSEN'],
            [
                'name' => 'Dosen',
                'description' => 'Dosen',
                'can_create' => 1,
                'can_read' => 1,
                'can_update' => 1,
                'can_delete' => 0,
                'created_at' => $peg->created_at ?? $now,
                'updated_at' => $now,
            ]
        );

        DB::table('roles')->updateOrInsert(
            ['code' => 'PEGAWAI'],
            [
                'name' => 'Pegawai/Staff',
                'description' => 'Pegawai/Staff',
                'can_create' => 1,
                'can_read' => 1,
                'can_update' => 1,
                'can_delete' => 0,
                'created_at' => $peg->created_at ?? $now,
                'updated_at' => $now,
            ]
        );

        if (!$peg) {
            return;
        }

        $dosenRoleId = DB::table('roles')->where('code', 'DOSEN')->value('id');
        $pegawaiRoleId = DB::table('roles')->where('code', 'PEGAWAI')->value('id');

        // User yang terhubung employee dengan is_dosen=true -> DOSEN, sisanya -> PEGAWAI
        $dosenUserIds = DB::table('users')
            ->join('employees', 'employees.id', '=', 'users.employee_id')
            ->where('employees.is_dosen', true)
            ->pluck('users.id')
            ->all();

        DB::table('user_roles')->where('role_id', $peg->id)->whereIn('user_id', $dosenUserIds)
            ->update(['role_id' => $dosenRoleId]);

        DB::table('user_roles')->where('role_id', $peg->id)
            ->update(['role_id' => $pegawaiRoleId]);

        // Wariskan permission PEG ke kedua role baru
        $pegPermissions = DB::table('role_permissions')->where('role_id', $peg->id)->pluck('permission_id')->all();
        foreach ([$dosenRoleId, $pegawaiRoleId] as $roleId) {
            foreach ($pegPermissions as $permissionId) {
                DB::table('role_permissions')->updateOrInsert(
                    ['role_id' => $roleId, 'permission_id' => $permissionId],
                    ['created_at' => $now, 'updated_at' => $now]
                );
            }
        }

        DB::table('role_permissions')->where('role_id', $peg->id)->delete();
        DB::table('roles')->where('id', $peg->id)->delete();
    }

    public function down(): void
    {
        $now = now();

        $peg = DB::table('roles')->where('code', 'PEG')->first();
        if (!$peg) {
            $pegId = DB::table('roles')->insertGetId([
                'name' => 'Dosen & Pegawai',
                'code' => 'PEG',
                'description' => 'Dosen & Pegawai',
                'can_create' => 1,
                'can_read' => 1,
                'can_update' => 1,
                'can_delete' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        } else {
            $pegId = $peg->id;
        }

        $splitIds = DB::table('roles')->whereIn('code', ['DOSEN', 'PEGAWAI'])->pluck('id')->all();

        DB::table('user_roles')->whereIn('role_id', $splitIds)->update(['role_id' => $pegId]);

        $permissions = DB::table('role_permissions')->whereIn('role_id', $splitIds)->pluck('permission_id')->unique()->all();
        foreach ($permissions as $permissionId) {
            DB::table('role_permissions')->updateOrInsert(
                ['role_id' => $pegId, 'permission_id' => $permissionId],
                ['created_at' => $now, 'updated_at' => $now]
            );
        }

        DB::table('role_permissions')->whereIn('role_id', $splitIds)->delete();
        DB::table('roles')->whereIn('id', $splitIds)->delete();
    }
};
