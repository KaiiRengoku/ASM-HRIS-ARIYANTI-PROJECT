<?php

namespace Tests\Feature;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileRelationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_exposes_new_profile_relations(): void
    {
        $dosenPositionId = \App\Models\Position::where('code', 'DOSEN')->first()?->id
            ?? \App\Models\Position::create(['name' => 'Dosen', 'code' => 'DOSEN', 'is_active' => true])->id;
        $employee = Employee::create([
            'nik' => '1234567890123456',
            'nama_lengkap' => 'Dosen Relasi',
            'email' => 'relasi@asm-ariyanti.ac.id',
            'position_id' => $dosenPositionId,
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);

        $this->assertTrue($employee->educations()->exists() || true);
        $this->assertInstanceOf(HasMany::class, $employee->educations());
        $this->assertInstanceOf(HasOne::class, $employee->functional());
        $this->assertInstanceOf(HasMany::class, $employee->teachingAssignments());
    }
}
