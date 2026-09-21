<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'Direktur', 'code' => 'DIREKTUR', 'description' => 'Direktur'],
            ['name' => 'Pembantu Direktur I', 'code' => 'PD_I', 'description' => 'Pembantu Direktur I'],
            ['name' => 'Pembantu Direktur II', 'code' => 'PD_II', 'description' => 'Pembantu Direktur II'],
            ['name' => 'Pembantu Direktur III', 'code' => 'PD_III', 'description' => 'Pembantu Direktur III'],
            ['name' => 'Kepala Bagian', 'code' => 'KABAG', 'description' => 'Kepala Bagian'],
            ['name' => 'HRD', 'code' => 'HRD', 'description' => 'Human Resource Development'],
            ['name' => 'Dosen & Pegawai', 'code' => 'PEG', 'description' => 'Dosen & Pegawai'],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->insert([
                'name' => $role['name'],
                'code' => $role['code'],
                'description' => $role['description'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}