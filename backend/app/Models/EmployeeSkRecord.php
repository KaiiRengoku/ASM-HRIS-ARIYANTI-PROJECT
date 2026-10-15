<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeSkRecord extends Model
{
    protected $table = 'employee_sk_records';

    // Daftar jenis SK yang didukung. Dipakai juga oleh validasi controller.
    public const JENIS = ['JABATAN_FUNGSIONAL', 'ANGKA_KREDIT_PAK', 'KENAIKAN_PANGKAT'];

    protected $fillable = [
        'employee_id',
        'jenis_sk',
        'nomor_sk',
        'tanggal_sk',
        'tmt',
        'pejabat_penetap',
        'keterangan',
        'document_id',
    ];

    protected $casts = [
        'tanggal_sk' => 'date:Y-m-d',
        'tmt' => 'date:Y-m-d',
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
