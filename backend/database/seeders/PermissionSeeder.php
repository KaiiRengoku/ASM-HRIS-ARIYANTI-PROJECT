<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            // Employee
            ['name' => 'Employee View', 'code' => 'employee.view', 'description' => 'Melihat data pegawai'],
            ['name' => 'Employee Create', 'code' => 'employee.create', 'description' => 'Membuat data pegawai'],
            ['name' => 'Employee Update', 'code' => 'employee.update', 'description' => 'Memperbarui data pegawai'],
            ['name' => 'Employee Delete', 'code' => 'employee.delete', 'description' => 'Menghapus data pegawai'],
            ['name' => 'Employee Restore', 'code' => 'employee.restore', 'description' => 'Memulihkan data pegawai'],
            ['name' => 'Employee Export', 'code' => 'employee.export', 'description' => 'Ekspor data pegawai'],

            // Document
            ['name' => 'Document View', 'code' => 'document.view', 'description' => 'Melihat dokumen'],
            ['name' => 'Document Upload', 'code' => 'document.upload', 'description' => 'Mengunggah dokumen'],
            ['name' => 'Document Update', 'code' => 'document.update', 'description' => 'Memperbarui dokumen'],
            ['name' => 'Document Delete', 'code' => 'document.delete', 'description' => 'Menghapus dokumen'],

            // Auth & Access
            ['name' => 'User Create', 'code' => 'auth.user.create', 'description' => 'Membuat akun pengguna'],
            ['name' => 'User Update', 'code' => 'auth.user.update', 'description' => 'Memperbarui akun pengguna'],
            ['name' => 'Role Manage', 'code' => 'auth.role.manage', 'description' => 'Mengelola role'],

            // Leave
            ['name' => 'Leave View', 'code' => 'leave.view', 'description' => 'Melihat cuti'],
            ['name' => 'Leave Create', 'code' => 'leave.create', 'description' => 'Membuat pengajuan cuti'],
            ['name' => 'Leave Update', 'code' => 'leave.update', 'description' => 'Memperbarui pengajuan cuti'],
            ['name' => 'Leave Delete', 'code' => 'leave.delete', 'description' => 'Menghapus pengajuan cuti'],
            ['name' => 'Leave Approve', 'code' => 'leave.approve', 'description' => 'Menyetujui cuti'],
            ['name' => 'Leave Reject', 'code' => 'leave.reject', 'description' => 'Menolak cuti'],
            ['name' => 'Leave Adjust Balance', 'code' => 'leave.adjust_balance', 'description' => 'Menyesuaikan saldo cuti'],
            ['name' => 'Leave Cancel', 'code' => 'leave.cancel', 'description' => 'Membatalkan cuti'],
            ['name' => 'Leave Export', 'code' => 'leave.export', 'description' => 'Ekspor data cuti'],

            // Calendar
            ['name' => 'Calendar Manage', 'code' => 'calendar.manage', 'description' => 'Mengelola kalender'],

            // Report
            ['name' => 'Report View', 'code' => 'report.view', 'description' => 'Melihat laporan'],
            ['name' => 'Report Export', 'code' => 'report.export', 'description' => 'Ekspor laporan'],

            // Audit
            ['name' => 'Audit View', 'code' => 'audit.view', 'description' => 'Melihat audit trail'],
        ];

        foreach ($permissions as $permission) {
            DB::table('permissions')->insert([
                'name' => $permission['name'],
                'code' => $permission['code'],
                'description' => $permission['description'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}