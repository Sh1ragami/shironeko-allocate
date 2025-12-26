export type Render = (container: HTMLElement) => void
import { hideRouteLoading, showRouteLoading } from './utils/route-loading'

type RouteTable = Record<string, Render>

export class Router {
  private routes: RouteTable
  private outlet: HTMLElement
  private lastPath: string | null = null

  constructor(outlet: HTMLElement, routes: RouteTable) {
    this.routes = routes
    this.outlet = outlet
  }

  init(): void {
    window.addEventListener('hashchange', () => this.render())
    this.render()
  }

  private normalize(hash: string): string {
    const h = hash.startsWith('#') ? hash.slice(1) : hash
    const [path] = h.split('?')
    return path || '/'
  }

  render(): void {
    const path = this.normalize(window.location.hash)
    const prev = this.lastPath
    this.lastPath = path
    // When returning from project detail to list, show a brief transition overlay
    if (prev && prev.startsWith('/project/detail') && path === '/project') {
      let bc: string | undefined
      try { bc = sessionStorage.getItem('pj-back-color') || undefined } catch { bc = undefined }
      try { showRouteLoading('プロジェクト一覧', (bc as any), { style: 'single', spinMs: 950 }) } catch {}
    }
    this.cleanupFloatingUI()
    // Clear route-loading unless single-hex animation is controlling its own end
    try {
      const rl = document.getElementById('routeLoading') as HTMLElement | null
      const controlled = !!rl && rl.getAttribute('data-style') === 'single'
      if (!controlled) hideRouteLoading()
    } catch {}
    // Auth guard: allow only public paths when not logged in
    const publicPaths = new Set<string>(['/', '/login', '/404'])
    const token = localStorage.getItem('apiToken')
    if (!token && !publicPaths.has(path)) {
      window.location.hash = '#/login'
      return
    }
    const render = this.routes[path] ?? this.routes['/404']
    if (render) {
      render(this.outlet)
    } else {
      this.outlet.innerHTML = '<p class="text-rose-700">Route not found</p>'
      return
    }
  }

  private cleanupFloatingUI(): void {
    const ids = [
      'tabCtxMenu',
      'tabRenamePop',
      'pjCardMenu',
      'collabPopover',
      'collabMenu',
      'accountOverlay',
      'pjOverlay',
      'pjProgress',
      'newTaskOverlay',
    ]
    ids.forEach((id) => document.getElementById(id)?.remove())
  }
}
