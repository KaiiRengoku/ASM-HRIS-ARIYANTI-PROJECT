<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        foreach ($permissions as $permission) {
            if (!$user || !$user->hasPermission($permission)) {
                return response()->json(['success' => false, 'message' => 'Forbidden.'], 403);
            }
        }

        return $next($request);
    }
}
