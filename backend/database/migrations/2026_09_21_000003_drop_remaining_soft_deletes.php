<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Menghapus baris soft-deleted itu PERMANEN dan tidak bisa dibatalkan.
        // Karena itu purge hanya jalan bila diminta eksplisit (PURGE_SOFT_DELETED=true).
        // Bila tidak, baris dibiarkan: kolom deleted_at di-drop sehingga baris itu
        // kembali aktif — masih bisa dihapus ulang, tidak hilang tanpa jejak.
        $purge = filter_var(env('PURGE_SOFT_DELETED', false), FILTER_VALIDATE_BOOL);

        foreach (['holidays', 'positions', 'organizational_units', 'employees', 'leave_requests', 'employee_documents'] as $table) {
            if (Schema::hasColumn($table, 'deleted_at')) {
                $count = DB::table($table)->whereNotNull('deleted_at')->count();
                if ($count > 0) {
                    Log::warning("Migration drop_remaining_soft_deletes: {$table} punya {$count} baris soft-deleted; " . ($purge ? 'dihapus (PURGE_SOFT_DELETED=true).' : 'DIPERTAHANKAN (set PURGE_SOFT_DELETED=true untuk menghapus).'));
                }
                if ($purge) {
                    DB::table($table)->whereNotNull('deleted_at')->delete();
                }
            }
        }

        foreach (['holidays', 'positions', 'organizational_units', 'employees', 'leave_requests', 'employee_documents'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }
    }

    public function down(): void
    {
        foreach (['employee_documents', 'leave_requests', 'employees', 'organizational_units', 'positions', 'holidays'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->softDeletes();
            });
        }
    }
};
