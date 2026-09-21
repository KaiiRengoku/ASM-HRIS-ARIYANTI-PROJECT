<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_balances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_id')->index();
            $table->unsignedBigInteger('leave_type_id')->index();
            $table->year('period_year')->index();
            $table->decimal('entitled_days', 5, 2);
            $table->decimal('adjustment_days', 5, 2)->default(0);
            $table->decimal('used_days', 5, 2)->default(0);
            $table->decimal('remaining_days', 5, 2);
            $table->timestamps();
            $table->unique(['employee_id', 'leave_type_id', 'period_year']);

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('leave_type_id')->references('id')->on('leave_types')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_balances');
    }
};