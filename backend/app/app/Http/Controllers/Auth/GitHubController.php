<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

class GitHubController extends Controller
{
    public function redirect(): RedirectResponse
    {
        $driver = Socialite::driver('github')
            ->scopes(['read:user', 'user:email', 'repo']);
        // When force=1 is present, ask GitHub to re-prompt for login/consent
        if (request()->boolean('force')) {
            $driver = $driver->with(['prompt' => 'login']);
        }
        return $driver->redirect();
    }

    public function callback(): RedirectResponse
    {
        try {
            $gitUser = Socialite::driver('github')->user();
        } catch (\Throwable $e) {
            Log::error('GitHub OAuth error', ['error' => $e->getMessage()]);
            return redirect('http://localhost:5173/#/login?error=oauth_failed');
        }

        // Resolve email (may be null if scope missing)
        $email = $gitUser->getEmail();
        if (!$email) {
            // Fallback email based on GitHub ID to satisfy unique constraint
            $email = sprintf('github_%s@example.local', $gitUser->getId());
        }

        $githubId = (string) $gitUser->getId();

        // Fetch columns once
        $cols = Schema::getColumnListing('users');
        $has = fn(string $c) => in_array($c, $cols, true);

        $nameCandidate = $gitUser->getName() ?: ($gitUser->getNickname() ?: 'GitHub User');
        $nicknameCandidate = $gitUser->getNickname() ?: ('github_'.$githubId);
        $emailCandidate = $email ?: sprintf('github_%s@users.noreply.local', $githubId);
        $avatarCandidate = method_exists($gitUser, 'getAvatar') ? $gitUser->getAvatar() : null;

        // Build insert/update payloads using existing columns only
        $baseData = ['github_id' => $githubId];
        if ($has('name')) $baseData['name'] = $nameCandidate;
        if ($has('display_name')) $baseData['display_name'] = $nameCandidate;
        if ($has('username')) $baseData['username'] = $nicknameCandidate;
        if ($has('email')) $baseData['email'] = $emailCandidate;
        if ($has('password')) $baseData['password'] = Str::random(24);
        if ($has('avatar') && $avatarCandidate) $baseData['avatar'] = $avatarCandidate;
        if ($has('created_at')) $baseData['created_at'] = now();
        if ($has('updated_at')) $baseData['updated_at'] = now();

        // Issue or rotate API token
        $token = Str::random(60);
        $tokenHashed = hash('sha256', $token);
        $updateData = ['github_id' => $githubId, 'api_token' => $tokenHashed];
        // Persist GitHub access token if column exists
        $ghAccess = $gitUser->token ?? null;
        if ($has('github_access_token') && $ghAccess) {
            $updateData['github_access_token'] = Crypt::encryptString($ghAccess);
        }
        if ($has('updated_at')) $updateData['updated_at'] = now();

        // Upsert by github_id without relying on primary key
        $exists = DB::table('users')->where('github_id', $githubId)->exists();
        if ($exists) {
            DB::table('users')->where('github_id', $githubId)->update($updateData);
        } else {
            DB::table('users')->insert(array_merge($baseData, $updateData));
        }

        // Fallback store for GitHub access token when DB column is missing
        if (!$has('github_access_token') && ($gitUser->token ?? null)) {
            try {
                $path = storage_path('app/oauth.json');
                $json = is_file($path) ? (json_decode(file_get_contents($path), true) ?: []) : [];
                $json[(string)$githubId] = Crypt::encryptString($gitUser->token);
                if (!is_dir(dirname($path))) @mkdir(dirname($path), 0777, true);
                file_put_contents($path, json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            } catch (\Throwable $e) { /* ignore */ }
        }

        // Redirect back to frontend with token in hash (not sent to server logs)
        $url = sprintf('http://localhost:5173/#/project?token=%s', $token);
        return redirect()->away($url);
    }
}
