<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'organizational_unit_id' => ['nullable', 'exists:organizational_units,id'],
            'position_id' => ['nullable', 'exists:positions,id'],
            'nik' => ['required', 'string', 'size:16', 'regex:/^[0-9]{16}$/', 'unique:employees,nik', 'unique:users,nik'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', Rule::in(['HRD', 'DIREKTUR', 'PD_I', 'PD_II', 'PD_III', 'KABAG', 'PEG'])],
            'nama_lengkap' => ['required', 'string', 'max:150'],
            'gelar_depan' => ['nullable', 'string', 'max:50'],
            'gelar_belakang' => ['nullable', 'string', 'max:50'],
            'tempat_lahir' => ['nullable', 'string', 'max:100'],
            'agama' => ['nullable', 'string', 'max:30'],
            'status_pernikahan' => ['nullable', 'in:Kawin,Belum Kawin,Cerai'],
            'alamat_ktp' => ['nullable', 'string'],
            'alamat_domisili' => ['nullable', 'string'],
            'email' => ['required', 'email', 'unique:employees,email', 'unique:users,email'],
            'alamat' => ['nullable', 'string'],
            'nomor_hp' => ['nullable', 'string', 'max:25'],
            'nomor_ktp' => ['nullable', 'string', 'max:20', 'unique:employees,nomor_ktp'],
            'nomor_kk' => ['nullable', 'string', 'max:20'],
            'bpjs_kesehatan' => ['nullable', 'string', 'max:30'],
            'bpjs_ketenagakerjaan' => ['nullable', 'string', 'max:30'],
            'npwp' => ['nullable', 'string', 'max:30'],
            'nip' => ['nullable', 'string', 'size:9', 'regex:/^[0-9]{9}$/', 'unique:employees,nip'],
            'nidn' => ['nullable', 'string', 'size:10', 'regex:/^[0-9]{10}$/', 'unique:employees,nidn'],
            'jenis_kelamin' => ['nullable', 'in:L,P'],
            'tanggal_lahir' => ['nullable', 'date'],
            'tanggal_masuk_kerja' => ['required', 'date'],
            'status_kepegawaian' => ['nullable', 'string', 'max:50'],
            'is_dosen' => ['nullable', 'boolean'],
            'nomor_rekening' => ['nullable', 'string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'nik.required' => 'NIK wajib diisi.',
            'nik.size' => 'NIK harus 16 digit.',
            'nik.unique' => 'NIK sudah terdaftar.',
            'nama_lengkap.required' => 'Nama lengkap wajib diisi.',
            'tanggal_masuk_kerja.required' => 'Tanggal masuk wajib diisi.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.min' => 'Kata sandi minimal 8 karakter.',
            'role.required' => 'Role wajib dipilih.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email sudah terdaftar.',
        ];
    }
}