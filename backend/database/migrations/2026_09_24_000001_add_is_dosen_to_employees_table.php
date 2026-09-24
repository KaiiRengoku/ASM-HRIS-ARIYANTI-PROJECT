<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->boolean('is_dosen')->default(false)->after('status_kepegawaian');
        });

        DB::table('employees')
            ->whereIn('position_id', function ($q) {
                $q->select('id')->from('positions')->where('code', 'DOSEN');
            })
            ->update(['is_dosen' => true]);
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('is_dosen');
        });
    }
};
