<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

class AuthController extends Controller
{
    public function logout(Request $request)
    {
        $user = $request->user();
        if (!$user) return response()->json(['ok' => true]);

        // Attempt to revoke GitHub access token if available
        $tokenEnc = $user->github_access_token ?? null;
        if ($tokenEnc) {
            try {
                $ghAccess = Crypt::decryptString($tokenEnc);
                $clientId = config('services.github.client_id');
                $clientSecret = config('services.github.client_secret');
                if ($clientId && $clientSecret && $ghAccess) {
                    $basic = base64_encode($clientId.':'.$clientSecret);
                    @Http::withHeaders([
                        'Accept' => 'application/vnd.github+json',
                        'Authorization' => 'Basic '.$basic,
                    ])->delete('https://api.github.com/applications/'.$clientId.'/grants/'.$ghAccess);
                }
            } catch (\Throwable $e) {
                // ignore
            }
        } else {
            // Fallback: read encrypted token from storage by github_id
            try {
                $gid = (string)($user->github_id ?? '');
                if ($gid !== '') {
                    $path = storage_path('app/oauth.json');
                    if (is_file($path)) {
                        $map = json_decode(file_get_contents($path), true) ?: [];
                        $enc = $map[$gid] ?? null;
                        if ($enc) {
                            $ghAccess = Crypt::decryptString($enc);
                            $clientId = config('services.github.client_id');
                            $clientSecret = config('services.github.client_secret');
                            if ($clientId && $clientSecret && $ghAccess) {
                                $basic = base64_encode($clientId.':'.$clientSecret);
                                @Http::withHeaders([
                                    'Accept' => 'application/vnd.github+json',
                                    'Authorization' => 'Basic '.$basic,
                                ])->delete('https://api.github.com/applications/'.$clientId.'/grants/'.$ghAccess);
                            }
                        }
                        // Remove fallback token entry
                        unset($map[$gid]);
                        file_put_contents($path, json_encode($map, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
                    }
                }
            } catch (\Throwable $e) { /* ignore */ }
        }

        // Invalidate API token and GitHub token server-side
        if (Schema::hasTable('users')) {
            DB::table('users')->where('id', $user->id ?? $user->user_id ?? null)
                ->update([
                    'api_token' => null,
                    'github_access_token' => null,
                    'updated_at' => now(),
                ]);
        }

        // Invalidate server session (Socialite state etc.)
        try { $request->session()->invalidate(); $request->session()->regenerateToken(); } catch (\Throwable $e) {}

        return response()->json(['ok' => true]);
    }
}
