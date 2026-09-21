<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_requests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('employee_id')->index();
            $table->unsignedBigInteger('leave_type_id')->index();
            $table->date('start_date')->index();
            $table->date('end_date')->index();
            $table->decimal('total_days', 5, 2);
            $table->text('reason')->nullable();
            $table->string('status', 50)->default('Draft')->index(); // Draft, Pending, Approved, Rejected, Revision, Cancelled, Completed
            $table->dateTime('submitted_at')->nullable()->index();
            $table->dateTime('finalized_at')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->string('source', 30)->default('ONLINE')->index(); // ONLINE, MANUAL
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes()->index();

            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('leave_type_id')->references('id')->on('leave_types')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users');
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_requests');
    }
};