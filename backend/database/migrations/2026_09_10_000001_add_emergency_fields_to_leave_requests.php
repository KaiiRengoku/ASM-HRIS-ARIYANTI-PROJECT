<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->string('emergency_address', 255)->nullable();
            $table->string('emergency_contact', 50)->nullable();
            $table->boolean('is_emergency')->default(false);
            $table->text('emergency_reason')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn(['emergency_address', 'emergency_contact', 'is_emergency', 'emergency_reason']);
        });
    }
};