<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class UnfurlController extends Controller
{
    private function isPublicUrl(string $url): bool
    {
        $parts = parse_url($url);
        if (!$parts || !isset($parts['host']) || !isset($parts['scheme'])) return false;
        $scheme = strtolower($parts['scheme']);
        if (!in_array($scheme, ['http', 'https'])) return false;
        $host = strtolower($parts['host']);
        // Block localhost and typical private hosts
        $blockedHosts = ['localhost', '127.0.0.1', '::1'];
        if (in_array($host, $blockedHosts, true)) return false;
        // Block private IPs (simple heuristics)
        if (preg_match('/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/', $host)) return false;
        return true;
    }

    private function absUrl(string $base, string $maybe): string
    {
        if ($maybe === '') return '';
        // already absolute
        if (preg_match('/^https?:\/\//i', $maybe)) return $maybe;
        $parts = parse_url($base);
        if (!$parts || !isset($parts['scheme'], $parts['host'])) return $maybe;
        $scheme = $parts['scheme'];
        $host = $parts['host'];
        $port = isset($parts['port']) ? ':' . $parts['port'] : '';
        $basePath = isset($parts['path']) ? $parts['path'] : '/';
        if (str_starts_with($maybe, '//')) return $scheme . ':' . $maybe;
        if (str_starts_with($maybe, '/')) return $scheme . '://' . $host . $port . $maybe;
        // relative path
        $dir = rtrim(substr($basePath, 0, strrpos($basePath, '/') ?: 0), '/');
        return $scheme . '://' . $host . $port . $dir . '/' . $maybe;
    }

    private function pickMeta(array $all, array $keys): ?string
    {
        foreach ($keys as $k) {
            if (!isset($all[$k])) continue;
            $v = trim((string)$all[$k]);
            if ($v !== '') return $v;
        }
        return null;
    }

    public function unfurl(Request $request)
    {
        $url = (string)$request->query('url', '');
        if (!$this->isPublicUrl($url)) {
            return response()->json(['message' => 'Invalid URL'], 422);
        }
        try {
            $res = Http::withHeaders([
                'User-Agent' => 'shironeko-allocate-unfurl/1.0',
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            ])->timeout(8)->get($url);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Fetch failed'], 502);
        }
        if (!$res->ok()) return response()->json(['message' => 'Fetch failed'], 502);
        $html = (string)$res->body();
        // Collect meta tags
        $meta = [];
        // property and name based metas
        if (preg_match_all('/<meta\s+[^>]*>/i', $html, $m)) {
            foreach ($m[0] as $tag) {
                $name = null; $prop = null; $content = null;
                if (preg_match('/\bname\s*=\s*"([^"]+)"/i', $tag, $mm)) $name = $mm[1];
                if (preg_match('/\bproperty\s*=\s*"([^"]+)"/i', $tag, $mp)) $prop = $mp[1];
                if (preg_match('/\bcontent\s*=\s*"([^"]*)"/i', $tag, $mc)) $content = html_entity_decode($mc[1], ENT_QUOTES | ENT_HTML5);
                $key = $prop ?: $name;
                if ($key && $content !== null) $meta[$key] = $content;
            }
        }
        // title
        $titleTag = null;
        if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $mt)) {
            $titleTag = trim(html_entity_decode($mt[1], ENT_QUOTES | ENT_HTML5));
        }
        // canonical
        $canonical = null;
        if (preg_match('/<link[^>]+rel=\"canonical\"[^>]*>/i', $html, $mc)) {
            if (preg_match('/\bhref\s*=\s*\"([^\"]+)\"/i', $mc[0], $mh)) {
                $canonical = $mh[1];
            }
        }
        // icons
        $icons = [];
        if (preg_match_all('/<link[^>]+rel=\"(?:icon|shortcut icon|apple-touch-icon(?:-precomposed)?)\"[^>]*>/i', $html, $mi)) {
            foreach ($mi[0] as $tag) {
                if (preg_match('/\bhref\s*=\s*\"([^\"]+)\"/i', $tag, $mh)) {
                    $icons[] = $mh[1];
                }
            }
        }

        $all = $meta;
        $baseUrl = $url;
        $data = [
            'url' => $this->pickMeta($all, ['og:url']) ?: ($canonical ?: $url),
            'title' => $this->pickMeta($all, ['og:title', 'twitter:title']) ?: ($titleTag ?: null),
            'description' => $this->pickMeta($all, ['og:description', 'twitter:description', 'description']) ?: null,
            'site_name' => $this->pickMeta($all, ['og:site_name']) ?: parse_url($url, PHP_URL_HOST),
            'image' => null,
            'favicon' => null,
        ];
        $img = $this->pickMeta($all, ['og:image', 'twitter:image', 'og:image:url']);
        if ($img) $data['image'] = $this->absUrl($baseUrl, $img);
        // prefer higher res if provided
        $imgSecure = $this->pickMeta($all, ['og:image:secure_url']);
        if ($imgSecure) $data['image'] = $this->absUrl($baseUrl, $imgSecure);
        // favicon
        if (count($icons) > 0) {
            $data['favicon'] = $this->absUrl($baseUrl, $icons[0]);
        } else {
            $host = parse_url($url, PHP_URL_HOST);
            if ($host) $data['favicon'] = 'https://www.google.com/s2/favicons?sz=64&domain_url=' . urlencode('https://' . $host);
        }

        return response()->json($data);
    }
}

