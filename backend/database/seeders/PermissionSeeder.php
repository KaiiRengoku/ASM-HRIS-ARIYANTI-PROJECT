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
            ['name' => 'Employee Create', 'code' => 'employee.create', 'description' => 'Membuat data pegawai baru'],
            ['name' => 'Employee Update', 'code' => 'employee.update', 'description' => 'Mengubah data pegawai'],
            ['name' => 'Employee Delete', 'code' => 'employee.delete', 'description' => 'Menghapus data pegawai'],
            ['name' => 'Employee Restore', 'code' => 'employee.restore', 'description' => 'Memulihkan data pegawai yang terhapus'],
            ['name' => 'Employee Export', 'code' => 'employee.export', 'description' => 'Mengekspor data pegawai'],

            // Document
            ['name' => 'Document View', 'code' => 'document.view', 'description' => 'Melihat dokumen arsip pegawai'],
            ['name' => 'Document Upload', 'code' => 'document.upload', 'description' => 'Mengunggah dokumen arsip'],
            ['name' => 'Document Update', 'code' => 'document.update', 'description' => 'Memperbarui dokumen arsip'],
            ['name' => 'Document Delete', 'code' => 'document.delete', 'description' => 'Menghapus dokumen arsip'],

            // Auth & Access
            ['name' => 'User Create', 'code' => 'auth.user.create', 'description' => 'Membuat akun pengguna'],
            ['name' => 'User Update', 'code' => 'auth.user.update', 'description' => 'Mengubah akun pengguna (role & kata sandi)'],
            ['name' => 'Role Manage', 'code' => 'auth.role.manage', 'description' => 'Mengelola hak akses role (halaman Hak Akses)'],

            // Leave
            ['name' => 'Leave View', 'code' => 'leave.view', 'description' => 'Melihat data cuti & izin'],
            ['name' => 'Leave Create', 'code' => 'leave.create', 'description' => 'Mengajukan cuti / izin'],
            ['name' => 'Leave Update', 'code' => 'leave.update', 'description' => 'Mengubah data pengajuan cuti'],
            ['name' => 'Leave Delete', 'code' => 'leave.delete', 'description' => 'Menghapus riwayat pengajuan cuti'],
            ['name' => 'Leave Approve', 'code' => 'leave.approve', 'description' => 'Menyetujui pengajuan cuti'],
            ['name' => 'Leave Reject', 'code' => 'leave.reject', 'description' => 'Menolak pengajuan cuti'],
            ['name' => 'Leave Adjust Balance', 'code' => 'leave.adjust_balance', 'description' => 'Menyesuaikan sisa jatah cuti'],
            ['name' => 'Leave Cancel', 'code' => 'leave.cancel', 'description' => 'Membatalkan pengajuan cuti'],
            ['name' => 'Leave Export', 'code' => 'leave.export', 'description' => 'Mengekspor data cuti'],

            // Calendar
            ['name' => 'Calendar Manage', 'code' => 'calendar.manage', 'description' => 'Mengelola kalender kerja & hari libur'],

            // Report
            ['name' => 'Report View', 'code' => 'report.view', 'description' => 'Melihat laporan & mengunduh biodata'],
            ['name' => 'Report Export', 'code' => 'report.export', 'description' => 'Mengekspor laporan'],

            // Audit
            ['name' => 'Audit View', 'code' => 'audit.view', 'description' => 'Melihat log aktivitas (audit trail)'],
        ];

        foreach ($permissions as $permission) {
            $exists = DB::table('permissions')->where('code', $permission['code'])->exists();
            if ($exists) {
                DB::table('permissions')->where('code', $permission['code'])
                    ->update($permission + ['updated_at' => now()]);
            } else {
                DB::table('permissions')->insert($permission + ['created_at' => now(), 'updated_at' => now()]);
            }
        }
    }
}
