import { Router } from './router'
import './styles/index.css'
import { renderRoot } from './pages/root/root'
import { renderLogin } from './pages/login/login'
import { renderProject } from './pages/project/project'
import { renderProjectDetail } from './pages/project/detail'
import { renderTutorial } from './pages/project/tutorial'
import { renderWidgetShare } from './pages/widgets/share'
import { renderWidgetManage } from './pages/widgets/manage'
import { renderProjectCreating } from './pages/project/creating'
import { renderWidgetCreate } from './pages/project/widget-create'
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
    '/project/creating': renderProjectCreating,
    '/project/widget-create': renderWidgetCreate, // backward compat
    '/widget/create': renderWidgetCreate,
    '/project/tutorial': renderTutorial,
    '/widgets/share': renderWidgetShare,
    '/widgets/manage': renderWidgetManage,
    '/404': renderNotFound,
  })
  // Capture token from URL and store
  captureTokenFromHash()
  router.init()
}

function captureTokenFromHash(): void {
  // 1) Standard pattern: #/path?token=...
  const hash = window.location.hash || ''
  let [, query = ''] = hash.split('?')
  let token = ''
  if (query) {
    token = new URLSearchParams(query).get('token') || ''
  }
  // 2) Fallback: search query (?token=...) in full URL
  if (!token) {
    const search = window.location.search || ''
    if (search) token = new URLSearchParams(search).get('token') || ''
  }
  // 3) Fallback: scan entire href for token=... (reverse-proxy quirks)
  if (!token) {
    const m = /[?#&]token=([^&#]+)/.exec(window.location.href)
    token = m ? decodeURIComponent(m[1]) : ''
  }
  if (token) {
    try { localStorage.setItem('apiToken', token) } catch {}
    // Clean URL: drop token param from hash if present
    const base = hash.split('?')[0] || '#/project'
    try { history.replaceState(null, '', base) } catch {}
  }
}
