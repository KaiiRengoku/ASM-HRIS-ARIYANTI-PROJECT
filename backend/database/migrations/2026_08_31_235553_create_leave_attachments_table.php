<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_attachments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('leave_request_id')->index();
            $table->string('attachment_type', 50)->index(); // MEDICAL_CERTIFICATE, etc
            $table->string('file_name', 255);
            $table->string('storage_disk', 50);
            $table->string('storage_path', 500);
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('file_size');
            $table->unsignedBigInteger('uploaded_by');
            $table->unsignedBigInteger('verified_by')->nullable();
            $table->dateTime('verified_at')->nullable();
            $table->string('verification_status', 30)->default('PENDING')->index(); // PENDING, VALID, INVALID
            $table->text('verification_note')->nullable();
            $table->timestamps();

            $table->foreign('leave_request_id')->references('id')->on('leave_requests')->onDelete('cascade');
            $table->foreign('uploaded_by')->references('id')->on('users');
            $table->foreign('verified_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_attachments');
    }
};