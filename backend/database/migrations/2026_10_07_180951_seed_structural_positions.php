<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Menambah daftar JABATAN (posisi struktural) sesuai struktur organisasi pemilik.
 *
 * PENTING:
 * - JABATAN hanyalah keterangan hierarki struktural, TIDAK memberi hak akses.
 * - Hak akses tetap sepenuhnya ditentukan oleh ROLE (tabel `roles`) yang TIDAK diubah.
 * - Nama jabatan sekarang boleh berbeda dari nama role (ikatan nama jabatan-role dilepas).
 * - Kolom `organizational_unit_id` sengaja dibiarkan NULL (pemilik tidak membuat daftar Bagian/Unit).
 * - Idempoten: memakai updateOrInsert berdasarkan `code`, aman dijalankan berulang.
 * - Jabatan DIREKTUR/HRD/KABAG/DOSEN/PEGAWAI/PD_I/PD_II/PD_III yang lama dipertahankan (hanya dipastikan aktif).
 */
return new class extends Migration
{
    /**
     * Daftar jabatan struktural baru: code => name.
     * PD_I, PD_II, PD_III sudah ada sebelumnya (tidak diulang di sini).
     *
     * @var array<string, string>
     */
    private array $positions = [
        // Role DIREKTUR
        'DIREKTUR_ASM' => 'Direktur ASM Ariyanti',
        'KETUA_SPMI' => 'Ketua SPMI',
        'KETUA_LPPM' => 'Ketua LPPM',

        // Role KABAG
        'KAPRODI_MANAJEMEN_ADMINISTRASI' => 'Kaprodi Manajemen Administrasi',
        'KAPRODI_SEKRETARI' => 'Kaprodi Sekretari',
        'KABAG_UPT' => 'Kabag UPT',
        'KABAG_ADMIN_AKADEMIK' => 'Kabag Administrasi Akademik',
        'KABAG_KEUANGAN' => 'Kabag Keuangan',
        'KABAG_UMUM_KEPEGAWAIAN' => 'Kabag Umum & Kepegawaian',
        'KABAG_KEMAHASISWAAN_ALUMNI' => 'Kabag Kemahasiswaan & Alumni',
        'KABAG_MARKETING' => 'Kabag Marketing',

        // Role PEGAWAI/Staff
        'KASUBAG_UPT' => 'Kasubag UPT',
        'KASUBAG_LAB_KOMPUTER' => 'Kasubag Lab. Komputer',
        'KASUBAG_LAB_MENGETIK' => 'Kasubag Lab. Mengetik',
        'KASUBAG_LAB_BAHASA' => 'Kasubag Lab. Bahasa',
        'KASUBAG_LAB_PERKANTORAN' => 'Kasubag Lab. Perkantoran',
        'KASUBAG_LAB_PERHOTELAN' => 'Kasubag Lab. Perhotelan',
        'KASUBAG_UPT_PERPUSTAKAAN' => 'Kasubag UPT Perpustakaan',
        'KASUBAG_ADMIN_AKADEMIK' => 'Kasubag Administrasi Akademik',
        'PELAKSANA_ADMIN_AKADEMIK' => 'Pelaksana Administrasi Akademik',
        'PELAKSANA_LABORAN' => 'Pelaksana Laboran',
        'PELAKSANA_UPT_PERPUSTAKAAN' => 'Pelaksana UPT Perpustakaan',
        'KASUBAG_KEUANGAN' => 'Kasubag Keuangan',
        'PELAKSANA_KEUANGAN_CS' => 'Pelaksana Keuangan / C&S',
        'PLT_KASUBAG_KEPEGAWAIAN' => 'PLT Kasubag Kepegawaian',
        'PELAKSANA_PERLENGKAPAN' => 'Pelaksana Perlengkapan',
        'KASUBAG_KEMAHASISWAAN_ALUMNI' => 'Kasubag Kemahasiswaan & Alumni',
        'PELAKSANA_KEMAHASISWAAN' => 'Pelaksana Kemahasiswaan',
        'KASUBAG_MARKETING' => 'Kasubag Marketing',
    ];

    public function up(): void
    {
        $now = now();

        foreach ($this->positions as $code => $name) {
            DB::table('positions')->updateOrInsert(
                ['code' => $code],
                [
                    // organizational_unit_id sengaja NULL (pemilik tidak memakai daftar Bagian/Unit).
                    'organizational_unit_id' => null,
                    'name' => $name,
                    'is_active' => true,
                    'updated_at' => $now,
                    'created_at' => $now,
                ]
            );
        }

        // Pastikan jabatan lama tetap ada & aktif (tidak diubah namanya).
        DB::table('positions')
            ->whereIn('code', ['HRD', 'DIREKTUR', 'KABAG', 'DOSEN', 'PEGAWAI', 'PD_I', 'PD_II', 'PD_III'])
            ->update(['is_active' => true, 'updated_at' => $now]);
    }

    public function down(): void
    {
        // Jabatan lama TIDAK dihapus. Jabatan baru cukup dinonaktifkan (soft, tidak merusak data pegawai).
        DB::table('positions')
            ->whereIn('code', array_keys($this->positions))
            ->update(['is_active' => false, 'updated_at' => now()]);
    }
};
