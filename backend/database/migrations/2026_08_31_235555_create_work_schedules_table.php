<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_schedules', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organizational_unit_id')->nullable()->index();
            $table->unsignedTinyInteger('day_of_week')->index(); // 1-7
            $table->time('start_time');
            $table->time('end_time');
            $table->boolean('is_working_day');
            $table->date('effective_from')->index();
            $table->date('effective_until')->nullable()->index();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();

            $table->foreign('organizational_unit_id')->references('id')->on('organizational_units')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('work_schedules');
    }
};