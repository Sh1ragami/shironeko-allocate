export type Render = (container: HTMLElement) => void

type RouteTable = Record<string, Render>

export class Router {
  private routes: RouteTable
  private outlet: HTMLElement

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
    this.cleanupFloatingUI()
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

    render(this.outlet)
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
