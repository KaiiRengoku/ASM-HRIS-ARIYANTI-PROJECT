<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Holiday;
use App\Models\Notification;
use App\Models\Role;
use App\Models\TeachingAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PegawaiDashboardTest extends TestCase
{
    use RefreshDatabase;

    private function buatUser(string $nik, string $roleCode, string $jenisPegawai = 'Staf'): User
    {
        $positionId = null;
        if ($jenisPegawai === 'Dosen') {
            $positionId = \App\Models\Position::where('code', 'DOSEN')->first()?->id
                ?? \App\Models\Position::create(['name' => 'Dosen', 'code' => 'DOSEN', 'is_active' => true])->id;
        }
        $employee = Employee::create([
            'nik' => $nik,
            'nama_lengkap' => 'User ' . $nik,
            'email' => 'user' . $nik . '@example.com',
            'position_id' => $positionId,
            'is_dosen' => $jenisPegawai === 'Dosen',
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
        $role = Role::firstOrCreate(['code' => $roleCode], ['name' => $roleCode]);
        $user->roles()->attach($role->id);

        return $user;
    }

    public function test_pegawai_melihat_notifikasi_dan_total_cuti(): void
    {
        $peg = $this->buatUser('1234567890123456', 'PEG');

        Notification::create([
            'id' => (string) Str::uuid(),
            'user_id' => $peg->id,
            'type' => 'leave_status',
            'title' => 'Sudah dibaca',
            'message' => 'x',
            'read_at' => now(),
        ]);
        Notification::create([
            'id' => (string) Str::uuid(),
            'user_id' => $peg->id,
            'type' => 'leave_status',
            'title' => 'Belum dibaca',
            'message' => 'y',
        ]);

        $type = \App\Models\LeaveType::create([
            'name' => 'Tahunan', 'code' => 'ANNUAL', 'is_leave_balance_deducted' => false,
        ]);
        \App\Models\LeaveRequest::create([
            'employee_id' => $peg->employee_id,
            'leave_type_id' => $type->id,
            'start_date' => now()->addWeek()->toDateString(),
            'end_date' => now()->addWeek()->addDays(2)->toDateString(),
            'total_days' => 3,
            'status' => 'Disetujui HRD',
            'submitted_at' => now(),
            'created_by' => $peg->id,
        ]);

        Holiday::create([
            'date' => now()->addDays(10)->toDateString(),
            'name' => 'Libur Uji',
            'holiday_type' => 'NATIONAL',
            'is_active' => true,
            'created_by' => $peg->id,
        ]);

        $data = $this->actingAs($peg)->getJson('/api/dashboard/stats')->assertOk()->json('data');

        $this->assertSame(1, $data['unread_notifications']);
        $this->assertEquals(3, $data['total_cuti']);
        $this->assertFalse($data['is_dosen']);
        $this->assertSame($peg->employee_id, $data['employee_id']);
        $this->assertCount(1, $data['libur_terdekat']);
        $this->assertSame('Libur Uji', $data['libur_terdekat'][0]['name']);
    }

    public function test_dosen_melihat_beban_mengajar_dan_penelitian(): void
    {
        $dosen = $this->buatUser('1234567890123456', 'PEG', 'Dosen');

        TeachingAssignment::create([
            'employee_id' => $dosen->employee_id,
            'kode_matkul' => 'IF101',
            'nama_matkul' => 'Algoritma',
            'sks' => 3,
            'kelas' => 'A',
        ]);
        TeachingAssignment::create([
            'employee_id' => $dosen->employee_id,
            'kode_matkul' => 'IF102',
            'nama_matkul' => 'Basis Data',
            'sks' => 2,
            'kelas' => 'B',
        ]);
        \App\Models\EmployeeFunctional::create([
            'employee_id' => $dosen->employee_id,
            'riwayat_penelitian_pengabdian' => 'Penelitian A',
        ]);

        $data = $this->actingAs($dosen)->getJson('/api/dashboard/stats')->assertOk()->json('data');

        $this->assertTrue($data['is_dosen']);
        $this->assertEquals(5, $data['mengajar']['total_sks']);
        $this->assertCount(2, $data['mengajar']['matkul']);
        $this->assertTrue($data['penelitian']['terisi']);
    }

    public function test_user_tanpa_employee_dapat_404(): void
    {
        $user = User::create([
            'nik' => '1234567890123456',
            'name' => 'Tanpa Pegawai',
            'email' => 'tanpa@example.com',
            'password' => 'password',
        ]);
        $role = Role::firstOrCreate(['code' => 'PEG'], ['name' => 'PEG']);
        $user->roles()->attach($role->id);

        $this->actingAs($user)->getJson('/api/dashboard/stats')->assertNotFound();
    }
}
