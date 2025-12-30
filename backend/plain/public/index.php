<?php
// Minimal plain-PHP API for shironeko-allocate (root deploy)
// - OAuth (GitHub), token issuance, /api/me
// - CORS for Vercel frontend

declare(strict_types=1);

date_default_timezone_set('UTC');

// Polyfills for PHP 7.x
if (!function_exists('str_starts_with')) {
  function str_starts_with(string $h, string $n): bool { return $n === '' || strpos($h, $n) === 0; }
}
if (!function_exists('str_ends_with')) {
  function str_ends_with(string $h, string $n): bool { if ($n === '') return true; $l = strlen($n); return substr($h, -$l) === $n; }
}

define('APP_ROOT', realpath(__DIR__ . '/..'));

// Prefer storage outside docroot; fallback to docroot/storage
$primary = APP_ROOT . '/storage';
if (!@is_dir($primary)) @mkdir($primary, 0777, true);
$fallback = __DIR__ . '/storage';
if (!@is_dir($fallback)) @mkdir($fallback, 0777, true);
define('STORAGE_DIR', is_writable($primary) ? $primary : (is_writable($fallback) ? $fallback : $fallback));

// Load local envs for shared hosts
if (is_file(__DIR__ . '/config.php')) { @require __DIR__ . '/config.php'; }

function envval(string $k, ?string $def=null): ?string {
  $v = getenv($k); if ($v === false) return $def; $v = trim((string)$v); return $v === '' ? $def : $v;
}

function json_read(string $p, $d) { if (!is_file($p)) return $d; $t = @file_get_contents($p); if (!is_string($t) || $t==='') return $d; $j=json_decode($t,true); return (is_array($j)||is_object($j))?$j:$d; }
function json_write(string $p, $v): void { if (!is_dir(dirname($p))) @mkdir(dirname($p),0777,true); @file_put_contents($p, json_encode($v, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE)); }

function send_json($data, int $code=200, array $extra=[]): void { http_response_code($code); header('Content-Type: application/json; charset=utf-8'); foreach($extra as $k=>$v) header($k.': '.$v); echo json_encode($data, JSON_UNESCAPED_UNICODE); }
function send_text(string $t, int $c=200, string $ct='text/plain; charset=utf-8'): void { http_response_code($c); header('Content-Type: '.$ct); echo $t; }
function not_found(): void { send_json(['message'=>'Not found'],404); }
function bad_req(string $m='Bad Request'): void { send_json(['message'=>$m],400); }
function unauthorized(): void { send_json(['message'=>'Unauthorized'],401); }

$APP_SECRET = envval('APP_SECRET','allocate-dev-secret-please-change');

