<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LeaveTypeSeeder extends Seeder
{
    public function run(): void
    {
        $leaveTypes = [
            [
                'code' => 'ANNUAL',
                'name' => 'Cuti Tahunan',
                'is_leave_balance_deducted' => true,
                'requires_attachment' => false,
                'requires_medical_certificate' => false,
                'is_active' => true,
                'description' => 'Cuti tahunan pegawai',
            ],
            [
                'code' => 'SICK',
                'name' => 'Cuti Sakit',
                'is_leave_balance_deducted' => true,
                'requires_attachment' => false,
                'requires_medical_certificate' => true,
                'is_active' => true,
                'description' => 'Cuti sakit dengan/sans surat dokter',
            ],
            [
                'code' => 'MATERNITY',
                'name' => 'Cuti Melahirkan',
                'is_leave_balance_deducted' => false,
                'requires_attachment' => true,
                'requires_medical_certificate' => true,
                'is_active' => true,
                'description' => 'Cuti melahirkan',
            ],
            [
                'code' => 'MOURNING',
                'name' => 'Cuti Berkabung',
                'is_leave_balance_deducted' => false,
                'requires_attachment' => true,
                'requires_medical_certificate' => false,
                'is_active' => true,
                'description' => 'Cuti berkabung',
            ],
            [
                'code' => 'MARRIAGE',
                'name' => 'Cuti Nikah',
                'is_leave_balance_deducted' => false,
                'requires_attachment' => true,
                'requires_medical_certificate' => false,
                'is_active' => true,
                'description' => 'Cuti nikah',
            ],
            [
                'code' => 'PERMIT_ABSENT',
                'name' => 'Izin Tidak Masuk',
                'is_leave_balance_deducted' => false,
                'requires_attachment' => false,
                'requires_medical_certificate' => false,
                'is_active' => true,
                'description' => 'Izin tidak masuk kerja',
            ],
            [
                'code' => 'PERMIT_LEAVE_OFFICE',
                'name' => 'Izin Keluar Kantor',
                'is_leave_balance_deducted' => false,
                'requires_attachment' => false,
                'requires_medical_certificate' => false,
                'is_active' => true,
                'description' => 'Izin keluar kantor',
            ],
        ];

        foreach ($leaveTypes as $type) {
            DB::table('leave_types')->insert([
                'code' => $type['code'],
                'name' => $type['name'],
                'is_leave_balance_deducted' => $type['is_leave_balance_deducted'],
                'requires_attachment' => $type['requires_attachment'],
                'requires_medical_certificate' => $type['requires_medical_certificate'],
                'is_active' => $type['is_active'],
                'description' => $type['description'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}