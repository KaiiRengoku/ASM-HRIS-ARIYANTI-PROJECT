<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveAttachment extends Model
{
    protected $fillable = [
        'leave_request_id',
        'attachment_type',
        'file_name',
        'storage_disk',
        'storage_path',
        'mime_type',
        'file_size',
        'uploaded_by',
        'verified_by',
        'verified_at',
        'verification_status',
        'verification_note',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'verified_at' => 'datetime',
    ];

    public function leaveRequest()
    {
        return $this->belongsTo(LeaveRequest::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}