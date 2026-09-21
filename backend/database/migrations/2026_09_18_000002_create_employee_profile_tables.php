<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_educations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->enum('jenjang', ['S1', 'S2', 'S3']);
            $table->string('nama_pt', 150)->nullable();
            $table->string('jurusan', 150)->nullable();
            $table->year('tahun_masuk')->nullable();
            $table->year('tahun_lulus')->nullable();
            $table->timestamps();
            $table->unique(['employee_id', 'jenjang']);
        });

        Schema::create('employee_functionals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->unique()->constrained()->cascadeOnDelete();
            $table->enum('status_kepegawaian_detail', ['PNS', 'DPK', 'Non-PNS'])->nullable();
            $table->enum('jabatan_fungsional', ['Asisten Ahli', 'Lektor', 'Lektor Kepala', 'Guru Besar'])->nullable();
            $table->string('pangkat', 100)->nullable();
            $table->string('golongan_ruang', 50)->nullable();
            $table->date('tmt_pangkat')->nullable();
            $table->string('bidang_keahlian', 150)->nullable();
            $table->string('unit_kerja', 150)->nullable();
            $table->text('sertifikasi')->nullable();
            $table->text('riwayat_penelitian_pengabdian')->nullable();
            $table->timestamp('pernyataan_disetujui_pada')->nullable();
            $table->timestamps();
        });

        Schema::create('teaching_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->string('kode_matkul', 50)->nullable();
            $table->string('nama_matkul', 150)->nullable();
            $table->decimal('sks', 4, 1)->nullable();
            $table->string('semester', 50)->nullable();
            $table->string('program_studi', 150)->nullable();
            $table->string('kelas', 50)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teaching_assignments');
        Schema::dropIfExists('employee_functionals');
        Schema::dropIfExists('employee_educations');
    }
};
