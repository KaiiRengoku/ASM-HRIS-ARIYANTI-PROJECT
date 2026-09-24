<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DirectorDocumentAccessTest extends TestCase
{
    use RefreshDatabase;

    private function buatUser(string $nik, string $roleCode): User
    {
        $employee = Employee::create([
            'nik' => $nik, 'nama_lengkap' => 'U' . $nik,
            'email' => 'u' . $nik . '@example.com', 'tanggal_masuk_kerja' => '2020-01-15',
        ]);
        $user = User::create([
            'nik' => $nik, 'name' => 'U' . $nik, 'email' => 'u' . $nik . '@example.com',
            'password' => 'password', 'employee_id' => $employee->id,
        ]);
        $user->roles()->attach(Role::firstOrCreate(['code' => $roleCode], ['name' => $roleCode])->id);

        return $user;
    }

    public function test_direktur_bisa_lihat_dan_unduh_dokumen_pegawai_lain_tapi_tidak_hapus(): void
    {
        $direktur = $this->buatUser('1234567890123456', 'DIREKTUR');
        $staf = $this->buatUser('1234567890123457', 'PEG');
        $doc = EmployeeDocument::create([
            'employee_id' => $staf->employee_id, 'document_type' => 'Ijazah',
            'file_name' => 'ijazah.pdf', 'storage_disk' => 'public',
            'storage_path' => 'documents/ijazah.pdf', 'mime_type' => 'application/pdf',
            'file_size' => 100, 'uploaded_by' => $staf->id,
        ]);

        $res = $this->actingAs($direktur)->getJson('/api/documents');
        $res->assertOk()->assertJsonFragment(['id' => $doc->id]);
        $this->actingAs($direktur)->getJson("/api/documents/{$doc->id}")->assertOk();
        $this->actingAs($direktur)->deleteJson("/api/documents/{$doc->id}")->assertForbidden();
    }

    public function test_pegawai_masih_dibatasi_ke_dokumen_sendiri(): void
    {
        $peg = $this->buatUser('1234567890123456', 'PEG');
        $lain = $this->buatUser('1234567890123457', 'PEG');
        $doc = EmployeeDocument::create([
            'employee_id' => $lain->employee_id, 'document_type' => 'KTP',
            'file_name' => 'ktp.pdf', 'storage_disk' => 'public',
            'storage_path' => 'documents/ktp.pdf', 'mime_type' => 'application/pdf',
            'file_size' => 100, 'uploaded_by' => $lain->id,
        ]);

        $res = $this->actingAs($peg)->getJson('/api/documents');
        $res->assertOk();
        $this->assertEmpty(array_column($res->json('data'), 'id'));
        $this->actingAs($peg)->getJson("/api/documents/{$doc->id}")->assertForbidden();
    }
}
