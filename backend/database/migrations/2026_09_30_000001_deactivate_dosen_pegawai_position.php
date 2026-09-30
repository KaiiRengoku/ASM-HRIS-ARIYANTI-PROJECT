<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $dosenId = DB::table('positions')->where('code', 'DOSEN')->value('id');
        $pegId = DB::table('positions')->where('code', 'PEG')->value('id');

        if ($dosenId && $pegId) {
            DB::table('employees')
                ->where('position_id', $pegId)
                ->update(['position_id' => $dosenId, 'updated_at' => now()]);
        }

        DB::table('positions')->where('code', 'PEG')->update([
            'is_active' => false,
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('positions')->where('code', 'PEG')->update([
            'is_active' => true,
            'updated_at' => now(),
        ]);
    }
};
