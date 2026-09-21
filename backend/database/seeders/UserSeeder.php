<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Employee;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $employee = Employee::create([
            'nik' => '1234567890123456',
            'nama_lengkap' => 'HRD Admin',
            'email' => 'hrd@asm-ariyanti.ac.id',
            'status_kepegawaian' => 'aktif',
            'jenis_pegawai' => 'Staf',
            'tanggal_masuk_kerja' => '2020-01-01',
        ]);

        $user = User::create([
            'nik' => '1234567890123456',
            'name' => 'HRD Admin',
            'email' => 'hrd@asm-ariyanti.ac.id',
            'password' => Hash::make('hrd123'),
        ]);

        $role = Role::where('code', 'HRD')->first();
        if ($role) {
            $user->roles()->attach($role->id);
        }

        $user->employee_id = $employee->id;
        $user->save();
    }
}