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
    return h || '/'
  }

  render(): void {
    const path = this.normalize(window.location.hash)
    const render = this.routes[path] ?? this.routes['/404']
    if (render) {
      render(this.outlet)
    } else {
      this.outlet.innerHTML = '<p class="text-rose-700">Route not found</p>'
    }
  }
}

