const DEFAULT_MIN_MS = 2000
let startedAt = 0
let currentMinMs = DEFAULT_MIN_MS

type RLColor = 'blue' | 'red' | 'green' | 'black' | 'white' | 'purple' | 'orange' | 'yellow' | 'gray'
type RLOpts = { burstOnly?: boolean; minMs?: number; style?: 'burst' | 'single'; spinMs?: number }

export function showRouteLoading(projectName?: string, projectColor?: RLColor, opts?: RLOpts): void {
  if (document.getElementById('routeLoading')) return
  const overlay = document.createElement('div')
  overlay.id = 'routeLoading'
  overlay.className = 'route-loading'
  const style = opts?.style || 'burst'
  const minimal = opts?.burstOnly === true
  if (style === 'single') {
    overlay.setAttribute('data-style', 'single')
    try { (overlay as any)._spinMs = opts?.spinMs ?? 0 } catch {}
    overlay.innerHTML = `
      <div class="rl-stage">
        <div class="rl-one" id="rlOne"></div>
        <div class="rl-one-label" id="rlOneLabel"></div>
      </div>`
  } else {
    overlay.innerHTML = minimal
      ? `
      <div class="rl-stage">
        <div class="rl-burst" id="rlBurst"></div>
      </div>`
      : `
      <div class="rl-stage">
        <div class="rl-burst" id="rlBurst"></div>
        <div class="rl-name" id="rlName"></div>
        <div class="rl-bar"><div class="rl-bar-fill"></div></div>
      </div>`
  }
  document.body.appendChild(overlay)
  // lock background interactions/scroll
  const c = +(document.body.getAttribute('data-lock') || '0')
  if (c === 0) document.body.style.overflow = 'hidden'
  document.body.setAttribute('data-lock', String(c + 1))
  startedAt = Date.now()
  currentMinMs = Math.max(0, typeof opts?.minMs === 'number' ? opts!.minMs! : DEFAULT_MIN_MS)
  // Inject project name when present
  const nm = overlay.querySelector('#rlName') as HTMLElement | null
  if (nm) nm.textContent = projectName || 'Loading'
  const oneLabel = overlay.querySelector('#rlOneLabel') as HTMLElement | null
  if (oneLabel) oneLabel.textContent = projectName || ''
  // Set bar duration CSS variable
  (overlay.firstElementChild as HTMLElement | null)?.style.setProperty('--rl-dur', `${currentMinMs}ms`)
  // Build effect
  if (style === 'burst') {
    try { buildHexBurst(overlay, projectColor) } catch {}
  } else {
    // Single hex: optionally tint hex by projectColor
    try {
      const stage = overlay.firstElementChild as HTMLElement | null
      const one = overlay.querySelector('#rlOne') as HTMLElement | null
      if (one) {
        // Map color name to vivid RGB and apply inline styles (stronger than CSS)
        const pick = (c?: RLColor): [number, number, number] => {
          switch (c) {
            case 'red': return [239, 68, 68]
            case 'green': return [16, 185, 129]
            case 'purple': return [168, 85, 247]
            case 'orange': return [251, 146, 60]
            case 'yellow': return [234, 179, 8]
            case 'gray': return [156, 163, 175]
            case 'white': return [255, 255, 255]
            case 'black': return [96, 165, 250] // use vivid blue instead of dark black
            case 'blue':
            default: return [59, 130, 246]
          }
        }
        const rgb = pick(projectColor)
        const theme = document.documentElement.getAttribute('data-theme') || 'dark'
        const isLight = theme === 'warm' || theme === 'sakura'
        const alpha = isLight ? 0.42 : 0.38 // align with other hex tones
        const rgba = (a: number) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`
        // Muted, consistent fill
        one.style.background = rgba(alpha)
        // Use app border token for consistency
        try { (one.style as any).borderColor = 'var(--gh-border)' } catch { one.style.borderColor = rgba(Math.min(1, alpha + 0.2)) }
        // No extra saturation/brightness tweaks
        one.style.filter = ''
        one.setAttribute('data-color', String(projectColor || 'blue'))
      }
      // Compute scale so the hex covers entire viewport by the end of animation
      if (stage) {
        const W = window.innerWidth || document.documentElement.clientWidth || 1024
        const H = window.innerHeight || document.documentElement.clientHeight || 768
        const diag = Math.sqrt(W * W + H * H)
        const base = 120 // base hex width in px (matches .rl-one width)
        const scale = Math.max(1, (diag / base) * 1.35) // generous margin to ensure full coverage
        stage.style.setProperty('--rl-one-scale', String(scale))
        stage.style.setProperty('--rl-one-rot', '90deg')
        // Tie animation duration to spinMs (fallback to 2000ms)
        const dur = Math.max(0, Number((overlay as any)._spinMs) || Number((stage as any)._spinMs) || (opts?.spinMs ?? 0))
        if (dur > 0) stage.style.setProperty('--rl-dur', `${dur}ms`)
        else stage.style.setProperty('--rl-dur', `950ms`)
        // Let animation end drive the close, not minMs
        currentMinMs = 0
        const onEnd = () => { try { hideRouteLoading() } catch {} }
        // Delay binding to next frame to ensure animation is attached
        setTimeout(() => { one?.addEventListener('animationend', onEnd, { once: true }) }, 0)
      }
    } catch {}
  }
}

export function hideRouteLoading(): void {
  const delay = Math.max(0, currentMinMs - (Date.now() - startedAt))
  const finish = () => {
    const overlay = document.getElementById('routeLoading')
    if (overlay) overlay.remove()
    const c = +(document.body.getAttribute('data-lock') || '0')
    const n = Math.max(0, c - 1)
    if (n === 0) document.body.style.overflow = ''
    document.body.setAttribute('data-lock', String(n))
    currentMinMs = DEFAULT_MIN_MS
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
