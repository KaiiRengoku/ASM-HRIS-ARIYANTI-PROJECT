<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    // Memuat definisi channel (rules). Ini juga mendaftarkan route bawaan
    // /api/broadcasting/auth tanpa autentikasi; route kita sendiri di
    // routes/api.php didaftarkan lebih dulu dan dilindungi auth:sanctum,
    // sehingga dialah yang dipakai.
    ->withBroadcasting(__DIR__.'/../routes/channels.php', ['prefix' => 'api'])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
            'permission' => \App\Http\Middleware\PermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
