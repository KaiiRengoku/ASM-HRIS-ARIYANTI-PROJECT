<?php

use Illuminate\Foundation\Application;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;

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
        // Untuk permintaan API, jangan pernah mengarahkan tamu ke route 'login'
        // (route itu tidak ada) — kembalikan null agar middleware melempar
        // AuthenticationException yang ditangani sebagai JSON 401 di bawah.
        $middleware->redirectGuestsTo(function (Request $request) {
            return $request->is('api/*') || $request->expectsJson() ? null : '/login';
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Permintaan API yang tidak terautentikasi harus menerima JSON 401,
        // bukan redirect ke route [login] (yang tidak ada) sehingga berujung HTML/500.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
            return null;
        });
    })->create();
