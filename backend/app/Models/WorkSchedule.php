<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkSchedule extends Model
{
    protected $fillable = [
        'organizational_unit_id',
        'day_of_week',
        'start_time',
        'end_time',
        'is_working_day',
        'effective_from',
        'effective_until',
        'is_active',
    ];

    protected $casts = [
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'effective_from' => 'date',
        'effective_until' => 'date',
        'is_working_day' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function organizationalUnit()
    {
        return $this->belongsTo(OrganizationalUnit::class);
    }
}