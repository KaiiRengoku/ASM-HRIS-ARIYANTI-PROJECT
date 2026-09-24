<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentFotoTypeTest extends TestCase
{
    use RefreshDatabase;

    public function test_upload_dokumen_tipe_foto_lolos(): void
    {
        Storage::fake('public');
        $employee = Employee::create([
            'nik' => '1234567890123456',
            'nama_lengkap' => 'Target',
            'email' => 'target@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);
        $user = User::create([
            'nik' => '1234567890123457',
            'name' => 'HRD',
            'email' => 'hrd@example.com',
            'password' => 'password',
            'employee_id' => $employee->id,
        ]);
        $role = Role::create(['name' => 'HRD', 'code' => 'HRD']);
        $user->roles()->attach($role->id);

        $this->actingAs($user)->postJson('/api/documents', [
            'employee_id' => $employee->id,
            'document_type' => 'Foto',
            'file' => UploadedFile::fake()->image('foto.jpg', 100, 100)->size(100),
        ])->assertOk()->assertJsonPath('success', true);

        $this->assertDatabaseHas('employee_documents', [
            'employee_id' => $employee->id,
            'document_type' => 'Foto',
        ]);
    }
}
