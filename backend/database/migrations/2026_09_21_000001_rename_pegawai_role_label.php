<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('roles')->where('code', 'PEG')->update([
            'name' => 'Dosen & Pegawai',
            'description' => 'Dosen & Pegawai',
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('roles')->where('code', 'PEG')->update([
            'name' => 'Pegawai',
            'description' => 'Pegawai/Dosen',
            'updated_at' => now(),
        ]);
    }
};
