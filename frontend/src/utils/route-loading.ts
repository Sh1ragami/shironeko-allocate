const MIN_MS = 2000
let startedAt = 0

export function showRouteLoading(projectName?: string, projectColor?: 'blue' | 'red' | 'green' | 'black' | 'white' | 'purple' | 'orange' | 'yellow' | 'gray'): void {
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
  try { buildHexBurst(overlay, projectColor) } catch {}
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

function buildHexBurst(overlay: HTMLElement, projectColor?: 'blue' | 'red' | 'green' | 'black' | 'white' | 'purple' | 'orange' | 'yellow' | 'gray'): void {
  const host = overlay.querySelector('#rlBurst') as HTMLElement | null
  if (!host) return
  const W = window.innerWidth, H = window.innerHeight
  const cx = Math.floor(W / 2), cy = Math.floor(H * 0.52)
  const HEX_W = 124, HEX_H = Math.round(HEX_W * 0.866)
  const stepX = Math.round(HEX_W * 0.75)

  // トーンをプロジェクト一覧に合わせる（可能ならプロジェクト色、なければニュートラル）
  const theme = document.documentElement.getAttribute('data-theme') || 'dark'
  const isLight = theme === 'warm' || theme === 'sakura'
  const COLOR_MAP: Record<string, [number, number, number]> = {
    blue: [59,130,246],
    green: [16,185,129],
    red: [239,68,68],
    purple: [168,85,247],
    orange: [251,146,60],
    yellow: [234,179,8],
    gray: [156,163,175],
    black: [17,24,39],
    white: [255,255,255],
  }
  const rgba = (rgb: [number,number,number], a: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`
  // Build a colorful palette; if projectColor exists, rotate palette to start from it
  // Build multi-color palette (variety), rotated to start near project color
  const alpha = isLight ? 0.42 : 0.38 // align with detail
  const basePalette: Array<[number,number,number]> = [
    COLOR_MAP.blue,
    COLOR_MAP.green,
    COLOR_MAP.red,
    COLOR_MAP.purple,
    COLOR_MAP.orange,
    COLOR_MAP.yellow,
    [14,165,233],   // sky
    [20,184,166],   // teal
    [99,102,241],   // indigo
    [244,63,94],    // rose
  ]
  let idx0 = 0
  if (projectColor && COLOR_MAP[projectColor]) {
    const base = COLOR_MAP[projectColor]
    const found = basePalette.findIndex((c) => c[0]===base[0] && c[1]===base[1] && c[2]===base[2])
    idx0 = found >= 0 ? found : 0
  }
  const rotated = basePalette.slice(idx0).concat(basePalette.slice(0, idx0))
  const colorsFill = rotated.map((rgb) => rgba(rgb, alpha))
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
