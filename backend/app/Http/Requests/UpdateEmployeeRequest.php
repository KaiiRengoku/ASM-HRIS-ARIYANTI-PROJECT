<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $routeEmployee = $this->route('employee');
        $id = $routeEmployee instanceof \App\Models\Employee ? $routeEmployee->getKey() : $routeEmployee;
        $userId = $routeEmployee instanceof \App\Models\Employee ? $routeEmployee->user_id : null;

        return [
            'organizational_unit_id' => ['nullable', 'exists:organizational_units,id'],
            'position_id' => ['nullable', 'exists:positions,id'],
            'nik' => ['required', 'string', 'size:16', 'regex:/^[0-9]{16}$/', Rule::unique('employees', 'nik')->ignore($id)],
            'nama_lengkap' => ['required', 'string', 'max:150'],
            'gelar_depan' => ['nullable', 'string', 'max:50'],
            'gelar_belakang' => ['nullable', 'string', 'max:50'],
            'tempat_lahir' => ['nullable', 'string', 'max:100'],
            'agama' => ['nullable', 'string', 'max:30'],
            'status_pernikahan' => ['nullable', 'in:Kawin,Belum Kawin,Cerai'],
            'alamat_ktp' => ['nullable', 'string'],
            'alamat_domisili' => ['nullable', 'string'],
            'email' => ['required', 'email', Rule::unique('employees', 'email')->ignore($id), Rule::unique('users', 'email')->ignore($userId)],
            'alamat' => ['nullable', 'string'],
            'nomor_hp' => ['nullable', 'string', 'max:25'],
            'nomor_ktp' => ['nullable', 'string', 'max:20', Rule::unique('employees', 'nomor_ktp')->ignore($id)],
            'nomor_kk' => ['nullable', 'string', 'max:20'],
            'bpjs_kesehatan' => ['nullable', 'string', 'max:30'],
            'bpjs_ketenagakerjaan' => ['nullable', 'string', 'max:30'],
            'npwp' => ['nullable', 'string', 'max:30'],
            'nip' => ['nullable', 'string', 'size:9', 'regex:/^[0-9]{9}$/', Rule::unique('employees', 'nip')->ignore($id)],
            'nidn' => ['nullable', 'string', 'size:10', 'regex:/^[0-9]{10}$/', Rule::unique('employees', 'nidn')->ignore($id)],
            'jenis_kelamin' => ['nullable', 'in:L,P'],
            'tanggal_lahir' => ['nullable', 'date'],
            'tanggal_masuk_kerja' => ['sometimes', 'required', 'date'],
            'status_kepegawaian' => ['nullable', 'string', 'max:50'],
            'nomor_rekening' => ['nullable', 'string', 'max:50'],
        ];
    }
}