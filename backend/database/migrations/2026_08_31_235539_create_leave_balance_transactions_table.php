<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_balance_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('leave_balance_id')->index();
            $table->unsignedBigInteger('employee_id')->index();
            $table->unsignedBigInteger('leave_request_id')->nullable()->index();
            $table->string('transaction_type', 50)->index(); // ACCRUAL, DEDUCT, ADJUSTMENT, REVERSAL, MANUAL
            $table->decimal('amount', 5, 2);
            $table->decimal('balance_before', 5, 2);
            $table->decimal('balance_after', 5, 2);
            $table->string('reason', 255)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('leave_balance_id')->references('id')->on('leave_balances')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('leave_request_id')->references('id')->on('leave_requests')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_balance_transactions');
    }
};