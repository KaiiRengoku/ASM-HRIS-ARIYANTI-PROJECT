<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeCertification extends Model
{
    public const CATEGORIES = ['SERTIFIKAT', 'PELATIHAN', 'SEMINAR', 'NONFORMAL'];

    protected $fillable = [
        'employee_id',
        'category',
        'name',
        'organizer',
        'certificate_number',
        'issued_at',
        'valid_until',
        'duration',
        'participant_role',
        'description',
        'document_id',
    ];

    protected $casts = [
        'issued_at' => 'date:Y-m-d',
        'valid_until' => 'date:Y-m-d',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function document()
    {
        return $this->belongsTo(EmployeeDocument::class, 'document_id');
    }
}
