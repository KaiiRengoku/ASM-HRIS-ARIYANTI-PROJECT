<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Perubahan atas permintaan pemilik (tab "Pangkat & Fungsional" di Profil):
// nilai "Status Kepegawaian" diubah dari PNS/DPK/Non-PNS menjadi Tetap/Tidak Tetap.
//
// Tabel employee_functionals saat migrasi ini dibuat berisi 0 baris sehingga
// tidak perlu migrasi data. Bila ternyata ada nilai lama, kita konversi
// eksplisit agar tidak ada data hilang:
// (aman & idempoten; bila tabel kosong, UPDATE tidak mengubah apa pun.)
return new class extends Migration
{
    public function up(): void
    {
        // Longgarkan dulu menjadi VARCHAR agar konversi nilai tidak terpotong
        // oleh batasan enum lama.
        DB::statement("ALTER TABLE employee_functionals MODIFY status_kepegawaian_detail VARCHAR(20) NULL");

        DB::table('employee_functionals')
            ->whereIn('status_kepegawaian_detail', ['PNS', 'DPK'])
            ->update(['status_kepegawaian_detail' => 'Tetap']);

        DB::table('employee_functionals')
            ->where('status_kepegawaian_detail', 'Non-PNS')
            ->update(['status_kepegawaian_detail' => 'Tidak Tetap']);

        DB::statement("ALTER TABLE employee_functionals MODIFY status_kepegawaian_detail ENUM('Tetap', 'Tidak Tetap') NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE employee_functionals MODIFY status_kepegawaian_detail VARCHAR(20) NULL");

        DB::table('employee_functionals')
            ->where('status_kepegawaian_detail', 'Tetap')
            ->update(['status_kepegawaian_detail' => 'PNS']);

        DB::table('employee_functionals')
            ->where('status_kepegawaian_detail', 'Tidak Tetap')
            ->update(['status_kepegawaian_detail' => 'Non-PNS']);

        DB::statement("ALTER TABLE employee_functionals MODIFY status_kepegawaian_detail ENUM('PNS', 'DPK', 'Non-PNS') NULL");
    }
};
