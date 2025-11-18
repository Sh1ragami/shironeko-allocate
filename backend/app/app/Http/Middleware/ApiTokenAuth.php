<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiTokenAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $this->extractToken($request);
        if ($token) {
            $hashed = hash('sha256', $token);
            $user = User::where('api_token', $hashed)->first();
            if ($user) {
                // Attach user to request for downstream use
                $request->setUserResolver(fn () => $user);
                return $next($request);
            }
        }

        return response()->json(['message' => 'Unauthorized'], 401);
    }

    private function extractToken(Request $request): ?string
    {
        $auth = $request->header('Authorization');
        if (is_string($auth) && str_starts_with($auth, 'Bearer ')) {
            return substr($auth, 7);
        }

        $cookie = $request->cookie('api_token');
        if ($cookie) return $cookie;

        $token = $request->query('token');
        return is_string($token) ? $token : null;
    }
}

