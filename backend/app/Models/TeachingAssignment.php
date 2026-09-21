<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeachingAssignment extends Model
{
    protected $fillable = [
        'employee_id',
        'kode_matkul',
        'nama_matkul',
        'sks',
        'semester',
        'program_studi',
        'kelas',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
