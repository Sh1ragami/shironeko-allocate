import { Router } from './router'
import './styles/index.css'
import { renderRoot } from './pages/root/root'
import { renderLogin } from './pages/login/login'
import { renderProject } from './pages/project/project'
import { renderProjectDetail } from './pages/project/detail'
import { renderNotFound } from './pages/not-found/not-found'
import { getTheme, applyTheme } from './utils/theme'

const app = document.getElementById('app') as HTMLElement | null
if (app) {
  // Ensure saved theme is applied on app boot
  try { applyTheme(getTheme()) } catch {}
  const router = new Router(app, {
    '/': renderRoot,
    '/login': renderLogin,
    '/project': renderProject,
    '/project/detail': renderProjectDetail,
    '/404': renderNotFound,
  })
  // Capture token in hash and store
  captureTokenFromHash()
  router.init()
}

function captureTokenFromHash(): void {
  const hash = window.location.hash
  const [, query = ''] = hash.split('?')
  if (!query) return
  const params = new URLSearchParams(query)
  const token = params.get('token')
  if (token) {
    localStorage.setItem('apiToken', token)
    // Clean URL: drop token param from hash
    const base = hash.split('?')[0]
    history.replaceState(null, '', base)
  }
}
