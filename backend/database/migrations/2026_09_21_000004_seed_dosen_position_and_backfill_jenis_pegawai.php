<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $exists = DB::table('positions')->where('code', 'DOSEN')->exists();
        if (!$exists) {
            DB::table('positions')->insert([
                'name' => 'Dosen',
                'code' => 'DOSEN',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('employees')
            ->whereNull('jenis_pegawai')
            ->update(['jenis_pegawai' => 'Staf', 'updated_at' => now()]);
    }

    public function down(): void
    {
        $dosenId = DB::table('positions')->where('code', 'DOSEN')->value('id');
        if ($dosenId && !DB::table('employees')->where('position_id', $dosenId)->exists()) {
            DB::table('positions')->where('id', $dosenId)->delete();
        }
    }
};
