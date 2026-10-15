<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nik' => ['required', 'string', 'size:9', 'regex:/^[0-9]{9}$/'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nik.required' => 'Nomor Induk Kepegawaian wajib diisi.',
            'nik.size' => 'Nomor Induk Kepegawaian harus tepat 9 digit angka.',
            'nik.regex' => 'Nomor Induk Kepegawaian hanya boleh berisi angka.',
            'password.required' => 'Kata sandi wajib diisi.',
        ];
    }
}