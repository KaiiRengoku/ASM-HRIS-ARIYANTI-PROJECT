<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $limit = min((int) $request->query('limit', 5), 20);
        $notifications = Notification::where('user_id', $request->user()->id)
            ->latest()
            ->limit($limit)
            ->get();
        $unread = Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->count();

        return response()->json(['success' => true, 'data' => $notifications, 'unread_count' => $unread]);
    }

    public function markAllAsRead(Request $request)
    {
        Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
        return response()->json(['success' => true]);
    }

    public function markAsRead(Request $request, Notification $notification)
    {
        // auth()->id() mengembalikan NIK (User::getAuthIdentifierName), bukan PK,
        // sehingga perbandingan selalu gagal. Pakai PK user dari request.
        if ((int) $notification->user_id !== (int) $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }
        $notification->update(['read_at' => now()]);
        return response()->json(['success' => true]);
    }
}