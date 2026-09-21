<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrganizationalUnit extends Model
{
    protected $fillable = [
        'parent_id',
        'name',
        'code',
        'unit_type',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function positions()
    {
        return $this->hasMany(Position::class);
    }

    public function employees()
    {
        return $this->hasMany(Employee::class, 'organizational_unit_id');
    }

    public function workSchedules()
    {
        return $this->hasMany(WorkSchedule::class);
    }
}