<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organizational_unit_id')->nullable()->index();
            $table->string('name', 150)->index();
            $table->string('code', 50)->unique();
            $table->string('position_type', 50)->nullable()->index();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('organizational_unit_id')->references('id')->on('organizational_units')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('positions');
    }
};