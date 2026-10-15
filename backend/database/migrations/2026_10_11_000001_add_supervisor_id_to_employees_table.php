<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Menyimpan ATASAN LANGSUNG tiap pegawai untuk alur cuti/izin bertingkat.
 *
 * Satu kolom: seluruh alur turun otomatis dari data ini (pengaju → atasan → HRD).
 * Nullable: pegawai yang belum dipetakan (NULL) tetap memakai alur lama (fallback).
 * nullOnDelete: bila akun atasan dihapus, pengajuan tidak menggantung — kembali ke alur lama.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->foreignId('supervisor_id')
                ->nullable()
                ->after('position_id')
                ->constrained('employees')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropConstrainedForeignId('supervisor_id');
        });
    }
};
