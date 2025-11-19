<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Crypt;

class GitHubProxyController extends Controller
{
    public function profile(Request $request)
    {
        $user = $request->user();
        $githubId = $user?->github_id;
        if (!$githubId) {
            return response()->json(['message' => 'GitHub not linked'], 400);
        }
        $headers = ['User-Agent' => 'shironeko-allocate'];
        $tokenEnc = $user?->github_access_token;
        if ($tokenEnc) {
            try { $headers['Authorization'] = 'Bearer '.Crypt::decryptString($tokenEnc); } catch (\Throwable $e) {}
        }
        $res = Http::withHeaders($headers)
            ->get("https://api.github.com/user/{$githubId}");
        if (!$res->ok()) {
            return response()->json(['message' => 'Failed to fetch profile'], 502);
        }
        $data = $res->json();
        return response()->json([
            'id' => $data['id'] ?? null,
            'login' => $data['login'] ?? null,
            'avatar_url' => $data['avatar_url'] ?? null,
        ]);
    }

    public function repos(Request $request)
    {
        // Get profile first to resolve login
        $profile = $this->profile($request);
        if ($profile->getStatusCode() !== 200) return $profile;
        $login = $profile->getData(true)['login'] ?? null;
        if (!$login) return response()->json(['message' => 'Missing login'], 400);

        $headers = ['User-Agent' => 'shironeko-allocate'];
        $tokenEnc = $request->user()?->github_access_token;
        if ($tokenEnc) {
            try { $headers['Authorization'] = 'Bearer '.Crypt::decryptString($tokenEnc); } catch (\Throwable $e) {}
        }
        $res = Http::withHeaders($headers)
            ->get("https://api.github.com/users/{$login}/repos", [
                'per_page' => 100,
                'sort' => 'updated',
            ]);
        if (!$res->ok()) {
            return response()->json(['message' => 'Failed to fetch repos'], 502);
        }
        return response()->json($res->json());
    }

    public function repo(Request $request)
    {
        $full = (string) $request->query('full_name');
        if (!$full) return response()->json(['message' => 'full_name required'], 422);
        $headers = ['User-Agent' => 'shironeko-allocate'];
        $tokenEnc = $request->user()?->github_access_token;
        if ($tokenEnc) { try { $headers['Authorization'] = 'Bearer '.Crypt::decryptString($tokenEnc); } catch (\Throwable $e) {} }
        $res = Http::withHeaders($headers)
            ->get("https://api.github.com/repos/{$full}");
        if (!$res->ok()) return response()->json(['message' => 'Failed to fetch repo'], 502);
        return response()->json($res->json());
    }

    public function contributors(Request $request)
    {
        $full = (string) $request->query('full_name');
        if (!$full) return response()->json(['message' => 'full_name required'], 422);
        $headers = ['User-Agent' => 'shironeko-allocate'];
        $tokenEnc = $request->user()?->github_access_token;
        if ($tokenEnc) { try { $headers['Authorization'] = 'Bearer '.Crypt::decryptString($tokenEnc); } catch (\Throwable $e) {} }
        $res = Http::withHeaders($headers)
            ->get("https://api.github.com/repos/{$full}/contributors", ['per_page' => 30]);
        if (!$res->ok()) return response()->json(['message' => 'Failed to fetch contributors'], 502);
        return response()->json($res->json());
    }

    public function readme(Request $request)
    {
        $full = (string) $request->query('full_name');
        $ref = (string) $request->query('ref', '');
        if (!$full) return response()->json(['message' => 'full_name required'], 422);
        $url = "https://api.github.com/repos/{$full}/readme";
        $params = $ref ? ['ref' => $ref] : [];
        $headers = [
            'User-Agent' => 'shironeko-allocate',
            'Accept' => 'application/vnd.github.raw',
        ];
        $tokenEnc = $request->user()?->github_access_token;
        if ($tokenEnc) { try { $headers['Authorization'] = 'Bearer '.Crypt::decryptString($tokenEnc); } catch (\Throwable $e) {} }
        $res = Http::withHeaders($headers)->get($url, $params);
        if (!$res->ok()) return response()->json(['message' => 'Failed to fetch readme'], 502);
        return response($res->body(), 200, ['Content-Type' => 'text/plain; charset=utf-8']);
    }

    public function searchUsers(Request $request)
    {
        $q = (string) $request->query('query', '');
        if ($q === '') return response()->json(['items' => []]);
        $headers = ['User-Agent' => 'shironeko-allocate'];
        $tokenEnc = $request->user()?->github_access_token;
        if ($tokenEnc) { try { $headers['Authorization'] = 'Bearer '.Crypt::decryptString($tokenEnc); } catch (\Throwable $e) {} }
        $res = Http::withHeaders($headers)->get('https://api.github.com/search/users', ['q' => $q, 'per_page' => 10]);
        if (!$res->ok()) return response()->json(['items' => []]);
        return response()->json($res->json());
    }
}
