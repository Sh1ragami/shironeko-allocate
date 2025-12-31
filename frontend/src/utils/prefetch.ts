import { apiFetch } from './api'

type Prefetched = { project: any; me?: any; at: number }
const cache = new Map<number, Prefetched>()

export async function prefetchProjectDetail(id: number): Promise<void> {
  if (cache.has(id)) return
  try {
    const [project, me] = await Promise.all([
      apiFetch(`/projects/${id}`),
      apiFetch('/me').catch(() => null),
    ])
    cache.set(id, { project, me: me || undefined, at: Date.now() })
  } catch {
    // ignore prefetch errors; normal route will fetch
  }
}

export function consumePrefetchedProject(id: number): { project: any; me?: any } | null {
  const v = cache.get(id)
  if (!v) return null
  cache.delete(id)
  return { project: v.project, me: v.me }
}

// Optional, heavier prefetch that warms additional data the detail screen needs right away.
// Use on pointerdown/selection timing (not on mere hover) to avoid excessive network.
const deepPrefetched = new Set<number>()
export async function prefetchProjectDetailDeep(id: number): Promise<void> {
  if (deepPrefetched.has(id)) return
  deepPrefetched.add(id)
  try {
    // Ensure light prefetch (project + me) and also warm server-cached GETs
    await prefetchProjectDetail(id)
    // Warm widget-state (detail reads this early via apiFetch, which has an in-memory cache)
    try { await apiFetch(`/projects/${id}/widget-state`) } catch {}
    // Warm README/proxy fetch if repo is known
    try {
      // Re-use apiFetch cache to read project quickly
      const project: any = await apiFetch(`/projects/${id}`)
      const full = (project?.github_meta?.full_name || project?.link_repo || '').toString()
      if (full) {
        const token = localStorage.getItem('apiToken')
        // Warm the browser HTTP cache for README; detail uses the same URL
        fetch(`/api/github/readme?full_name=${encodeURIComponent(full)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } as any : undefined,
          // Keep defaults so normal caching applies
        }).catch(() => {})
      }
    } catch {}
  } catch {
    // ignore
  }
}
