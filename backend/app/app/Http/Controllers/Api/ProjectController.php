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
    private function randomColor(): string
    {
        $colors = ['blue','green','red','purple','orange','yellow','gray','black','white'];
        return $colors[random_int(0, count($colors)-1)];
    }
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
            'setupReadme' => ['nullable', 'boolean'],
            'setupIssues' => ['nullable', 'boolean'],
        ]);

        $doReadme = $request->boolean('setupReadme');
        $doIssues = $request->boolean('setupIssues');

        $repoMeta = null;
        // Prepare AI-generated README and tasks (best-effort)
        $ai = $this->generateAiPlan(
            ($data['name'] ?? '') ?: ($data['linkRepo'] ?? 'project'),
            $data['description'] ?? ''
        );
        // Normalize AI output
        $aiReadme = null; $aiTasks = [];
        if (is_array($ai)) {
            $aiReadme = $ai['readme'] ?? ($ai['README'] ?? ($ai['markdown'] ?? null));
            $tasksRaw = $ai['tasks'] ?? ($ai['issues'] ?? ($ai['items'] ?? []));
            if (is_array($tasksRaw)) {
                foreach ($tasksRaw as $t) {
                    if (is_string($t)) { $aiTasks[] = ['title' => $t, 'body' => '']; continue; }
                    if (is_array($t)) {
                        $title = $t['title'] ?? ($t['name'] ?? null);
                        if ($title) $aiTasks[] = ['title' => (string)$title, 'body' => (string)($t['body'] ?? ($t['desc'] ?? ''))];
                    }
                }
            }
            // If readme missing but provided entire markdown under another key
            if (!$aiReadme && is_string(($ai['content'] ?? null)) && str_starts_with($ai['content'], '#')) $aiReadme = $ai['content'];
        }
        if (!is_array($aiTasks) || count($aiTasks) === 0) {
            $aiTasks = $this->fallbackTasks(($data['name'] ?? '') ?: ($data['linkRepo'] ?? 'project'), $data['description'] ?? '');
        }
        $metaFlags = [
            'ai_used' => (bool)$ai,
            'ai_tasks_count' => is_array($aiTasks) ? count($aiTasks) : 0,
            'gh_repo_created' => false,
            'gh_readme_updated' => false,
            'gh_issues_created' => 0,
            'gh_issue_last_status' => null,
            'gh_readme_status' => null,
        ];

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
                // Optional: ensure issues are enabled, then create issues from AI tasks when linking existing repo
                $fullName = $repoMeta['full_name'] ?? $repo;
                if ($fullName && $doIssues && is_array($aiTasks) && count($aiTasks) > 0) {
                    try {
                        // Try enabling issues
                        try {
                            $en = Http::withHeaders($headers)->patch("https://api.github.com/repos/{$fullName}", ['has_issues' => true]);
                            $metaFlags['gh_enable_issues_status'] = $en->status();
                        } catch (\Throwable $e) {}
                        // Prepare one-per-collaborator assignment plan
                        $logins = $this->collaboratorLogins(null, $headers, $fullName);
                        $i = 0; $n = count($logins);
                        foreach ($aiTasks as $t) {
                            $title = is_array($t) ? ($t['title'] ?? null) : null;
                            $body = is_array($t) ? ($t['body'] ?? '') : '';
                            if (!$title) continue;
                            $payload = [ 'title' => $title, 'body' => $body ];
                            if ($n > 0 && $i < $n) { $payload['assignees'] = [$logins[$i]]; $i++; }
                            $resp = Http::withHeaders($headers)->post("https://api.github.com/repos/{$fullName}/issues", $payload);
                            $metaFlags['gh_issue_last_status'] = $resp->status();
                            if ($resp->ok()) $metaFlags['gh_issues_created']++;
                        }
                    } catch (\Throwable $e) {}
                }
                // Optional: update README for existing repo as well (AI > template)
                try {
                    if (!$doReadme) { throw new \Exception('skip readme'); }
                    $readme = $aiReadme ?: $this->readmeTemplate($data['name'] ?? $repo, $data['description'] ?? '');
                    $get = Http::withHeaders($headers)->get("https://api.github.com/repos/{$fullName}/contents/README.md");
                    $sha = $get->ok() ? ($get->json()['sha'] ?? null) : null;
                    $put = Http::withHeaders($headers)->put("https://api.github.com/repos/{$fullName}/contents/README.md", [
                        'message' => 'docs: initialize README with project plan',
                        'content' => base64_encode($readme),
                        'sha' => $sha,
                        'branch' => $repoMeta['default_branch'] ?? null,
                    ]);
                    $metaFlags['gh_readme_status'] = $put->status();
                    if ($put->ok()) $metaFlags['gh_readme_updated'] = true;
                } catch (\Throwable $e) {}
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
                            $metaFlags['gh_repo_created'] = true;
                            // Optional README update
                            if ($doReadme) {
                                $readme = $aiReadme ?: $this->readmeTemplate($data['name'], $data['description'] ?? '');
                                $get = Http::withHeaders($headers)->get("https://api.github.com/repos/{$fullName}/contents/README.md");
                                $sha = $get->ok() ? ($get->json()['sha'] ?? null) : null;
                                $put = Http::withHeaders($headers)->put("https://api.github.com/repos/{$fullName}/contents/README.md", [
                                    'message' => 'chore: initialize README',
                                    'content' => base64_encode($readme),
                                    'sha' => $sha,
                                    'branch' => $repoMeta['default_branch'] ?? null,
                                ]);
                                $metaFlags['gh_readme_status'] = $put->status();
                                if ($put->ok()) $metaFlags['gh_readme_updated'] = true;
                            }
                            // Optional issue creation from AI tasks
                            if ($doIssues && is_array($aiTasks) && count($aiTasks) > 0) {
                                try { $en = Http::withHeaders($headers)->patch("https://api.github.com/repos/{$fullName}", ['has_issues' => true]); $metaFlags['gh_enable_issues_status'] = $en->status(); } catch (\Throwable $e) {}
                                $logins = $this->collaboratorLogins($project ?? null, $headers, $fullName);
                                $i = 0; $n = count($logins);
                                foreach ($aiTasks as $t) {
                                    $title = is_array($t) ? ($t['title'] ?? null) : null;
                                    $body = is_array($t) ? ($t['body'] ?? '') : '';
                                    if (!$title) continue;
                                    $payload = [ 'title' => $title, 'body' => $body ];
                                    if ($n > 0 && $i < $n) { $payload['assignees'] = [$logins[$i]]; $i++; }
                                    $ires = Http::withHeaders($headers)->post("https://api.github.com/repos/{$fullName}/issues", $payload);
                                    $metaFlags['gh_issue_last_status'] = $ires->status();
                                    if ($ires->ok()) $metaFlags['gh_issues_created']++;
                                }
                            }
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
                // Initialize metadata with UI alias/color
                $ui = ['alias' => $data['name'], 'color' => $this->randomColor()];
                $meta = [ 'ui' => $ui ];
                if ($repoMeta) {
                    $meta = array_merge($meta, [
                        'full_name' => $repoMeta['full_name'] ?? null,
                        'private' => $repoMeta['private'] ?? null,
                        'html_url' => $repoMeta['html_url'] ?? null,
                        'language' => $repoMeta['language'] ?? null,
                    ]);
                }
                $project->github_meta = $meta;
                $project->save();
                $resp = $project->toArray();
                if (is_array($aiTasks) && count($aiTasks) > 0) {
                    $resp['initial_tasks'] = $this->toKanbanTasks((int)$project->id, $aiTasks);
                }
                $resp['ai_used'] = $metaFlags['ai_used'];
                $resp['ai_tasks_count'] = $metaFlags['ai_tasks_count'];
                $resp['gh_repo_created'] = $metaFlags['gh_repo_created'];
                $resp['gh_readme_updated'] = $metaFlags['gh_readme_updated'];
                $resp['gh_issues_created'] = $metaFlags['gh_issues_created'];
                return response()->json($resp, 201);
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
            'github_meta' => (function() use ($repoMeta, $data) {
                $base = ['ui' => ['alias' => $data['name'], 'color' => $this->randomColor()]];
                if ($repoMeta) {
                    $base = array_merge($base, [
                        'full_name' => $repoMeta['full_name'] ?? null,
                        'private' => $repoMeta['private'] ?? null,
                        'html_url' => $repoMeta['html_url'] ?? null,
                        'language' => $repoMeta['language'] ?? null,
                    ]);
                }
                return $base;
            })(),
            'created_at' => $now,
            'updated_at' => $now,
        ];
        $all = $this->readAll();
        $all[] = $project;
        $this->writeAll($all);
        // Include initial tasks for front-end Kanban when AI provided
        if (is_array($aiTasks) && count($aiTasks) > 0) {
            $project['initial_tasks'] = $this->toKanbanTasks($project['id'], $aiTasks);
        }
        $project['ai_used'] = $metaFlags['ai_used'];
        $project['ai_tasks_count'] = $metaFlags['ai_tasks_count'];
        $project['gh_repo_created'] = $metaFlags['gh_repo_created'];
        $project['gh_readme_updated'] = $metaFlags['gh_readme_updated'];
        $project['gh_issues_created'] = $metaFlags['gh_issues_created'];
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

    private function generateAiPlan(string $name, string $desc): ?array
    {
        $key = env('GEMINI_API_KEY');
        if (!$key) return null;
        try {
            $payload = [
                'contents' => [[
                    'parts' => [[ 'text' =>
                        "You are a helpful project assistant. Based on the inputs, produce a JSON with keys 'readme' (a detailed README.md markdown string for the app to be created) and 'tasks' (an array of objects with 'title' and optional 'body').\nInputs:\nName: {$name}\nDescription: {$desc}\nOutput must be strictly valid JSON with no extra commentary."
                    ]]
                ]],
                // Keep config minimal for broader compatibility
            ];
            $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='.urlencode($key);
            $res = Http::asJson()->post($url, $payload);
            if (!$res->ok()) return null;
            $json = $res->json();
            $parts = $json['candidates'][0]['content']['parts'] ?? [];
            $text = '';
            foreach ($parts as $p) { if (!empty($p['text'])) $text .= $p['text']; }
            if (!$text) $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? null;
            if (!$text) return null;
            // Strip code fences if present
            if (preg_match('/```(json)?\n([\s\S]*?)\n```/u', $text, $m)) { $text = $m[2]; }
            $out = json_decode($text, true);
            if (is_array($out)) return $out;
        } catch (\Throwable $e) {
            // swallow
        }
        return null;
    }

    private function toKanbanTasks(int $pid, array $aiTasks): array
    {
        $arr = [];
        foreach ($aiTasks as $i => $t) {
            $title = is_array($t) ? ($t['title'] ?? null) : null;
            if (!$title) continue;
            $body = is_array($t) ? ($t['body'] ?? '') : '';
            $arr[] = [
                'id' => (string) (microtime(true)*1000 + $i),
                'title' => $title,
                'description' => $body,
                'status' => 'todo',
                'priority' => '中',
            ];
        }
        return $arr;
    }

    private function fallbackTasks(string $name, string $desc): array
    {
        // Simple deterministic task breakdown when AI is unavailable
        $base = [
            ['title' => 'プロジェクト初期化', 'body' => "リポジトリ初期化、ブランチ保護、README更新。対象: {$name}"],
            ['title' => '要件整理', 'body' => "概要から機能一覧を洗い出し: {$desc}"],
            ['title' => 'UIスケッチ', 'body' => '主要画面のモック作成（Figma/Excalidrawなど）'],
            ['title' => 'バックエンド雛形', 'body' => 'APIエンドポイントの雛形と疎通確認'],
            ['title' => 'フロント雛形', 'body' => 'ページルーティングと基本コンポーネント'],
            ['title' => 'CIセットアップ', 'body' => 'テストとLintの自動実行を構築'],
        ];
        return $base;
    }

    private function collaboratorLogins($project, array $headers, ?string $fullName): array
    {
        $logins = [];
        $meta = is_array($project) ? ($project['github_meta'] ?? []) : ($project->github_meta ?? []);
        foreach (($meta['collaborators'] ?? []) as $c) { if (!empty($c['login'])) $logins[] = (string)$c['login']; }
        $logins = array_values(array_unique($logins));
        if (count($logins) === 0 && $fullName) {
            try {
                $res = Http::withHeaders($headers)->get("https://api.github.com/repos/{$fullName}/collaborators", ['affiliation' => 'direct', 'per_page' => 100]);
                if ($res->ok()) {
                    foreach ($res->json() as $u) { if (!empty($u['login'])) $logins[] = (string)$u['login']; }
                }
            } catch (\Throwable $e) {}
        }
        return array_values(array_unique($logins));
    }

    private function assignOneOpenIssue(Request $request, $project, string $login): void
    {
        $full = is_array($project) ? ($project['github_meta']['full_name'] ?? ($project['link_repo'] ?? null)) : ($project->github_meta['full_name'] ?? ($project->link_repo ?? null));
        if (!$full) return;
        $tokenEnc = $request->user()?->github_access_token; if (!$tokenEnc) return;
        try { $gh = Crypt::decryptString($tokenEnc); } catch (\Throwable $e) { return; }
        $headers = [ 'User-Agent' => 'shironeko-allocate', 'Authorization' => 'Bearer '.$gh, 'Accept' => 'application/vnd.github+json' ];
        try {
            @Http::withHeaders($headers)->patch("https://api.github.com/repos/{$full}", ['has_issues' => true]);
            $res = Http::withHeaders($headers)->get("https://api.github.com/repos/{$full}/issues", ['state' => 'open', 'assignee' => 'none', 'per_page' => 100]);
            if (!$res->ok()) return; $arr = $res->json(); if (!is_array($arr) || count($arr)===0) return;
            $num = $arr[0]['number'] ?? null; if (!$num) return;
            Http::withHeaders($headers)->patch("https://api.github.com/repos/{$full}/issues/{$num}", ['assignees' => [$login]]);
        } catch (\Throwable $e) {}
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

        // Assign one open unassigned issue to this collaborator (best-effort)
        try {
            $this->assignOneOpenIssue($request, $project, $login);
        } catch (\Throwable $e) {}

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

    // ---- Issues linkage ----
    public function createIssue(Request $request, int $id)
    {
        $project = $this->findByIdForUser($request, $id);
        if (!$project) return response()->json(['message' => 'Not found'], 404);
        $full = is_array($project) ? ($project['github_meta']['full_name'] ?? ($project['link_repo'] ?? null)) : ($project->github_meta['full_name'] ?? ($project->link_repo ?? null));
        if (!$full) return response()->json(['message' => 'Not linked'], 400);
        $tokenEnc = $request->user()?->github_access_token; if (!$tokenEnc) return response()->json(['message' => 'No token'], 400);
        try { $gh = Crypt::decryptString($tokenEnc); } catch (\Throwable $e) { return response()->json(['message' => 'Invalid token'], 400); }
        $headers = [ 'User-Agent' => 'shironeko-allocate', 'Authorization' => 'Bearer '.$gh, 'Accept' => 'application/vnd.github+json' ];

        $data = $request->validate([
            'title' => ['required','string','max:256'],
            'body' => ['nullable','string'],
            'status' => ['nullable','in:todo,doing,review,done'],
            'assignees' => ['nullable','array'],
            'assignees.*' => ['string'],
            'type' => ['nullable','in:feature,bug,chore'],
            'labels' => ['nullable','array'],
            'labels.*' => ['string'],
        ]);

        // Ensure Issues feature is on
        try { @Http::withHeaders($headers)->patch("https://api.github.com/repos/{$full}", ['has_issues' => true]); } catch (\Throwable $e) {}

        $labels = [];
        if (!empty($data['labels']) && is_array($data['labels'])) $labels = array_values(array_filter($data['labels'], fn($v)=> is_string($v) && $v !== ''));
        $st = $data['status'] ?? 'todo';
        $labels[] = 'kanban:'.$st;
        if (!empty($data['type'])) $labels[] = 'type:'.$data['type'];

        $payload = [
            'title' => $data['title'],
            'body' => $data['body'] ?? '',
            'labels' => array_values(array_unique($labels)),
        ];
        if (!empty($data['assignees']) && is_array($data['assignees'])) $payload['assignees'] = $data['assignees'];

        try {
            $res = Http::withHeaders($headers)->post("https://api.github.com/repos/{$full}/issues", $payload);
            if (!$res->ok()) return response()->json(['message' => 'Failed', 'upstream' => $res->json()], 400);
            $i = $res->json();
            $out = [
                'number' => $i['number'] ?? null,
                'title' => $i['title'] ?? '',
                'html_url' => $i['html_url'] ?? null,
                'state' => $i['state'] ?? 'open',
                'labels' => array_map(fn($l)=> $l['name'] ?? '', ($i['labels'] ?? [])),
            ];
            // If status was 'done', close the issue right away
            if (($data['status'] ?? '') === 'done' && !empty($out['number'])) {
                try { Http::withHeaders($headers)->patch("https://api.github.com/repos/{$full}/issues/".$out['number'], ['state' => 'closed']); } catch (\Throwable $e) {}
            }
            return response()->json($out, 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed'], 400);
        }
    }

    public function listIssues(Request $request, int $id)
    {
        $project = $this->findByIdForUser($request, $id);
        if (!$project) return response()->json([]);
        $full = is_array($project) ? ($project['github_meta']['full_name'] ?? ($project['link_repo'] ?? null)) : ($project->github_meta['full_name'] ?? ($project->link_repo ?? null));
        if (!$full) return response()->json([]);
        $tokenEnc = $request->user()?->github_access_token; if (!$tokenEnc) return response()->json([]);
        try { $gh = Crypt::decryptString($tokenEnc); } catch (\Throwable $e) { return response()->json([]); }
        $headers = [ 'User-Agent' => 'shironeko-allocate', 'Authorization' => 'Bearer '.$gh, 'Accept' => 'application/vnd.github+json' ];
        $state = $request->query('state', 'all');
        try {
            $res = Http::withHeaders($headers)->get("https://api.github.com/repos/{$full}/issues", [ 'state' => $state, 'per_page' => 100 ]);
            if (!$res->ok()) return response()->json([]);
            $issues = array_values(array_filter($res->json(), fn($x) => empty($x['pull_request'])));
            // normalize
            $out = array_map(function($i){
                return [
                    'number' => $i['number'] ?? null,
                    'title' => $i['title'] ?? '',
                    'state' => $i['state'] ?? 'open',
                    'labels' => array_map(fn($l)=> $l['name'] ?? '', ($i['labels'] ?? [])),
                    'assignees' => array_map(fn($a)=> $a['login'] ?? '', ($i['assignees'] ?? [])),
                    'html_url' => $i['html_url'] ?? null,
                    'body' => $i['body'] ?? '',
                    'created_at' => $i['created_at'] ?? null,
                    'author' => ($i['user']['login'] ?? null),
                ];
            }, $issues);
            return response()->json($out);
        } catch (\Throwable $e) { return response()->json([]); }
    }

    public function updateIssue(Request $request, int $id, int $number)
    {
        $project = $this->findByIdForUser($request, $id);
        if (!$project) return response()->json(['message' => 'Not found'], 404);
        $full = is_array($project) ? ($project['github_meta']['full_name'] ?? ($project['link_repo'] ?? null)) : ($project->github_meta['full_name'] ?? ($project->link_repo ?? null));
        if (!$full) return response()->json(['message' => 'Not linked'], 400);
        $tokenEnc = $request->user()?->github_access_token; if (!$tokenEnc) return response()->json(['message' => 'No token'], 400);
        try { $gh = Crypt::decryptString($tokenEnc); } catch (\Throwable $e) { return response()->json(['message' => 'Invalid token'], 400); }
        $headers = [ 'User-Agent' => 'shironeko-allocate', 'Authorization' => 'Bearer '.$gh, 'Accept' => 'application/vnd.github+json' ];
        $data = $request->validate([
            'status' => ['nullable', 'in:todo,doing,review,done'],
            'title' => ['nullable', 'string', 'max:256'],
            'body' => ['nullable', 'string'],
        ]);
        $patch = [];
        // status: done => close, others => open + label kanban:*
        if (!empty($data['status'])) {
            $st = $data['status'];
            if ($st === 'done') $patch['state'] = 'closed'; else $patch['state'] = 'open';
            // labels: add or replace kanban:* label
            try {
                $get = Http::withHeaders($headers)->get("https://api.github.com/repos/{$full}/issues/{$number}");
                if ($get->ok()) {
                    $labels = array_map(fn($l)=> $l['name'] ?? '', ($get->json()['labels'] ?? []));
                    $labels = array_values(array_filter($labels, fn($l)=> !str_starts_with((string)$l, 'kanban:')));
                    if ($st !== 'done') $labels[] = 'kanban:'.$st; else $labels[] = 'kanban:done';
                    $patch['labels'] = $labels;
                }
            } catch (\Throwable $e) {}
        }
        if (!empty($data['title'])) $patch['title'] = $data['title'];
        if (!empty($data['body'])) $patch['body'] = $data['body'];
        if (empty($patch)) return response()->json(['ok' => true]);
        $res = Http::withHeaders($headers)->patch("https://api.github.com/repos/{$full}/issues/{$number}", $patch);
        if (!$res->ok()) return response()->json(['message' => 'Failed', 'upstream' => $res->json()], 400);
        return response()->json(['ok' => true]);
    }

    public function assignNext(Request $request, int $id)
    {
        $data = $request->validate(['login' => ['required','string']]);
        $project = $this->findByIdForUser($request, $id);
        if (!$project) return response()->json(['message' => 'Not found'], 404);
        try { $this->assignOneOpenIssue($request, $project, $data['login']); } catch (\Throwable $e) {}
        return response()->json(['ok' => true]);
    }

    public function commentIssue(Request $request, int $id, int $number)
    {
        $data = $request->validate(['body' => ['required','string']]);
        $project = $this->findByIdForUser($request, $id);
        if (!$project) return response()->json(['message' => 'Not found'], 404);
        $full = is_array($project) ? ($project['github_meta']['full_name'] ?? ($project['link_repo'] ?? null)) : ($project->github_meta['full_name'] ?? ($project->link_repo ?? null));
        if (!$full) return response()->json(['message' => 'Not linked'], 400);
        $tokenEnc = $request->user()?->github_access_token; if (!$tokenEnc) return response()->json(['message' => 'No token'], 400);
        try { $gh = Crypt::decryptString($tokenEnc); } catch (\Throwable $e) { return response()->json(['message' => 'Invalid token'], 400); }
        $headers = [ 'User-Agent' => 'shironeko-allocate', 'Authorization' => 'Bearer '.$gh, 'Accept' => 'application/vnd.github+json' ];
        try {
            $res = Http::withHeaders($headers)->post("https://api.github.com/repos/{$full}/issues/{$number}/comments", [ 'body' => $data['body'] ]);
            if (!$res->ok()) return response()->json(['message' => 'Failed', 'upstream' => $res->json()], 400);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed'], 400);
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
            if ($p) {
                $p->delete();
                // Also clean up JSON fallback if any
                $all = $this->readAll();
                $filtered = array_values(array_filter($all, fn ($x) => !((int)($x['id'] ?? 0) === $id && ($x['user_id'] ?? null) === $uid)));
                $this->writeAll($filtered);
                return response()->json(['ok' => true]);
            }
            // Fallback: try JSON store deletion when DB not found
            $all = $this->readAll();
            $before = count($all);
            $filtered = array_values(array_filter($all, fn ($x) => !((int)($x['id'] ?? 0) === $id && ($x['user_id'] ?? null) === $uid)));
            if (count($filtered) !== $before) {
                $this->writeAll($filtered);
                return response()->json(['ok' => true]);
            }
            return response()->json(['message' => 'Not found'], 404);
        }
        $all = $this->readAll();
        $filtered = array_values(array_filter($all, fn ($x) => !((int)($x['id'] ?? 0) === $id && ($x['user_id'] ?? null) === $uid)));
        $this->writeAll($filtered);
        return response()->json(['ok' => true]);
    }

    public function update(Request $request, int $id)
    {
        $project = $this->findByIdForUser($request, $id);
        if (!$project) return response()->json(['message' => 'Not found'], 404);

        $data = $request->validate([
            // alias: app内だけで表示する名称（日本語OK）
            'alias' => ['nullable', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'start' => ['nullable', 'string', 'max:32'],
            'end' => ['nullable', 'string', 'max:32'],
            'color' => ['nullable', 'in:blue,red,green,black,white,purple,orange,yellow,gray'],
        ]);

        // Apply local changes
        $apply = function (&$meta, $key, $value) {
            if (!is_array($meta)) $meta = [];
            $meta[$key] = $value;
        };

        if ($project instanceof \App\Models\Project) {
            if (array_key_exists('description', $data)) $project->description = $data['description'];
            if (array_key_exists('start', $data)) $project->start_date = $data['start'];
            if (array_key_exists('end', $data)) $project->end_date = $data['end'];
            $meta = $project->github_meta ?? [];
            if (!isset($meta['ui']) || !is_array($meta['ui'])) $meta['ui'] = [];
            if (!empty($data['alias'])) {
                $meta['ui']['alias'] = $data['alias'];
            }
            if (!empty($data['color'])) {
                $meta['ui']['color'] = $data['color'];
            }
            $project->github_meta = $meta;
            $project->save();
            return response()->json($project);
        }

        // JSON store update
        $all = $this->readAll();
        foreach ($all as &$p) {
            if ((int)($p['id'] ?? 0) !== $id || ($p['user_id'] ?? null) !== $request->user()?->id) continue;
            if (array_key_exists('description', $data)) $p['description'] = $data['description'];
            if (array_key_exists('start', $data)) $p['start_date'] = $data['start'];
            if (array_key_exists('end', $data)) $p['end_date'] = $data['end'];
            $meta = $p['github_meta'] ?? [];
            if (!isset($meta['ui']) || !is_array($meta['ui'])) $meta['ui'] = [];
            if (!empty($data['alias'])) $meta['ui']['alias'] = $data['alias'];
            if (!empty($data['color'])) $meta['ui']['color'] = $data['color'];
            $p['github_meta'] = $meta;
        }
        $this->writeAll($all);
        $updated = $this->findByIdForUser($request, $id);
        return response()->json($updated);
    }

    // ---- UI widget state persistence ----
    // Stored under github_meta.ui.widget_state as a flat key-value map
    public function getWidgetState(Request $request, int $id)
    {
        $project = $this->findByIdForUser($request, $id);
        if (!$project) return response()->json(['message' => 'Not found'], 404);
        if ($project instanceof \App\Models\Project) {
            $meta = $project->github_meta ?? [];
            $ui = is_array($meta['ui'] ?? null) ? $meta['ui'] : [];
            $state = is_array($ui['widget_state'] ?? null) ? $ui['widget_state'] : [];
            return response()->json($state);
        }
        $meta = is_array($project['github_meta'] ?? null) ? $project['github_meta'] : [];
        $ui = is_array($meta['ui'] ?? null) ? $meta['ui'] : [];
        $state = is_array($ui['widget_state'] ?? null) ? $ui['widget_state'] : [];
        return response()->json($state);
    }

    public function patchWidgetState(Request $request, int $id)
    {
        $project = $this->findByIdForUser($request, $id);
        if (!$project) return response()->json(['message' => 'Not found'], 404);

        $data = $request->validate([
            'key' => ['nullable','string','max:200'],
            'value' => ['nullable'], // JSON value or null (to delete)
            'state' => ['nullable','array'], // bulk merge
        ]);

        $applyState = function (&$meta, array $merge) {
            if (!isset($meta['ui']) || !is_array($meta['ui'])) $meta['ui'] = [];
            if (!isset($meta['ui']['widget_state']) || !is_array($meta['ui']['widget_state'])) $meta['ui']['widget_state'] = [];
            foreach ($merge as $k => $v) {
                if ($v === null) {
                    unset($meta['ui']['widget_state'][$k]);
                } else {
                    $meta['ui']['widget_state'][$k] = $v;
                }
            }
        };

        $merge = [];
        if (array_key_exists('state', $data) && is_array($data['state'])) {
            $merge = $data['state'];
        } elseif (array_key_exists('key', $data)) {
            $merge = [ (string)$data['key'] => $data['value'] ?? null ];
        }

        if ($project instanceof \App\Models\Project) {
            $meta = $project->github_meta ?? [];
            $applyState($meta, $merge);
            $project->github_meta = $meta;
            $project->save();
            return response()->json($meta['ui']['widget_state'] ?? []);
        }

        // JSON fallback persistence
        $all = $this->readAll();
        foreach ($all as &$p) {
            if ((int)($p['id'] ?? 0) !== $id || ($p['user_id'] ?? null) !== $request->user()?->id) continue;
            $m = $p['github_meta'] ?? [];
            $applyState($m, $merge);
            $p['github_meta'] = $m;
        }
        $this->writeAll($all);
        // return updated state
        $updated = $this->findByIdForUser($request, $id);
        $meta = is_array($updated['github_meta'] ?? null) ? $updated['github_meta'] : [];
        $ui = is_array($meta['ui'] ?? null) ? $meta['ui'] : [];
        $state = is_array($ui['widget_state'] ?? null) ? $ui['widget_state'] : [];
        return response()->json($state);
    }
}
