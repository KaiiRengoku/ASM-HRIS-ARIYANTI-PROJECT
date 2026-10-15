<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Tabel ini menampung RIWAYAT SK pegawai, khususnya:
//  - SK Jabatan Fungsional (JABATAN_FUNGSIONAL)
//  - SK Penilaian Angka Kredit / PAK (ANGKA_KREDIT_PAK)
//  - SK Kenaikan Pangkat (KENAIKAN_PANGKAT)
//
// Alasan dibuat sebagai tabel riwayat (bukan kolom tambahan di
// employee_functionals): SK tersebut bisa berulang sepanjang karier pegawai,
// sehingga satu baris per pegawai tidak cukup. Satu baris = satu SK.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_sk_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->enum('jenis_sk', ['JABATAN_FUNGSIONAL', 'ANGKA_KREDIT_PAK', 'KENAIKAN_PANGKAT']);
            $table->string('nomor_sk', 100)->nullable();
            $table->date('tanggal_sk')->nullable();
            $table->date('tmt')->nullable();
            $table->string('pejabat_penetap', 150)->nullable();
            $table->text('keterangan')->nullable();
            $table->foreignId('document_id')->nullable()->constrained('employee_documents')->nullOnDelete();
            $table->timestamps();
            $table->index(['employee_id', 'jenis_sk']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_sk_records');
    }
};
