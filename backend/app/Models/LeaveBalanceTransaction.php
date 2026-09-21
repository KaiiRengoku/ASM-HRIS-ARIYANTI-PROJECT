<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveBalanceTransaction extends Model
{
    protected $fillable = [
        'leave_balance_id',
        'employee_id',
        'leave_request_id',
        'transaction_type',
        'amount',
        'balance_before',
        'balance_after',
        'reason',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_before' => 'decimal:2',
        'balance_after' => 'decimal:2',
    ];

    public function leaveBalance()
    {
        return $this->belongsTo(LeaveBalance::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveRequest()
    {
        return $this->belongsTo(LeaveRequest::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}