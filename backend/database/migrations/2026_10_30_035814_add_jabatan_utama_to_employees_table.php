<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            // Jabatan utama untuk orang yang merangkap (mis. direktur sekaligus dosen).
            // Diisi kode jabatan (mis. DIREKTUR, DOSEN, KABAG). Bila null, pakai jabatan resmi.
            $table->string('jabatan_utama', 50)->nullable()->after('position_id');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('jabatan_utama');
        });
    }
};
