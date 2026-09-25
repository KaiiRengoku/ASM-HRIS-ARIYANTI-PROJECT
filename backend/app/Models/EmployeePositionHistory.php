<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeePositionHistory extends Model
{
    protected $fillable = [
        'employee_id',
        'jabatan',
        'unit_kerja',
        'no_sk',
        'start_date',
        'end_date',
        'keterangan',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
