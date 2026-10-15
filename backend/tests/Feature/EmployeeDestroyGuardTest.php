<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
 * Setelah migration harden (restrictOnDelete pada cuti/saldo/dokumen), menghapus
 * pegawai ber-riwayat harus ditolak dengan pesan ramah (422), bukan 500.
 */
class EmployeeDestroyGuardTest extends TestCase
{
    use RefreshDatabase;

    private User $hrdUser;

    protected function setUp(): void
    {
        parent::setUp();

        $hrdEmp = Employee::create([
            'nik' => '1234567890123457',
            'nama_lengkap' => 'HRD Contoh',
            'email' => 'hrd@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);
        $this->hrdUser = User::create([
            'nik' => '1234567890123457',
            'name' => 'HRD',
            'email' => 'hrd@example.com',
            'password' => 'password',
            'employee_id' => $hrdEmp->id,
        ]);
        $this->hrdUser->roles()->attach(Role::firstOrCreate(['code' => 'HRD'], ['name' => 'HRD'])->id);
    }

    public function test_hapus_pegawai_tanpa_riwayat_tetap_berhasil(): void
    {
        $target = Employee::create([
            'nik' => '1234567890123456',
            'nama_lengkap' => 'Pegawai Baru',
            'email' => 'baru@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);

        $this->actingAs($this->hrdUser)->deleteJson("/api/employees/{$target->id}")
            ->assertOk()->assertJsonPath('success', true);

        $this->assertDatabaseMissing('employees', ['id' => $target->id]);
    }

    public function test_hapus_pegawai_ber_riwayat_cuti_ditolak_422(): void
    {
        $target = Employee::create([
            'nik' => '1234567890123456',
            'nama_lengkap' => 'Pegawai Beriwayat',
            'email' => 'riwayat@example.com',
            'tanggal_masuk_kerja' => '2020-01-15',
        ]);
        $type = LeaveType::create([
            'code' => 'ANNUAL',
            'name' => 'Cuti Tahunan',
            'is_leave_balance_deducted' => true,
            'requires_attachment' => false,
            'requires_medical_certificate' => false,
            'is_active' => true,
        ]);
        LeaveRequest::create([
            'employee_id' => $target->id,
            'leave_type_id' => $type->id,
            'start_date' => now()->addWeek()->toDateString(),
            'end_date' => now()->addWeek()->toDateString(),
            'total_days' => 1,
            'status' => 'Pending',
            'submitted_at' => now(),
            'created_by' => $this->hrdUser->id,
        ]);

        $this->actingAs($this->hrdUser)->deleteJson("/api/employees/{$target->id}")
            ->assertStatus(422)->assertJsonPath('success', false);

        $this->assertDatabaseHas('employees', ['id' => $target->id]);
    }
}
