<?php

use Illuminate\Support\Facades\Broadcast;

// Guard default aplikasi adalah "web" (session), sedangkan klien mengirim
// Bearer token Sanctum. Tanpa opsi guards, $request->user() mengembalikan
// null sehingga semua channel ditolak 403.
$guard = ['guards' => ['sanctum']];

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
}, $guard);

Broadcast::channel('leave-requests.{employeeId}', function ($user, $employeeId) {
    return $user->employee_id !== null && (int) $user->employee_id === (int) $employeeId;
}, $guard);

Broadcast::channel('approvals.{approverId}', function ($user, $approverId) {
    return (int) $user->id === (int) $approverId;
}, $guard);

Broadcast::channel('notifications.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
}, $guard);