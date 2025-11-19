<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Crypt;

class ProjectController extends Controller
{
    private function filePath(): string
    {
        return storage_path('app/projects.json');
    }

    private function readAll(): array
    {
        $path = $this->filePath();
        if (!is_file($path)) return [];
        $json = file_get_contents($path) ?: '[]';
        return json_decode($json, true) ?: [];
    }

    private function writeAll(array $list): void
    {
        $path = $this->filePath();
        if (!is_dir(dirname($path))) @mkdir(dirname($path), 0777, true);
        file_put_contents($path, json_encode($list, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    public function index(Request $request)
    {
        $uid = $request->user()?->id;
        // When DB table exists, merge DB rows and JSON fallback, dedupe by id
        if (Schema::hasTable('projects')) {
            $rows = Project::query()->where('user_id', $uid)->orderByDesc('id')->get()->toArray();
            $db = array_map(function ($p) {
                $p['start'] = $p['start_date'] ?? null;
                $p['end'] = $p['end_date'] ?? null;
                return $p;
            }, $rows);
            // JSON fallback (legacy or when DB insert failed)
            $json = array_values(array_filter($this->readAll(), function ($p) use ($uid) {
                return (($p['user_id'] ?? null) === $uid);
            }));
            // Merge with preference to DB, dedupe by link_repo or name (normalized)
            $byKey = [];
            $makeKey = function ($p) {
                $link = is_array($p) ? ($p['link_repo'] ?? null) : ($p->link_repo ?? null);
                $name = is_array($p) ? ($p['name'] ?? null) : ($p->name ?? null);
                if (is_string($link) && trim($link) !== '') return 'repo:'.strtolower(trim($link));
                if (is_string($name) && trim($name) !== '') return 'name:'.mb_strtolower(trim($name));
                return 'id:'.(string)(is_array($p) ? ($p['id'] ?? '') : ($p->id ?? ''));
            };
            foreach ($json as $p) { $byKey[$makeKey($p)] = $p; }
            foreach ($db as $p) { $byKey[$makeKey($p)] = $p; }
            $merged = array_values($byKey);
            // Filter out invalid entries
            $merged = array_values(array_filter($merged, function ($p) {
                $name = is_array($p) ? ($p['name'] ?? null) : ($p->name ?? null);
                $id = is_array($p) ? ($p['id'] ?? null) : ($p->id ?? null);
                return is_numeric($id) && (int)$id > 0 && is_string($name) && trim($name) !== '';
            }));
            // Sort by id desc as a simple heuristic
            usort($merged, fn($a, $b) => (int)($b['id'] ?? 0) <=> (int)($a['id'] ?? 0));
            return response()->json($merged);
        }

        // No DB table: return JSON store only
        $result = [];
        foreach ($this->readAll() as $p) {
            if (($p['user_id'] ?? null) !== $uid) continue;
            $result[] = $p;
        }
        $result = array_values(array_filter($result, function ($p) {
            $name = is_array($p) ? ($p['name'] ?? null) : ($p->name ?? null);
            $id = is_array($p) ? ($p['id'] ?? null) : ($p->id ?? null);
            return is_numeric($id) && (int)$id > 0 && is_string($name) && trim($name) !== '';
        }));
        usort($result, fn($a, $b) => (int)($b['id'] ?? 0) <=> (int)($a['id'] ?? 0));
        return response()->json($result);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            // GitHub repo-like naming: ASCII letters, numbers, hyphen/underscore/dot, 1-100 chars
            // When linking an existing repo, name may be omitted (filled from meta)
            'name' => ['nullable', 'string', 'max:100', 'regex:/^[A-Za-z0-9._-]{1,100}$/'],
            'description' => ['nullable', 'string'],
            'visibility' => ['nullable', 'in:public,private'],
            'start' => ['nullable', 'string', 'max:32'],
            'end' => ['nullable', 'string', 'max:32'],
            'skills' => ['nullable', 'array'],
            'linkRepo' => ['nullable', 'string'], // e.g. owner/repo
        ]);

        $repoMeta = null;
        if (!empty($data['linkRepo'])) {
            $repo = $data['linkRepo'];
            // Try to fetch repo meta; include token if available to allow private repos
            $headers = ['User-Agent' => 'shironeko-allocate', 'Accept' => 'application/vnd.github+json'];
            $tokenEnc = $request->user()?->github_access_token;
            if ($tokenEnc) {
                try { $headers['Authorization'] = 'Bearer '.Crypt::decryptString($tokenEnc); } catch (\Throwable $e) {}
            }
            $res = Http::withHeaders($headers)->get("https://api.github.com/repos/{$repo}");
            if ($res->ok()) {
                $repoMeta = $res->json();
                if (empty($data['name'])) $data['name'] = $repoMeta['name'] ?? $repo;
                if (empty($data['description'])) $data['description'] = $repoMeta['description'] ?? null;
            } else {
                // Do not hard-fail: allow registration even if meta fetch failed
                // Ensure we have a name at least (use repo path suffix)
                if (empty($data['name'])) {
                    $parts = explode('/', $repo);
                    $data['name'] = end($parts) ?: $repo;
                }
            }
        } else {
            // No link specified -> create a repository for the user if token available
            $tokenEnc = $user?->github_access_token;
            if ($tokenEnc && !empty($data['name'])) {
                try {
                    $ghToken = Crypt::decryptString($tokenEnc);
                    $headers = [
                        'User-Agent' => 'shironeko-allocate',
                        'Authorization' => 'Bearer '.$ghToken,
                        'Accept' => 'application/vnd.github+json',
                    ];
                    // Create repo
                    $create = Http::withHeaders($headers)->post('https://api.github.com/user/repos', [
                        'name' => $data['name'],
                        'description' => $data['description'] ?? '',
                        'private' => ($data['visibility'] ?? 'public') === 'private',
                        'auto_init' => true,
                    ]);
                    if ($create->ok()) {
                        $repoMeta = $create->json();
                        $fullName = $repoMeta['full_name'] ?? null;
                        if ($fullName) {
                            // craft README content
                            $readme = $this->readmeTemplate($data['name'], $data['description'] ?? '');
                            // get existing README to obtain sha (safe to try)
                            $get = Http::withHeaders($headers)->get("https://api.github.com/repos/{$fullName}/contents/README.md");
                            $sha = $get->ok() ? ($get->json()['sha'] ?? null) : null;
                            Http::withHeaders($headers)->put("https://api.github.com/repos/{$fullName}/contents/README.md", [
                                'message' => 'chore: initialize README',
                                'content' => base64_encode($readme),
                                'sha' => $sha,
                                'branch' => $repoMeta['default_branch'] ?? null,
                            ]);
                            $data['linkRepo'] = $fullName;
                        }
                    }
                } catch (\Throwable $e) {
                    // ignore token errors; continue without repo
                }
            }
        }

        if (empty($data['name'])) {
            return response()->json(['message' => 'Project name is required'], 422);
        }

        // Prefer DB if available; on failure gracefully fall back to JSON store
        if (Schema::hasTable('projects')) {
            try {
                $project = new Project();
                $project->user_id = $user?->id;
                $project->name = $data['name'];
                $project->description = $data['description'] ?? null;
                $project->visibility = $data['visibility'] ?? 'public';
                $project->start_date = $data['start'] ?? null;
                $project->end_date = $data['end'] ?? null;
                $project->skills = $data['skills'] ?? [];
                $project->link_repo = $data['linkRepo'] ?? null;
                $project->github_meta = $repoMeta ? [
                    'full_name' => $repoMeta['full_name'] ?? null,
                    'private' => $repoMeta['private'] ?? null,
                    'html_url' => $repoMeta['html_url'] ?? null,
                    'language' => $repoMeta['language'] ?? null,
                ] : null;
                $project->save();
                return response()->json($project, 201);
            } catch (\Throwable $e) {
                // continue to JSON fallback below
            }
        }

        // Fallback: JSON store
        $now = now()->toIso8601String();
        $project = [
            'id' => (int) (microtime(true) * 1000),
            'user_id' => $user?->id,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'visibility' => $data['visibility'] ?? 'public',
            'start_date' => $data['start'] ?? null,
            'end_date' => $data['end'] ?? null,
            'skills' => $data['skills'] ?? [],
            'link_repo' => $data['linkRepo'] ?? null,
            'github_meta' => $repoMeta ? [
                'full_name' => $repoMeta['full_name'] ?? null,
                'private' => $repoMeta['private'] ?? null,
                'html_url' => $repoMeta['html_url'] ?? null,
                'language' => $repoMeta['language'] ?? null,
            ] : null,
            'created_at' => $now,
            'updated_at' => $now,
        ];
        $all = $this->readAll();
        $all[] = $project;
        $this->writeAll($all);
        return response()->json($project, 201);
    }

    private function readmeTemplate(string $name, string $desc): string
    {
        $today = now()->toDateString();
        return <<<MD
# {$name}

{$desc}

---

## Features
- [ ] Describe key features
- [ ] Add screenshots or GIFs

## Getting Started
```bash
git clone <this-repo-url>
cd {$name}
```

## Usage
Describe how to run or use the project.

## License
This project is licensed under the MIT License.

_Generated on {$today} by Allocate._
MD;
    }

    public function show(Request $request, int $id)
    {
        $uid = $request->user()?->id;
        if (Schema::hasTable('projects')) {
            $p = Project::query()->where('user_id', $uid)->where('id', $id)->first();
            if ($p) return response()->json($p);
            // Fallback to JSON store if not found in DB
        }
        $p = collect($this->readAll())->first(function ($x) use ($uid, $id) {
            return (($x['user_id'] ?? null) === $uid) && ((int)($x['id'] ?? 0) === $id);
        });
        if ($p) return response()->json($p);
        return response()->json(['message' => 'Not found'], 404);
    }

    public function collaborators(Request $request, int $id)
    {
        $project = $this->findByIdForUser($request, $id);
        if (!$project) return response()->json([]);
        $meta = is_array($project) ? ($project['github_meta'] ?? []) : ($project->github_meta ?? []);
        $collabs = $meta['collaborators'] ?? [];
        return response()->json($collabs);
    }

    public function inviteCollaborator(Request $request, int $id)
    {
        $request->validate([
            'login' => ['required', 'string'],
            'permission' => ['nullable', 'in:pull,push,admin,maintain,triage'],
        ]);
        $user = $request->user();
        $project = $this->findByIdForUser($request, $id);
        if (!$project) return response()->json(['message' => 'Not found'], 404);

        $full = is_array($project) ? ($project['github_meta']['full_name'] ?? ($project['link_repo'] ?? null)) : ($project->github_meta['full_name'] ?? ($project->link_repo ?? null));
        if (!$full) return response()->json(['message' => 'This project is not linked to a GitHub repo'], 400);

        // Invite via GitHub API
        $tokenEnc = $user?->github_access_token;
        if (!$tokenEnc) return response()->json(['message' => 'GitHub token not available'], 400);
        try { $gh = \Illuminate\Support\Facades\Crypt::decryptString($tokenEnc); } catch (\Throwable $e) { return response()->json(['message' => 'Invalid token'], 400); }

        $headers = [
            'User-Agent' => 'shironeko-allocate',
            'Authorization' => 'Bearer '.$gh,
            'Accept' => 'application/vnd.github+json',
        ];

        $login = $request->string('login')->toString();
        // GitHub API to invite collaborator
        $payload = [];
        if ($request->filled('permission')) $payload['permission'] = $request->string('permission')->toString();
        $put = \Illuminate\Support\Facades\Http::withHeaders($headers)
            ->put("https://api.github.com/repos/{$full}/collaborators/{$login}", $payload);
        if (!$put->ok() && $put->status() !== 201 && $put->status() !== 204) {
            return response()->json(['message' => 'Failed to invite collaborator', 'upstream' => $put->json()], 400);
        }

        // Get user info for avatar
        $u = \Illuminate\Support\Facades\Http::withHeaders($headers)->get("https://api.github.com/users/{$login}");
        $avatar = $u->ok() ? ($u->json()['avatar_url'] ?? null) : null;

        // Update local metadata
        $isPending = in_array($put->status(), [201, 202], true);
        if ($project instanceof \App\Models\Project) {
            $meta = $project->github_meta ?? [];
            $arr = $meta['collaborators'] ?? [];
            $arr = array_values(array_filter($arr, fn($c) => ($c['login'] ?? null) !== $login));
            $arr[] = ['login' => $login, 'avatar_url' => $avatar, 'permission' => $request->input('permission', 'push'), 'status' => $isPending ? 'pending' : 'active'];
            $meta['collaborators'] = $arr;
            $project->github_meta = $meta;
            $project->save();
        } else {
            $meta = $project['github_meta'] ?? [];
            $arr = $meta['collaborators'] ?? [];
            $arr = array_values(array_filter($arr, fn($c) => ($c['login'] ?? null) !== $login));
            $arr[] = ['login' => $login, 'avatar_url' => $avatar, 'permission' => $request->input('permission', 'push'), 'status' => $isPending ? 'pending' : 'active'];
            $meta['collaborators'] = $arr;
            // write back to JSON store
            $all = $this->readAll();
            foreach ($all as &$p) {
                if ((int)($p['id'] ?? 0) === $id && ($p['user_id'] ?? null) === $user?->id) {
                    $p['github_meta'] = $meta;
                    break;
                }
            }
            $this->writeAll($all);
        }

        return response()->json(['ok' => true, 'login' => $login, 'avatar_url' => $avatar]);
    }

    public function deleteCollaborator(Request $request, int $id, string $login)
    {
        $project = $this->findByIdForUser($request, $id);
        if (!$project) return response()->json(['message' => 'Not found'], 404);
        $full = is_array($project) ? ($project['github_meta']['full_name'] ?? ($project['link_repo'] ?? null)) : ($project->github_meta['full_name'] ?? ($project->link_repo ?? null));
        if (!$full) return response()->json(['message' => 'This project is not linked to a GitHub repo'], 400);

        $tokenEnc = $request->user()?->github_access_token;
        if (!$tokenEnc) return response()->json(['message' => 'GitHub token not available'], 400);
        try { $gh = \Illuminate\Support\Facades\Crypt::decryptString($tokenEnc); } catch (\Throwable $e) { return response()->json(['message' => 'Invalid token'], 400); }

        $headers = [
            'User-Agent' => 'shironeko-allocate',
            'Authorization' => 'Bearer '.$gh,
            'Accept' => 'application/vnd.github+json',
        ];
        $del = \Illuminate\Support\Facades\Http::withHeaders($headers)
            ->delete("https://api.github.com/repos/{$full}/collaborators/{$login}");
        if (!$del->ok() && $del->status() !== 204) {
            return response()->json(['message' => 'Failed to remove collaborator', 'upstream' => $del->json()], 400);
        }

        // Update local list
        if ($project instanceof \App\Models\Project) {
            $meta = $project->github_meta ?? [];
            $arr = array_values(array_filter(($meta['collaborators'] ?? []), fn($c) => ($c['login'] ?? null) !== $login));
            $meta['collaborators'] = $arr;
            $project->github_meta = $meta; $project->save();
        } else {
            $meta = $project['github_meta'] ?? [];
            $arr = array_values(array_filter(($meta['collaborators'] ?? []), fn($c) => ($c['login'] ?? null) !== $login));
            $meta['collaborators'] = $arr;
            $all = $this->readAll();
            foreach ($all as &$p) {
                if ((int)($p['id'] ?? 0) === $id && ($p['user_id'] ?? null) === $request->user()?->id) {
                    $p['github_meta'] = $meta; break;
                }
            }
            $this->writeAll($all);
        }
        return response()->json(['ok' => true]);
    }

    private function findByIdForUser(Request $request, int $id): mixed
    {
        $uid = $request->user()?->id;
        if (Schema::hasTable('projects')) {
            $p = Project::query()->where('user_id', $uid)->where('id', $id)->first();
            if ($p) return $p;
        }
        foreach ($this->readAll() as $p) {
            if ((int)($p['id'] ?? 0) === $id && ($p['user_id'] ?? null) === $uid) return $p;
        }
        return null;
    }

    public function destroy(Request $request, int $id)
    {
        $uid = $request->user()?->id;
        if (Schema::hasTable('projects')) {
            $p = Project::query()->where('user_id', $uid)->where('id', $id)->first();
            if (!$p) return response()->json(['message' => 'Not found'], 404);
            $p->delete();
            return response()->json(['ok' => true]);
        }
        $all = $this->readAll();
        $filtered = array_values(array_filter($all, fn ($x) => !((int)($x['id'] ?? 0) === $id && ($x['user_id'] ?? null) === $uid)));
        $this->writeAll($filtered);
        return response()->json(['ok' => true]);
    }
}
