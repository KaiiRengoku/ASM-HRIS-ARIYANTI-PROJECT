<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['holidays', 'positions', 'organizational_units', 'employees', 'leave_requests', 'employee_documents'] as $table) {
            if (Schema::hasColumn($table, 'deleted_at')) {
                DB::table($table)->whereNotNull('deleted_at')->delete();
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
