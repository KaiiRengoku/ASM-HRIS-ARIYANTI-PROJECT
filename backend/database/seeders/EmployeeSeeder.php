<?php

namespace Database\Seeders;

use App\Models\Employee;
use Illuminate\Database\Seeder;

class EmployeeSeeder extends Seeder
{
    public function run(): void
    {
        Employee::create([
            'nik' => '1111111111111111',
            'nama_lengkap' => 'Ahmad Fauzi',
            'email' => 'ahmad@asm-ariyanti.ac.id',
            'nomor_hp' => '081234567891',
            'jenis_kelamin' => 'L',
            'status_kepegawaian' => 'aktif',
            'jenis_pegawai' => 'Dosen',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);

        Employee::create([
            'nik' => '2222222222222222',
            'nama_lengkap' => 'Siti Rahayu',
            'email' => 'siti@asm-ariyanti.ac.id',
            'nomor_hp' => '081234567892',
            'jenis_kelamin' => 'P',
            'status_kepegawaian' => 'aktif',
            'jenis_pegawai' => 'Staf',
            'tanggal_masuk_kerja' => '2021-06-01',
        ]);

        Employee::create([
            'nik' => '3333333333333333',
            'nama_lengkap' => 'Budi Santoso',
            'email' => 'budi@asm-ariyanti.ac.id',
            'nomor_hp' => '081234567893',
            'jenis_kelamin' => 'L',
            'status_kepegawaian' => 'aktif',
            'jenis_pegawai' => 'Dosen',
            'tanggal_masuk_kerja' => '2019-08-20',
        ]);
    }
}