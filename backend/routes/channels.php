<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('leave-requests.{employeeId}', function ($user, $employeeId) {
    return $user->employee_id !== null && (int) $user->employee_id === (int) $employeeId;
});

Broadcast::channel('approvals.{approverId}', function ($user, $approverId) {
    return (int) $user->id === (int) $approverId;
});

Broadcast::channel('notifications.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});