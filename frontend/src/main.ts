import { Router } from './router'
import './styles/index.css'
import { renderTop } from './pages/top/top'
import { renderLogin } from './pages/login/login'
import { renderProject } from './pages/project/project'

const app = document.getElementById('app') as HTMLElement | null
if (app) {
  const router = new Router(app, {
    '/': renderTop,
    '/login': renderLogin,
    '/project': renderProject,
    '/404': (el) => (el.innerHTML = '<p class="text-rose-700">Page not found</p>'),
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
