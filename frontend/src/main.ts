import { Router } from './router'
import { renderTop } from './pages/top/top'
import { renderLogin } from './pages/login/login'
import { renderNotFound } from './pages/not-found/not-found'

const app = document.getElementById('app') as HTMLElement | null
  if (app) {
    const router = new Router(app, {
      '/': renderTop,
      '/login': renderLogin,
      '/404': renderNotFound,
    })
    router.init()
  }
