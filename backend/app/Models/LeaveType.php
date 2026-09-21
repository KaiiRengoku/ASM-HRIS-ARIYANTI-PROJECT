<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveType extends Model
{
    protected $fillable = [
        'code',
        'name',
        'is_leave_balance_deducted',
        'requires_attachment',
        'requires_medical_certificate',
        'is_active',
        'description',
    ];

    protected $casts = [
        'is_leave_balance_deducted' => 'boolean',
        'requires_attachment' => 'boolean',
        'requires_medical_certificate' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function leaveRequests()
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function leaveBalances()
    {
        return $this->hasMany(LeaveBalance::class);
    }
}