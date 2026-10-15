<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Wadah terstruktur 3B+4A/B/C: pendidikan nonformal, sertifikat,
        // pelatihan, seminar. Satu tabel berkategori, file numpang
        // employee_documents (document_id opsional).
        Schema::create('employee_certifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->string('category', 20);
            $table->string('name', 200);
            $table->string('organizer', 200)->nullable();
            $table->string('certificate_number', 100)->nullable();
            $table->date('issued_at')->nullable();
            $table->date('valid_until')->nullable();
            $table->string('duration', 100)->nullable();
            $table->string('participant_role', 50)->nullable();
            $table->text('description')->nullable();
            $table->foreignId('document_id')->nullable()->constrained('employee_documents')->nullOnDelete();
            $table->timestamps();
            $table->index(['employee_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_certifications');
    }
};
