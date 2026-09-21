<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->string('gelar_depan', 50)->nullable()->after('nama_lengkap');
            $table->string('gelar_belakang', 50)->nullable()->after('gelar_depan');
            $table->string('tempat_lahir', 100)->nullable()->after('tanggal_lahir');
            $table->string('agama', 30)->nullable()->after('jenis_kelamin');
            $table->string('status_pernikahan', 30)->nullable()->after('agama');
            $table->text('alamat_ktp')->nullable()->after('alamat');
            $table->text('alamat_domisili')->nullable()->after('alamat_ktp');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn([
                'gelar_depan',
                'gelar_belakang',
                'tempat_lahir',
                'agama',
                'status_pernikahan',
                'alamat_ktp',
                'alamat_domisili',
            ]);
        });
    }
};
