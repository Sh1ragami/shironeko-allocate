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

