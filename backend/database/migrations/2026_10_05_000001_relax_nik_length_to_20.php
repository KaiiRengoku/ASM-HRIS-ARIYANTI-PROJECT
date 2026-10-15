<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `nik` = Nomor Induk Kepegawaian (identifier login bertipe angka),
     * BUKAN KTP (`nomor_ktp` terpisah). Dulu dipaksa 16 digit; kini 6-20 digit.
     * employees.nik semula char(16) (fixed-width, rawan padding spasi) -> varchar(20).
     * users.nik semula varchar(16) -> varchar(20).
     */
    public function up(): void
    {
        // Catatan: ->change() hanya mengubah TIPE kolom. Index unique yang sudah
        // ada (employees_nik_unique / users_nik_unique) TETAP dipertahankan, jadi
        // kita TIDAK memanggil ->unique() lagi (kalau dipanggil, Laravel 12 akan
        // mencoba menambah index dengan nama sama -> error 1061 Duplicate key name).
        Schema::table('employees', function (Blueprint $table) {
            $table->string('nik', 20)->change();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('nik', 20)->nullable()->change();
        });

        // Defensif: pastikan tidak ada sisa padding dari char(16). Idempoten.
        DB::statement('UPDATE employees SET nik = TRIM(nik)');
        DB::statement('UPDATE users SET nik = TRIM(nik)');
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->char('nik', 16)->change();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('nik', 16)->nullable()->change();
        });
    }
};
