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
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
