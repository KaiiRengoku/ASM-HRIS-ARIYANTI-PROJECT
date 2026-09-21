<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organizational_unit_id')->nullable()->index();
            $table->unsignedBigInteger('position_id')->nullable()->index();
            $table->char('nik', 16)->unique();
            $table->string('nama_lengkap', 150)->index();
            $table->string('email', 150)->unique();
            $table->text('alamat')->nullable();
            $table->string('nomor_hp', 25)->nullable();
            $table->string('nomor_ktp', 20)->unique()->nullable();
            $table->string('nomor_kk', 20)->nullable();
            $table->string('bpjs_kesehatan', 30)->nullable();
            $table->string('bpjs_ketenagakerjaan', 30)->nullable();
            $table->string('npwp', 30)->nullable();
            $table->char('nip', 9)->unique()->nullable();
            $table->char('nidn', 10)->unique()->nullable();
            $table->enum('jenis_kelamin', ['L', 'P'])->nullable();
            $table->date('tanggal_lahir')->nullable();
            $table->date('tanggal_masuk_kerja')->index();
            $table->string('status_kepegawaian', 50)->nullable()->index();
            $table->string('jenis_pegawai', 50)->nullable()->index();
            $table->string('nomor_rekening', 50)->nullable();
            $table->string('foto_path', 500)->nullable();
            $table->timestamps();
            $table->softDeletes()->index();

            $table->foreign('organizational_unit_id')->references('id')->on('organizational_units')->nullOnDelete();
            $table->foreign('position_id')->references('id')->on('positions')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};