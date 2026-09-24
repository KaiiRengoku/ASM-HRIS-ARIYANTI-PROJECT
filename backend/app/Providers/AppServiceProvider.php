<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        ResetPassword::createUrlUsing(function ($user, string $token) {
            return config('app.frontend_url') . '/reset-password?token=' . $token . '&email=' . urlencode($user->email);
        });

        // Kebutuhan §2.1: sesi mati setelah 60 menit tidak aktif (server-side, sliding).
        Sanctum::$accessTokenAuthenticationCallback = function ($token, bool $isValid) {
            if (!$isValid) {
                return false;
            }
            $idleSince = $token->last_used_at ?? $token->created_at;
            return $idleSince->gt(now()->subMinutes(60));
        };
    }
}
