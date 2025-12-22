const MIN_MS = 2000
let startedAt = 0

export function showRouteLoading(projectName?: string): void {
  if (document.getElementById('routeLoading')) return
  const overlay = document.createElement('div')
  overlay.id = 'routeLoading'
  overlay.className = 'route-loading'
  overlay.innerHTML = `
    <div class="rl-stage">
      <div class="rl-burst" id="rlBurst"></div>
      <div class="rl-name" id="rlName"></div>
      <div class="rl-bar"><div class="rl-bar-fill"></div></div>
    </div>`
  document.body.appendChild(overlay)
  // lock background interactions/scroll
  const c = +(document.body.getAttribute('data-lock') || '0')
  if (c === 0) document.body.style.overflow = 'hidden'
  document.body.setAttribute('data-lock', String(c + 1))
  startedAt = Date.now()
  // Inject project name
  const nm = overlay.querySelector('#rlName') as HTMLElement | null
  if (nm) nm.textContent = projectName || 'Loading'
  // Set bar duration CSS variable
  (overlay.firstElementChild as HTMLElement | null)?.style.setProperty('--rl-dur', `${MIN_MS}ms`)
  // Build honeycomb burst
  try { buildHexBurst(overlay) } catch {}
}

export function hideRouteLoading(): void {
  const delay = Math.max(0, MIN_MS - (Date.now() - startedAt))
  const finish = () => {
    const overlay = document.getElementById('routeLoading')
    if (overlay) overlay.remove()
    const c = +(document.body.getAttribute('data-lock') || '0')
    const n = Math.max(0, c - 1)
    if (n === 0) document.body.style.overflow = ''
    document.body.setAttribute('data-lock', String(n))
  }
  if (delay > 0) setTimeout(finish, delay)
  else finish()
}

function buildHexBurst(overlay: HTMLElement): void {
  const host = overlay.querySelector('#rlBurst') as HTMLElement | null
  if (!host) return
  const W = window.innerWidth, H = window.innerHeight
  const cx = Math.floor(W / 2), cy = Math.floor(H * 0.52)
  const HEX_W = 124, HEX_H = Math.round(HEX_W * 0.866)
  const stepX = Math.round(HEX_W * 0.75)

  // プロジェクト一覧のトーンに合わせた色（dark=低いトーンのrgba、light=やや明るめ）
  const theme = document.documentElement.getAttribute('data-theme') || 'dark'
  const isLight = theme === 'warm' || theme === 'sakura'
  // 少し明るめ（darkでも落ち着いた彩度で、alphaを上げる）
  const colorsFill = isLight ? [
    'rgba(59,130,246,.70)',  // blue-500
    'rgba(46,160,67,.70)',   // emerald-ish
    'rgba(239,68,68,.70)',   // red-500
    'rgba(168,85,247,.70)',  // purple-500
    'rgba(249,115,22,.70)',  // orange-500
    'rgba(234,179,8,.70)',   // amber-500
    'rgba(14,165,233,.70)',  // sky-500
    'rgba(20,184,166,.70)',  // teal-500
    'rgba(99,102,241,.70)',  // indigo-500
    'rgba(244,63,94,.70)',   // rose-500
  ] : [
    'rgba(59,130,246,.60)',  // blue-500
    'rgba(46,160,67,.60)',   // emerald-ish
    'rgba(239,68,68,.60)',   // red-500
    'rgba(168,85,247,.60)',  // purple-500
    'rgba(249,115,22,.60)',  // orange-500
    'rgba(234,179,8,.60)',   // amber-500
    'rgba(14,165,233,.60)',  // sky-500
    'rgba(20,184,166,.60)',  // teal-500
    'rgba(99,102,241,.60)',  // indigo-500
    'rgba(244,63,94,.60)',   // rose-500
  ]
  const colorsBorder = colorsFill

  const makeHex = (x: number, y: number, delayMs: number, idx: number) => {
    const d = document.createElement('div')
    d.className = 'rl-pop'
    d.style.left = `${x}px`
    d.style.top = `${y}px`
    d.style.width = `${HEX_W}px`
    d.style.height = `${HEX_H}px`
    d.style.setProperty('--rl-delay', `${delayMs}ms`)
    const ci = idx % colorsFill.length
    d.style.setProperty('--rl-col', colorsFill[ci])
    d.style.setProperty('--rl-brd', colorsBorder[ci])
    host.appendChild(d)
  }

  // even-q 垂直レイアウト: axial(q,r) -> pixel
  const toPixel = (q: number, r: number) => {
    const x = q * stepX
    const y = Math.round((r + (q % 2 ? 0.5 : 0)) * HEX_H)
    return { x: cx + x, y: cy + y }
  }

  // 画面全体の矩形をタイルで満たす（左右上下に数セル余裕）
  const Q = Math.ceil((W / 2) / stepX) + 3
  const R = Math.ceil((H / 2) / HEX_H) + 3
  const margin = Math.max(HEX_W, HEX_H)
  for (let q = -Q; q <= Q; q++) {
    for (let r = -R; r <= R; r++) {
      const p = toPixel(q, r)
      if (p.x < -margin || p.x > W + margin || p.y < -margin || p.y > H + margin) continue
      const dx = p.x - cx, dy = p.y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const base = Math.floor((dist / stepX) * 80)
      // 座標ベースの擬似乱数で色/ディレイを分散（帯状の偏りを解消）
      const seed = Math.abs((q * 92837111) ^ (r * 689287499)) >>> 0
      const jitter = seed % 120
      const ci = seed % colorsFill.length
      makeHex(p.x, p.y, base + jitter, ci)
    }
  }
}
