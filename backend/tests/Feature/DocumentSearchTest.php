<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DocumentSearchTest extends TestCase
{
    use RefreshDatabase;

    private function buatUser(string $nik, ?string $roleCode = null): User
    {
        $employee = Employee::create([
            'nik' => $nik,
            'nama_lengkap' => 'User ' . $nik,
            'email' => 'user' . $nik . '@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);
        $user = User::create([
            'nik' => $nik,
            'name' => 'User ' . $nik,
            'email' => 'user' . $nik . '@example.com',
            'password' => 'password',
        ]);
        $user->employee_id = $employee->id;
        $user->save();
        if ($roleCode) {
            $role = Role::firstOrCreate(['code' => $roleCode], ['name' => $roleCode]);
            $user->roles()->attach($role->id);
        }

        return $user;
    }

    public function test_search_nip_menemukan_dokumen(): void
    {
        $hrd = $this->buatUser('1111111111111111', 'HRD');
        $peg = Employee::create([
            'nik' => '2222222222222222',
            'nama_lengkap' => 'Dosen Target',
            'email' => 'target@example.com',
            'tanggal_masuk_kerja' => '2021-01-01',
            'nip' => '987654321',
        ]);
        $doc = EmployeeDocument::create([
            'employee_id' => $peg->id,
            'document_type' => 'Ijazah',
            'file_name' => 'ijazah.pdf',
            'storage_disk' => 'public',
            'storage_path' => 'documents/ijazah.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 100,
            'uploaded_by' => $hrd->id,
        ]);

        $this->actingAs($hrd)->getJson('/api/documents?search=987654321')->assertOk()->assertJsonPath('meta.total', 1)->assertJsonFragment(['id' => $doc->id]);
    }

    public function test_search_nidn_menemukan_dokumen(): void
    {
        $hrd = $this->buatUser('1111111111111111', 'HRD');
        $peg = Employee::create([
            'nik' => '2222222222222222',
            'nama_lengkap' => 'Dosen Target',
            'email' => 'target@example.com',
            'tanggal_masuk_kerja' => '2021-01-01',
            'nidn' => '0123456789',
        ]);
        $doc = EmployeeDocument::create([
            'employee_id' => $peg->id,
            'document_type' => 'KTP',
            'file_name' => 'ktp.pdf',
            'storage_disk' => 'public',
            'storage_path' => 'documents/ktp.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 100,
            'uploaded_by' => $hrd->id,
        ]);

        $this->actingAs($hrd)->getJson('/api/documents?search=0123456789')->assertOk()->assertJsonPath('meta.total', 1)->assertJsonFragment(['id' => $doc->id]);
    }

    public function test_search_lama_tetap_berfungsi(): void
    {
        $hrd = $this->buatUser('1234567890123456', 'HRD');
        $peg = Employee::create([
            'nik' => '9999888877776666',
            'nama_lengkap' => 'Nama Unik Xyz',
            'email' => 'unik@example.com',
            'tanggal_masuk_kerja' => '2021-01-01',
        ]);
        $doc = EmployeeDocument::create([
            'employee_id' => $peg->id,
            'document_type' => 'KK',
            'file_name' => 'kk.pdf',
            'storage_disk' => 'public',
            'storage_path' => 'documents/kk.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 100,
            'uploaded_by' => $hrd->id,
        ]);

        $this->actingAs($hrd)->getJson('/api/documents?search=Unik Xyz')->assertOk()->assertJsonFragment(['id' => $doc->id]);
        $this->actingAs($hrd)->getJson('/api/documents?search=9999888877776666')->assertOk()->assertJsonFragment(['id' => $doc->id]);
    }
}
