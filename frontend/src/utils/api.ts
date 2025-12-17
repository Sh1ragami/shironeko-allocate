// Custom error to retain status code
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// Simple in-memory cache for GET requests
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method?.toUpperCase() || 'GET'

  // Only cache GET requests
  if (method === 'GET') {
    const cached = cache.get(path)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return Promise.resolve(cached.data as T)
    }
  }

  const token = localStorage.getItem('apiToken')
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`/api${path}`, { ...init, headers })
  if (!res.ok) {
    // If auth fails, clear token and redirect to login
    if (res.status === 401) {
      localStorage.removeItem('apiToken')
      window.location.hash = '#/login'
    }
    throw new ApiError(res.status, `API error ${res.status}`)
  }

  const data = await (res.json() as Promise<T>)

  // Store successful GET response in cache
  if (method === 'GET') {
    cache.set(path, { data, timestamp: Date.now() })
  }

  // For non-GET requests, clear the cache to ensure data consistency
  if (method !== 'GET') {
    cache.clear()
  }

  return data
}

