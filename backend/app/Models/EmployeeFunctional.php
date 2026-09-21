<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployeeFunctional extends Model
{
    protected $fillable = [
        'employee_id',
        'status_kepegawaian_detail',
        'jabatan_fungsional',
        'pangkat',
        'golongan_ruang',
        'tmt_pangkat',
        'bidang_keahlian',
        'unit_kerja',
        'sertifikasi',
        'riwayat_penelitian_pengabdian',
        'pernyataan_disetujui_pada',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
