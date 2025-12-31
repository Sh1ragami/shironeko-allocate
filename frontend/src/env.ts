// Centralized access to build-time envs for the frontend
// - When hosting the frontend on a static host and the API elsewhere,
//   set VITE_API_ORIGIN to the API origin (e.g. https://allocate.onrender.com)
// - If unset, the app will call the API on the same origin ("/api").

const ORIGIN = (import.meta.env.VITE_API_ORIGIN || '').trim()
const NORMALIZED_ORIGIN = ORIGIN.replace(/\/$/, '')

// Base URL used by fetch: "<origin>/api" or just "/api" when origin is empty
export const API_BASE = (NORMALIZED_ORIGIN ? NORMALIZED_ORIGIN : '') + '/api'

// OAuth login entry (GitHub via backend)
export const GITHUB_LOGIN_URL = `${API_BASE}/auth/github`

