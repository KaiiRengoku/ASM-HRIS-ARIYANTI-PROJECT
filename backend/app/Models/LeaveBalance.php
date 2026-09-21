<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveBalance extends Model
{
    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'period_year',
        'entitled_days',
        'adjustment_days',
        'used_days',
        'remaining_days',
    ];

    protected $casts = [
        'entitled_days' => 'decimal:2',
        'adjustment_days' => 'decimal:2',
        'used_days' => 'decimal:2',
        'remaining_days' => 'decimal:2',
        'period_year' => 'integer',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function transactions()
    {
        return $this->hasMany(LeaveBalanceTransaction::class);
    }
}