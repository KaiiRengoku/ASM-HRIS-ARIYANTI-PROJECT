<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ProfileFormalFieldsTest extends TestCase
{
    public function test_new_formal_employee_columns_exist(): void
    {
        $columns = Schema::getColumnListing('employees');

        $this->assertContains('gelar_depan', $columns);
        $this->assertContains('gelar_belakang', $columns);
        $this->assertContains('tempat_lahir', $columns);
        $this->assertContains('agama', $columns);
        $this->assertContains('status_pernikahan', $columns);
        $this->assertContains('alamat_ktp', $columns);
        $this->assertContains('alamat_domisili', $columns);
    }
}
