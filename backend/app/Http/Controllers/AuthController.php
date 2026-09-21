<?php

namespace App\Http\Controllers;

use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Password;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $credentials = $request->only('nik', 'password');

        if (!Auth::attempt($credentials, $request->boolean('remember'))) {
            return response()->json([
                'success' => false,
                'message' => 'NIK atau kata sandi salah.',
            ], 401);
        }

        $user = User::with('roles')->where('nik', $request->nik)->first();

        if (!$user) {
            Auth::logout();
            return response()->json([
                'success' => false,
                'message' => 'Pengguna tidak ditemukan.',
            ], 404);
        }

        $token = $user->createToken('asm-hris-token', [], $request->boolean('remember') ? now()->addDays(30) : now()->addMinutes(60))->plainTextToken;

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'LOGIN',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'nik' => $user->nik,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->roles->pluck('code')->toArray(),
                    'permissions' => $user->permissionCodes(),
                ],
                'token' => $token,
            ],
            'message' => 'Login berhasil.',
        ]);
    }

public function forgotPassword(ForgotPasswordRequest $request)
{
    $user = User::where('nik', $request->nik)->first();

    if (!$user || !$user->email) {
        return response()->json([
            'success' => true,
            'message' => 'Jika NIK terdaftar, link reset sudah dikirim ke email Anda. Cek inbox atau spam.',
        ]);
    }

    $status = Password::sendResetLink(['email' => $user->email]);

    if ($status !== Password::RESET_LINK_SENT) {
        return response()->json([
            'success' => false,
            'message' => 'Gagal mengirim link reset. Coba lagi nanti.',
        ], 400);
    }

    $masked = substr($user->email, 0, 1) . str_repeat('*', max(0, strpos($user->email, '@') - 2)) . substr($user->email, strpos($user->email, '@'));

    return response()->json([
        'success' => true,
        'message' => "Link reset sudah dikirim ke {$masked}. Cek inbox atau spam.",
    ]);
}

    public function resetPassword(ResetPasswordRequest $request)
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => bcrypt($password),
                ])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal reset password. Token mungkin kadaluarsa atau email tidak valid.',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil direset. Silakan login.',
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'LOGOUT',
            'auditable_type' => User::class,
            'auditable_id' => $user->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.',
        ]);
    }

    public function user(Request $request)
    {
        $user = $request->user()->load('roles');

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'nik' => $user->nik,
                    'name' => $user->name,
                    'email' => $user->email,
                    'roles' => $user->roles->pluck('code')->toArray(),
                    'permissions' => $user->permissionCodes(),
                ],
            ],
        ]);
    }
}