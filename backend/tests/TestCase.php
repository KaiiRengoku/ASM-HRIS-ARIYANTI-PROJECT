<?php

namespace Tests;

use Database\Seeders\PermissionSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Schema;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (Schema::hasTable('roles') && \App\Models\Role::count() === 0) {
            $this->seed([RoleSeeder::class, PermissionSeeder::class, RolePermissionSeeder::class]);
        }
    }
}