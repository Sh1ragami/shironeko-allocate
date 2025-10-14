import { Router } from './router'
import { renderTop } from './pages/top'
import { renderLogin } from './pages/login'

const app = document.getElementById('app') as HTMLElement | null
if (app) {
  const router = new Router(app, {
    '/': renderTop,
    '/login': renderLogin,
    '/404': (el) => (el.innerHTML = '<p class="text-rose-700">Page not found</p>'),
  })
  router.init()
}
