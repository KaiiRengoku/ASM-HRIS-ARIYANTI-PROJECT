<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveRequest extends Model
{
    protected $fillable = [
        'employee_id',
        'leave_type_id',
        'start_date',
        'end_date',
        'total_days',
        'reason',
        'status',
        'submitted_at',
        'finalized_at',
        'cancelled_at',
        'source',
        'created_by',
        'updated_by',
        'emergency_address',
        'emergency_contact',
        'is_emergency',
        'emergency_reason',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'total_days' => 'decimal:2',
        'submitted_at' => 'datetime',
        'finalized_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'is_emergency' => 'boolean',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType()
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function approvals()
    {
        return $this->hasMany(LeaveApproval::class);
    }

    public function attachments()
    {
        return $this->hasMany(LeaveAttachment::class);
    }

    public function balanceTransactions()
    {
        return $this->hasMany(LeaveBalanceTransaction::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}