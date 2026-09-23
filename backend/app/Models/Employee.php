<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    protected $fillable = [
        'organizational_unit_id',
        'position_id',
        'nik',
        'nama_lengkap',
        'gelar_depan',
        'gelar_belakang',
        'tempat_lahir',
        'agama',
        'status_pernikahan',
        'alamat_ktp',
        'alamat_domisili',
        'email',
        'alamat',
        'nomor_hp',
        'nomor_ktp',
        'nomor_kk',
        'bpjs_kesehatan',
        'bpjs_ketenagakerjaan',
        'npwp',
        'nip',
        'nidn',
        'jenis_kelamin',
        'tanggal_lahir',
        'tanggal_masuk_kerja',
        'status_kepegawaian',
        'nomor_rekening',
        'foto_path',
    ];

    protected $casts = [
        'tanggal_lahir' => 'date',
        'tanggal_masuk_kerja' => 'date',
    ];

    public function user()
    {
        return $this->hasOne(User::class);
    }

    public function organizationalUnit()
    {
        return $this->belongsTo(OrganizationalUnit::class, 'organizational_unit_id');
    }

    public function position()
    {
        return $this->belongsTo(Position::class, 'position_id');
    }

    public function documents()
    {
        return $this->hasMany(EmployeeDocument::class);
    }

    public function leaveRequests()
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function leaveBalances()
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function educations()
    {
        return $this->hasMany(EmployeeEducation::class);
    }

    public function functional()
    {
        return $this->hasOne(EmployeeFunctional::class);
    }

    public function teachingAssignments()
    {
        return $this->hasMany(TeachingAssignment::class);
    }
}