// DB (PDO MySQL)
function db_enabled(): bool { return (bool)(envval('DB_HOST') && envval('DB_DATABASE') && envval('DB_USERNAME')); }
function pdo_conn(): ?PDO {
  static $pdo=null; if ($pdo!==null) return $pdo; if (!db_enabled()) return null;
  $dsn=sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', envval('DB_HOST'), (int)envval('DB_PORT','3306'), envval('DB_DATABASE'), envval('DB_CHARSET','utf8mb4')?:'utf8mb4');
  try {
    $pdo=new PDO($dsn, envval('DB_USERNAME'), envval('DB_PASSWORD',''), [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
    ensure_schema($pdo);
    return $pdo;
  } catch (Throwable $e) { return null; }
}
function ensure_schema(PDO $pdo): void {
  static $done=false; if ($done) return; $done=true; $auto=strtolower((string)envval('AUTO_MIGRATE','1'))!=='0'; if(!$auto) return;
  try { $pdo->exec('CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    github_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NULL,
    email VARCHAR(255) NULL,
    avatar TEXT NULL,
    api_token CHAR(64) NULL,
    github_access_token TEXT NULL,
    created_at DATETIME NULL,
    updated_at DATETIME NULL,
    INDEX idx_api_token (api_token)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;'); } catch (Throwable $e) {}
}

// Storage helpers
function users_path(): string { return STORAGE_DIR.'/users.json'; }
function tokens_path(): string { return STORAGE_DIR.'/tokens.json'; }
function users_all(): array { return json_read(users_path(),[]); }
function users_save(array $a): void { json_write(users_path(),$a); }
function tokens_all(): array { return json_read(tokens_path(),[]); }
function tokens_save(array $a): void { json_write(tokens_path(),$a); }

// Token helpers
function rand_token(int $len=60): string { $raw=random_bytes(max(16,$len)); return substr(bin2hex($raw),0,$len); }
function token_hash(string $t): string { return hash('sha256',$t); }
function enc_token(string $p): string { global $APP_SECRET; $key=hash('sha256',(string)$APP_SECRET,true); $iv=random_bytes(16); $c=openssl_encrypt($p,'AES-256-CBC',$key,OPENSSL_RAW_DATA,$iv); return base64_encode($iv.$c); }
function dec_token(string $b): ?string { global $APP_SECRET; $r=base64_decode($b,true); if($r===false||strlen($r)<17)return null; $iv=substr($r,0,16); $c=substr($r,16); $key=hash('sha256',(string)$APP_SECRET,true); $p=openssl_decrypt($c,'AES-256-CBC',$key,OPENSSL_RAW_DATA,$iv); return $p===false?null:$p; }

function bearer_token(): ?string { $h=$_SERVER['HTTP_AUTHORIZATION']??''; if (stripos($h,'Bearer ')===0) return substr($h,7); if(!empty($_GET['token'])) return (string)$_GET['token']; if(!empty($_COOKIE['api_token'])) return (string)$_COOKIE['api_token']; return null; }
function current_user(): ?array {
  $t=bearer_token(); if(!$t) return null; $hashed=token_hash($t); $pdo=pdo_conn();
  if($pdo){ try{ $st=$pdo->prepare('SELECT * FROM users WHERE api_token=? LIMIT 1'); $st->execute([$hashed]); $u=$st->fetch(); if($u) return $u; } catch(Throwable $e){} }
  $map=tokens_all(); $gid=$map[$hashed]['github_id']??null; if(!$gid) return null;
  if($pdo){ try{ $st=$pdo->prepare('SELECT * FROM users WHERE github_id=? LIMIT 1'); $st->execute([(string)$gid]); $u=$st->fetch(); if($u) return $u; } catch(Throwable $e){} }
  $users=users_all(); $u=$users[(string)$gid]??null; if(!is_array($u)) return null; return $u+['id'=>(int)($u['id']??0)];
}
function require_auth(): array { $u=current_user(); if($u) return $u; unauthorized(); exit; }

function save_user_from_github(array $ghUser, string $ghAccess): array {
  $gid=(string)($ghUser['id']??($ghUser['github_id']??'')); if($gid==='') $gid=(string)rand(1000,999999);
  $name=(string)($ghUser['name']??($ghUser['login']??'GitHub User')); $email=(string)($ghUser['email']??sprintf('github_%s@users.noreply.local',$gid)); $avatar=(string)($ghUser['avatar_url']??'');
  $enc=enc_token($ghAccess); $now=gmdate('Y-m-d H:i:s'); $pdo=pdo_conn();
  if($pdo){ $st=$pdo->prepare('INSERT INTO users (github_id,name,email,avatar,github_access_token,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name),email=VALUES(email),avatar=VALUES(avatar),github_access_token=VALUES(github_access_token),updated_at=VALUES(updated_at)'); $st->execute([$gid,$name,$email,$avatar,$enc,$now,$now]); $st2=$pdo->prepare('SELECT * FROM users WHERE github_id=? LIMIT 1'); $st2->execute([$gid]); $u=$st2->fetch(); return $u?:['github_id'=>$gid,'name'=>$name,'email'=>$email,'avatar'=>$avatar]; }
  $users=users_all(); $next=1; foreach($users as $v){ $idv=(int)($v['id']??0); if($idv>=$next) $next=$idv+1; } $u=$users[$gid]??[]; $u['id']=(int)($u['id']??$next); $u['github_id']=$gid; $u['name']=$name; $u['email']=$email; $u['avatar']=$avatar; $u['github_access_token']=$enc; $users[$gid]=$u; users_save($users); return $u;
}
function issue_api_token_for(array $user): string { $token=rand_token(60); $hashed=token_hash($token); $gid=(string)$user['github_id']; $map=tokens_all(); $map[$hashed]=['github_id'=>$gid,'issued_at'=>time()]; tokens_save($map); $pdo=pdo_conn(); if($pdo){ try{ $st=$pdo->prepare('UPDATE users SET api_token=?, updated_at=? WHERE github_id=?'); $st->execute([$hashed,gmdate('Y-m-d H:i:s'),$gid]); } catch(Throwable $e){} } return $token; }
function revoke_api_token_for(array $user): void { $gid=(string)$user['github_id']; $pdo=pdo_conn(); if($pdo){ try{ $st=$pdo->prepare('UPDATE users SET api_token=NULL, updated_at=? WHERE github_id=?'); $st->execute([gmdate('Y-m-d H:i:s'),$gid]); } catch(Throwable $e){} } $map=tokens_all(); $next=[]; foreach($map as $h=>$info){ if(($info['github_id']??null)!==$gid) $next[$h]=$info; } tokens_save($next); }

// HTTP helpers (for GitHub API)
function http_req(string $m, string $url, array $hdr=[], $body=null, int $to=15): array { $ch=curl_init(); $opts=[CURLOPT_URL=>$url,CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>true,CURLOPT_MAXREDIRS=>5,CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_TIMEOUT=>$to,CURLOPT_CUSTOMREQUEST=>strtoupper($m),CURLOPT_HTTPHEADER=>$hdr]; if($body!==null){ if(is_array($body)){ $body=json_encode($body); $hdr[]='Content-Type: application/json'; } $opts[CURLOPT_POSTFIELDS]=$body; $opts[CURLOPT_HTTPHEADER]=$hdr; } curl_setopt_array($ch,$opts); $resp=curl_exec($ch); $code=curl_getinfo($ch,CURLINFO_HTTP_CODE); $err=curl_error($ch); curl_close($ch); return [$code,$resp,$err]; }
function gh_headers(?string $t=null, array $extra=[]): array { $h=['User-Agent: shironeko-allocate','Accept: application/vnd.github+json']; if($t) $h[]='Authorization: Bearer '.$t; foreach($extra as $x) $h[]=$x; return $h; }
function gh_get(string $url, ?string $t, array $q=[], array $extra=[]): array { if($q) $url .= (strpos($url,'?')===false?'?':'&').http_build_query($q); return http_req('GET',$url, gh_headers($t,$extra)); }

// Request routing
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// Normalize for subdir-less and /index.php prefix (when .htaccess absent)
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$basePrefix = rtrim(str_replace('\\','/', dirname($scriptName)), '/');
$path = $uri;
if ($basePrefix && str_starts_with($uri, $basePrefix)) { $path = substr($uri, strlen($basePrefix)) ?: '/'; }
if (str_starts_with($path, '/index.php')) { $path = substr($path, strlen('/index.php')) ?: '/'; }

// CORS for API when frontend is on a different origin
if (str_starts_with($path, '/api')) {
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  $frontend = rtrim((string)envval('FRONTEND_URL',''), '/');
  $allow=''; if($frontend && $origin && rtrim($origin,'/')===$frontend) $allow=$origin; elseif($origin && !$frontend) $allow=$origin;
  if($allow){ header('Access-Control-Allow-Origin: '.$allow); header('Vary: Origin'); header('Access-Control-Allow-Methods: GET,POST,PATCH,DELETE,OPTIONS'); header('Access-Control-Allow-Headers: Authorization, Content-Type'); header('Access-Control-Allow-Credentials: false'); }
  if ($method === 'OPTIONS') { http_response_code(204); exit; }
}

// Non-API: simple OK (frontend is hosted on Vercel)
if (!str_starts_with($path, '/api')) { send_text('OK'); exit; }

// Endpoints
if ($path === '/api/health' && $method === 'GET') { send_json(['status'=>'ok','time'=>gmdate('c')]); exit; }

// OAuth start
if ($path === '/api/auth/github' && $method === 'GET') {
  $cid = envval('GITHUB_CLIENT_ID'); $cb = envval('GITHUB_REDIRECT_URL', (envval('APP_URL','http://localhost:8080').'/api/auth/github/callback'));
  if(!$cid){ bad_req('GITHUB_CLIENT_ID missing'); exit; }
  $state = rand_token(24);
  setcookie('oauth_state',$state, time()+600, '/', '', false, true);
  if (isset($_GET['debug']) && $_GET['debug']==='1') { setcookie('oauth_debug','1', time()+600, '/', '', false, true); }
  $q = http_build_query(['client_id'=>$cid,'redirect_uri'=>$cb,'scope'=>'read:user user:email repo','state'=>$state]);
  header('Location: https://github.com/login/oauth/authorize?'.$q, true, 302); exit;
}

// OAuth callback
if ($path === '/api/auth/github/callback' && $method === 'GET') {
  $code=(string)($_GET['code']??''); $state=(string)($_GET['state']??''); $st=$_COOKIE['oauth_state']??''; if(!$code||!$state||!$st||$state!==$st){ bad_req('Invalid OAuth state'); exit; }
  $cid=envval('GITHUB_CLIENT_ID'); $sec=envval('GITHUB_CLIENT_SECRET'); $cb=envval('GITHUB_REDIRECT_URL',(envval('APP_URL','http://localhost:8080').'/api/auth/github/callback'));
  if(!$cid||!$sec){ bad_req('OAuth client not configured'); exit; }
  [$tc,$tr] = http_req('POST', 'https://github.com/login/oauth/access_token', ['Accept: application/json'], ['client_id'=>$cid,'client_secret'=>$sec,'code'=>$code,'redirect_uri'=>$cb]);
  if($tc<200||$tc>=300){ bad_req('OAuth token exchange failed'); exit; }
  $tj=json_decode((string)$tr,true)?:[]; $access=$tj['access_token']??null; if(!$access){ bad_req('No access_token'); exit; }
  [$pc,$pr] = gh_get('https://api.github.com/user', $access);
  if($pc<200||$pc>=300){ bad_req('Profile fetch failed'); exit; }
  $prof=json_decode((string)$pr,true)?:[];
  if (empty($prof['email'])) { [$ec,$er]=gh_get('https://api.github.com/user/emails',$access); if($ec>=200&&$ec<300){ $arr=json_decode((string)$er,true)?:[]; foreach($arr as $e){ if(!empty($e['primary'])){ $prof['email']=$e['email']??null; break; } } if(empty($prof['email']) && $arr && isset($arr[0]['email'])) $prof['email']=$arr[0]['email']; } }
  $user=save_user_from_github($prof,$access); $api=issue_api_token_for($user);
  $front=rtrim((string)envval('FRONTEND_URL', envval('APP_URL','http://localhost:5173')),'/'); $redir=$front.'/#/project?token='.urlencode($api);
  $dbg = isset($_COOKIE['oauth_debug']) && $_COOKIE['oauth_debug']==='1';
  if ($dbg) {
    setcookie('oauth_debug','', time()-3600,'/'); header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><meta charset="utf-8"><title>OAuth Debug</title><body style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;color:#e5e7eb;background:#111827">';
    echo '<h2>OAuth Debug</h2><p>Token (first 12): <code>'.htmlspecialchars(substr($api,0,12)).'...</code></p><p>Redirecting to:</p>';
    echo '<pre style="background:#1f2937;padding:12px;border-radius:8px;white-space:pre-wrap;word-break:break-all">'.htmlspecialchars($redir).'</pre>';
    echo '<p><a style="color:#93c5fd" href="'.htmlspecialchars($redir).'">Continue</a> (auto in 1.5s)</p><script>setTimeout(function(){location.href='.json_encode($redir).';},1500);</script></body>';
    exit;
  }
  header('Location: '.$redir, true, 302); exit;
}

if ($path === '/api/me' && $method === 'GET') {
  $u = require_auth();
  send_json(['id'=>(int)($u['id']??0),'github_id'=>(string)($u['github_id']??''),'name'=>(string)($u['name']??''),'email'=>(string)($u['email']??'')]);
  exit;
}

if ($path === '/api/logout' && $method === 'POST') {
  $u=require_auth(); $enc=(string)($u['github_access_token']??''); $gh=$enc?dec_token($enc):null; $cid=envval('GITHUB_CLIENT_ID'); $sec=envval('GITHUB_CLIENT_SECRET'); if($gh&&$cid&&$sec){ $basic=base64_encode($cid.':'.$sec); http_req('DELETE','https://api.github.com/applications/'.rawurlencode($cid).'/grants/'.rawurlencode($gh), ['Accept: application/vnd.github+json','Authorization: Basic '.$basic]); }
  revoke_api_token_for($u); send_json(['ok'=>true]); exit;
}

not_found();

