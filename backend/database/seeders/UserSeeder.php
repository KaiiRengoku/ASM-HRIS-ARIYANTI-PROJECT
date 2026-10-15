<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Employee;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // NIK harus 9 digit angka, kalau tidak login ditolak oleh LoginRequest.
        $nik = env('SEEDER_HRD_NIK', '123456789');
        // Kata sandi tidak lagi di-hardcode. Set SEEDER_HRD_PASSWORD untuk nilai tetap,
        // atau biarkan kosong agar dibuat acak dan dicetak sekali di konsol.
        $password = env('SEEDER_HRD_PASSWORD') ?: Str::password(12);

        $employee = Employee::create([
            'nik' => $nik,
            'nama_lengkap' => 'HRD Admin',
            'email' => 'hrd@asm-ariyanti.ac.id',
            'status_kepegawaian' => 'aktif',
            'tanggal_masuk_kerja' => '2020-01-01',
        ]);

        $user = User::create([
            'nik' => $nik,
            'name' => 'HRD Admin',
            'email' => 'hrd@asm-ariyanti.ac.id',
            'password' => Hash::make($password),
        ]);

        $role = Role::where('code', 'HRD')->first();
        if ($role) {
            $user->roles()->attach($role->id);
        }

        $user->employee_id = $employee->id;
        $user->save();

        $this->command?->info("Akun HRD dibuat. NIK: {$nik} | Kata sandi: {$password}");
    }
}
