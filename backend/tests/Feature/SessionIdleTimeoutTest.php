<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SessionIdleTimeoutTest extends TestCase
{
    use RefreshDatabase;

    private function tokenWithIdle(int $minutesIdle): string
    {
        $user = User::create([
            'nik' => '1234567890123456', 'name' => 'Tester',
            'email' => 't@example.com', 'password' => 'password',
        ]);
        $token = $user->createToken('t', [], now()->addDays(30)); // RememberMe: expires_at masih jauh
        $token->accessToken->forceFill(['last_used_at' => now()->subMinutes($minutesIdle)])->save();

        return $token->plainTextToken;
    }

    public function test_token_mati_setelah_60_menit_tanpa_aktivitas(): void
    {
        $plain = $this->tokenWithIdle(61);
        $this->withToken($plain)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_token_hidup_bila_aktif_dalam_60_menit(): void
    {
        $plain = $this->tokenWithIdle(59);
        $this->withToken($plain)->getJson('/api/user')->assertOk();
    }
}
