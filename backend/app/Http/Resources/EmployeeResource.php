<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organizational_unit_id' => $this->organizational_unit_id,
            'position_id' => $this->position_id,
            'organizational_unit' => $this->whenLoaded('organizationalUnit', fn() => $this->organizationalUnit?->name),
            'position' => $this->whenLoaded('position', fn() => $this->position?->name),
            'nik' => $this->nik,
            'nama_lengkap' => $this->nama_lengkap,
            'gelar_depan' => $this->gelar_depan,
            'gelar_belakang' => $this->gelar_belakang,
            'tempat_lahir' => $this->tempat_lahir,
            'agama' => $this->agama,
            'status_pernikahan' => $this->status_pernikahan,
            'alamat_ktp' => $this->alamat_ktp,
            'alamat_domisili' => $this->alamat_domisili,
            'email' => $this->email,
            'alamat' => $this->alamat,
            'nomor_hp' => $this->nomor_hp,
            'nomor_ktp' => $this->nomor_ktp,
            'nomor_kk' => $this->nomor_kk,
            'bpjs_kesehatan' => $this->bpjs_kesehatan,
            'bpjs_ketenagakerjaan' => $this->bpjs_ketenagakerjaan,
            'npwp' => $this->npwp,
            'nip' => $this->nip,
            'nidn' => $this->nidn,
            'jenis_kelamin' => $this->jenis_kelamin,
            'tanggal_lahir' => $this->tanggal_lahir?->format('Y-m-d'),
            'tanggal_masuk_kerja' => $this->tanggal_masuk_kerja?->format('Y-m-d'),
            'status_kepegawaian' => $this->status_kepegawaian,
            'jenis_pegawai' => $this->jenis_pegawai,
            'nomor_rekening' => $this->nomor_rekening,
            'foto_path' => $this->foto_path,
            'has_account' => $this->whenLoaded('user', fn() => $this->user !== null),
            'account' => $this->whenLoaded('user', fn() => $this->user ? [
                'id' => $this->user->id,
                'role' => $this->user->roles->first()?->code,
                'role_name' => $this->user->roles->first()?->name,
            ] : null),
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
        ];
    }
}