<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_approvals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('leave_request_id')->index();
            $table->unsignedBigInteger('approver_id')->index();
            $table->unsignedInteger('approval_level'); // 1=Kabag, 2=HRD
            $table->string('status', 30)->index(); // APPROVED, REJECTED, REVISION, PENDING
            $table->text('reason')->nullable();
            $table->dateTime('acted_at')->nullable()->index();
            $table->timestamps();

            $table->foreign('leave_request_id')->references('id')->on('leave_requests')->onDelete('cascade');
            $table->foreign('approver_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_approvals');
    }
};