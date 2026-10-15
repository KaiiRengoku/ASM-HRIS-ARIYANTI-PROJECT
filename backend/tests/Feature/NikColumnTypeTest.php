<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Mengunci panjang kolom `nik` = varchar(20) setelah migrasi
 * 2026_10_05_000001_relax_nik_length_to_20.
 */
class NikColumnTypeTest extends TestCase
{
    use RefreshDatabase;

    private function columnType(string $table): ?string
    {
        $row = DB::selectOne(
            'SELECT COLUMN_TYPE ct FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [$table, 'nik']
        );

        return $row?->ct;
    }

    public function test_users_nik_varchar_20(): void
    {
        $this->assertSame('varchar(20)', $this->columnType('users'));
    }

    public function test_employees_nik_varchar_20(): void
    {
        $this->assertSame('varchar(20)', $this->columnType('employees'));
    }

    public function test_nomor_ktp_tetap_tidak_disentuh(): void
    {
        // KTP punya kolom sendiri (string 20); pastikan tidak ikut berubah.
        $row = DB::selectOne(
            "SELECT COLUMN_TYPE ct FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'nomor_ktp'"
        );
        $this->assertSame('varchar(20)', $row->ct);
    }
}
