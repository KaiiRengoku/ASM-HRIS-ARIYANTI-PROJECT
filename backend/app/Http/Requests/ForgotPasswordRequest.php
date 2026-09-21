<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ForgotPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nik' => ['required', 'string', 'size:16'],
        ];
    }

    public function messages(): array
    {
        return [
'nik.required' => 'NIK wajib diisi.',
'nik.size' => 'NIK harus 16 digit.',
        ];
    }
}