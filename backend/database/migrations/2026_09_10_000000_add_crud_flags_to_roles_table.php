<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->boolean('can_create')->default(false);
            $table->boolean('can_read')->default(false);
            $table->boolean('can_update')->default(false);
            $table->boolean('can_delete')->default(false);
        });

        $defaults = [
            'HRD' => [1, 1, 1, 1],
            'DIREKTUR' => [0, 1, 0, 0],
            'PD_I' => [0, 1, 0, 0],
            'PD_II' => [0, 1, 0, 0],
            'PD_III' => [0, 1, 0, 0],
            'KABAG' => [0, 1, 1, 0],
            'PEG' => [1, 1, 1, 0],
        ];

        foreach ($defaults as $code => [$c, $r, $u, $d]) {
            DB::table('roles')->where('code', $code)->update([
                'can_create' => $c,
                'can_read' => $r,
                'can_update' => $u,
                'can_delete' => $d,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropColumn(['can_create', 'can_read', 'can_update', 'can_delete']);
        });
    }
};
