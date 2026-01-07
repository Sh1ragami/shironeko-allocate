import { apiFetch } from '../../utils/api'
import { getTheme, setTheme } from '../../utils/theme'
import { showRouteLoading, hideRouteLoading } from '../../utils/route-loading'
import { prefetchProjectDetail, prefetchProjectDetailDeep } from '../../utils/prefetch'
import { openAccountModal as openDetailAccountModal } from './detail'
import { honeyHexFilledSvg, honeyHexEmptySvg } from '../../utils/honeycomb'

type Project = {
  id: number
  name: string
  alias?: string
  start?: string
  end?: string
  color?: 'blue' | 'red' | 'green' | 'black' | 'white' | 'purple' | 'orange' | 'yellow' | 'gray'
}

const CARD_COLORS: Project['color'][] = ['blue', 'green', 'red', 'purple', 'orange', 'yellow', 'gray', 'black', 'white']
function randomCardColor(): Project['color'] {
  return CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]
}

function projectCard(p: Project): string {
  // Guard: ignore invalid/empty projects
  if (!p || !p.id || (!p.name && !p.alias) || String(p.name || p.alias || '').trim() === '') return ''
  const color = p.color || 'blue'
  const style =
    color === 'red' ? 'bg-rose-900/40 hover:bg-rose-900/55 ring-rose-800/70 hover:ring-rose-600/80'
      : color === 'green' ? 'bg-emerald-900/40 hover:bg-emerald-900/55 ring-emerald-800/70 hover:ring-emerald-600/80'
        : color === 'black' ? 'bg-black/60 hover:bg-black/70 ring-neutral-700/80 hover:ring-neutral-600/90'
          : color === 'white' ? 'bg-white/10 hover:bg-white/15 ring-white/40 hover:ring-white/50'
            : color === 'purple' ? 'bg-fuchsia-900/40 hover:bg-fuchsia-900/55 ring-fuchsia-800/70 hover:ring-fuchsia-600/80'
              : color === 'orange' ? 'bg-orange-900/40 hover:bg-orange-900/55 ring-orange-800/70 hover:ring-orange-600/80'
                : color === 'yellow' ? 'bg-yellow-900/40 hover:bg-yellow-900/55 ring-yellow-800/70 hover:ring-yellow-600/80'
                  : color === 'gray' ? 'bg-neutral-800/60 hover:bg-neutral-800/70 ring-neutral-600 hover:ring-neutral-500'
                    : 'bg-sky-900/40 hover:bg-sky-900/55 ring-sky-800/70 hover:ring-sky-600/80'
  const title = (p.alias && String(p.alias).trim() !== '' ? p.alias : p.name)
  return `
    <button data-id="${p.id}" class="group relative w-full h-40 rounded-xl ring-2 ${style} shadow-sm text-left p-5 transition-colors pop-card btn-press">
      <div class="text-base font-medium text-gray-100/90">${title}</div>
      <div class="mt-2 text-xs text-gray-400">${p.start ? `${p.start} ~ ${p.end ?? ''}` : '&nbsp;'}</div>
      <div class="absolute bottom-3 right-3 flex gap-2 items-center opacity-0 group-hover:opacity-80 pointer-events-none group-hover:pointer-events-auto transition-opacity">
        <button type="button" class="card-menu inline-flex items-center gap-1 rounded-md bg-neutral-800/80 ring-2 ring-neutral-600 px-2 py-1 text-xs text-gray-300 hover:text-white">
          <span class="w-1.5 h-1.5 rounded-full bg-gray-300/70"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-gray-300/70"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-gray-300/70"></span>
        </button>
      </div>
    </button>
  `
}

function createProjectCard(): string {
  return `
    <button id="createCard" class="w-full h-40 rounded-xl bg-neutral-800/40 ring-2 ring-neutral-600 hover:ring-neutral-500 transition-colors grid place-items-center text-gray-300 pop-card btn-press">
      <div class="text-center">
        <div class="text-sm mb-2">プロジェクト作成</div>
        <div class="text-3xl">＋</div>
      </div>
    </button>
  `
}

export function renderProject(container: HTMLElement): void {
  // Ensure any lingering info panel from other pages is gone before render
  try { document.querySelectorAll('#giInfo').forEach((el) => (el as HTMLElement).remove()) } catch {}
  // Bind one-time route cleanup to remove the info panel only when leaving the list
  try {
    const w = window as any
    if (!w._giRouteBound) {
      const rm = () => {
        try {
          const hash = window.location.hash || ''
          // Remove when navigating away from project list (e.g. to detail or other pages)
          const leavingList = !hash.startsWith('#/project') || hash.startsWith('#/project/detail')
          if (leavingList) {
            document.querySelectorAll('#giInfo').forEach((el) => (el as HTMLElement).remove())
          }
        } catch {}
      }
      window.addEventListener('hashchange', rm)
      window.addEventListener('popstate', rm)
      window.addEventListener('beforeunload', rm)
      w._giRouteBound = true
    }
  } catch {}
  // If coming back from detail, optionally run a reverse arrival animation (no loader)
  let shouldHideAnim = false
  try {
    const flag = sessionStorage.getItem('pj-back-anim')
    if (flag === '1') {
      sessionStorage.removeItem('pj-back-anim')
      const bc = sessionStorage.getItem('pj-back-color') || undefined
      if (bc) { try { sessionStorage.removeItem('pj-back-color') } catch {} }
      // Mark container for back-arrival animation (do not show route-loading)
      ;(container as HTMLElement).setAttribute('data-back-anim', '1')
      // No loader for back-arrival
      shouldHideAnim = false
    }
  } catch {}
  container.innerHTML = `
    <div class="min-h-screen gh-canvas text-gray-100">
      <!-- Compact heading and controls around minimap -->
      <div class="fixed left-4 top-3 z-10 text-2xl md:text-3xl font-semibold text-gray-100">プロジェクト一覧</div>
      <div id="groupQuick" class="fixed left-4 top-[66px] z-10 flex items-center gap-0 group-quick"></div>
      <!-- account button removed; open from hub tile in common area -->
      <!-- Honeycomb full-screen layer -->
      <section class="hx-wrap" id="honeyWrap">
        <div class="hx-canvas" id="honeyCanvas" style="width:2000px; height:1400px"></div>
      </section>
      <!-- Left edge slide-out group panel removed -->
      <!-- Minimap (top-left) -->
      <div class="hx-mini"><canvas id="hxMini" width="120" height="120"></canvas></div>
      <!-- Account FAB (bottom-right) -->
      <button id="accountFab" class="fixed right-3 bottom-3 z-20 w-12 h-12 rounded-full ring-2 ring-neutral-600 bg-neutral-900/80 hover:bg-neutral-800 text-gray-100 shadow-lg grid place-items-center" title="アカウント" aria-label="アカウント">
        <img id="accountFabAvatar" class="hidden w-10 h-10 rounded-full" alt="avatar" />
        <span id="accountFabFallback" class="w-10 h-10 rounded-full bg-neutral-800/80 grid place-items-center text-sm font-semibold">Me</span>
      </button>
      <!-- Group info panel (bottom) - styled like widget info, separate id to avoid conflicts -->
      <aside id="giInfo" class="fixed inset-x-0 bottom-0 z-[18] hidden">
        <div class="mx-auto w-[min(560px,94vw)]">
          <button id="giInfoHandle" class="block mx-auto info-handle mb-1" aria-expanded="true" title="しまう">
            <span class="ih-ico" aria-hidden="true">
              <svg width="48" height="28" viewBox="0 0 24 16" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                <g class="up">
                  <polyline class="chev1" points="3,7 12,3 21,7" />
                  <polyline class="chev2" points="3,13 12,9 21,13" />
                </g>
                <g class="down">
                  <polyline class="chev1" points="3,3 12,7 21,3" />
                  <polyline class="chev2" points="3,9 12,13 21,9" />
                </g>
              </svg>
            </span>
          </button>
          <div id="giInfoPanel" class="rounded-t-xl rounded-b-none border-2 border-neutral-600 border-b-0 bg-neutral-950/70 backdrop-blur px-6 py-4 text-gray-100 shadow-xl">
            <div class="flex items-center gap-2 mb-2">
              <div class="text-sm font-semibold">グループ</div>
            </div>
            <div id="giInfoBody" class="text-sm leading-tight space-y-2"></div>
          </div>
        </div>
      </aside>
    </div>
  `

  // Ensure any existing loader is hidden (back-arrival does not use loader)
  try { hideRouteLoading() } catch {}
  // Ensure group location toasts are not accidentally suppressed on list
  try { document.body.removeAttribute('data-suppress-group-toast') } catch {}

  // Set user name into title if available
  apiFetch<{ id: number; name: string; github_id?: number; email?: string }>(`/me`)
    .then((me) => {
      const el = container.querySelector('#userTitle')
      if (el) el.textContent = `${me.name}のプロジェクト`
      try { localStorage.setItem(userNameKey(me.id), me.name || '') } catch {}
      // account FAB avatar
      const avatar = container.querySelector('#accountFabAvatar') as HTMLImageElement | null
      const fallback = container.querySelector('#accountFabFallback') as HTMLElement | null
      if (me.github_id && avatar) {
        avatar.src = `https://avatars.githubusercontent.com/u/${me.github_id}?s=96`
        avatar.classList.remove('hidden')
        if (fallback) fallback.classList.add('hidden')
      } else if (fallback) {
        fallback.textContent = (me.name || 'Me').slice(0, 2)
      }
      // click to open account modal
      container.querySelector('#accountFab')?.addEventListener('click', () => openDetailAccountModal(container))
      ; (container as any)._me = me
      // render quickbar now that we have user
      renderGroupQuickbar(container, me)
      // apply current filter and reload
      loadProjects(container)
    })
    .catch(() => {
      // ignore silently
    })

  // interactions
  // Create is handled by per-group create tiles inside honeycomb
  // サイドバーの＋はグループ追加専用のため、プロジェクト作成は紐付けない

  // Card click behavior (placeholder)
  container.querySelectorAll('[data-id]')?.forEach((el) => {
    el.addEventListener('click', () => {
      const id = (el as HTMLElement).getAttribute('data-id')
      if (id) window.location.hash = `#/project/detail?id=${encodeURIComponent(id)}`
    })
      // stop propagation for menu
      ; (el as HTMLElement).querySelector('.card-menu')?.addEventListener('click', (ev) => {
        ev.stopPropagation()
        const id = (el as HTMLElement).getAttribute('data-id')
        if (id) openCardMenu(container, el as HTMLElement, Number(id))
      })
  })

  // Account modal trigger moved into hub tile; also support query param
  try {
    const hash = window.location.hash
    const [, q = ''] = hash.split('?')
    if (q) {
      const params = new URLSearchParams(q)
      if (params.get('openAccount') === '1') {
        // clean URL then open modal
        history.replaceState(null, '', '#/project')
        openDetailAccountModal(container)
      }
    }
  } catch {}
  // Group add handled inside quickbar

  // Load projects when me is unknown yet (fallback)
  if (!(container as any)._me) loadProjects(container)

  // If requested from other pages, open account modal
  const wantAccount = localStorage.getItem('openAccountModal')
  if (wantAccount) {
    localStorage.removeItem('openAccountModal')
    openDetailAccountModal(container)
  }
}

// ---- Honeycomb rendering ----
type HexLayout = {
  scale: number
  tile: number
  width: number
  height: number
  offsetX: number
  offsetY: number
  centers?: Record<string, { x: number; y: number }>
  minScale?: number
  uid?: number
  nodes?: Array<{ x: number; y: number; filled: boolean; color?: Project['color'] }>
  inited?: boolean
  // last shown group banner timestamp to avoid spamming
  lastToastAt?: number
}

// ---- Hex helpers (odd-q axial conversion) ----
type Ax = { x: number; z: number }
function oddqToAxial(q: number, r: number): Ax { return { x: q, z: r - ((q - (q & 1)) >> 1) } }
function axialToOddq(x: number, z: number): { q: number; r: number } { const q = x; const r = z + ((q - (q & 1)) >> 1); return { q, r } }
function hexDist(a: Ax, b: Ax): number {
  const dx = a.x - b.x, dz = a.z - b.z, dy = -dx - dz
  return Math.floor((Math.abs(dx) + Math.abs(dy) + Math.abs(dz)) / 2)
}

// ---- Group palette (stable by index) ----
const GROUP_COLORS: Project['color'][] = ['blue', 'purple', 'green', 'orange', 'yellow', 'red', 'gray']
function colorForGroupId(groups: { id: string }[], gid: string): Project['color'] {
  // Pinned colors for specific areas/groups
  if (gid === 'area-common') return 'purple'
  if (gid === 'user') return 'blue'
  const idx = Math.max(0, groups.findIndex((g) => g.id === gid))
  return GROUP_COLORS[idx % GROUP_COLORS.length]
}
function groupTone(color?: Project['color']): { bg: string; border: string } {
  const t = (document.documentElement.getAttribute('data-theme') || 'dark')
  const light = t === 'warm' || t === 'sakura'
  // Slightly lighter than project tiles to stay in the background
  const alpha = light ? 0.24 : 0.20
  const border = 'var(--gh-border)'
  const rgba = (r: number, g: number, b: number, a: number) => `rgba(${r},${g},${b},${a})`
  switch (color) {
    case 'red': return { bg: rgba(239, 68, 68, alpha), border }
    case 'green': return { bg: rgba(16, 185, 129, alpha), border }
    case 'purple': return { bg: rgba(168, 85, 247, alpha), border }
    case 'orange': return { bg: rgba(251, 146, 60, alpha), border }
    case 'yellow': return { bg: rgba(234, 179, 8, alpha), border }
    case 'gray': return { bg: rgba(120, 120, 128, light ? 0.22 : 0.20), border }
    case 'black': return { bg: rgba(0, 0, 0, light ? 0.25 : 0.35), border }
    case 'white': return { bg: rgba(255, 255, 255, light ? 0.55 : 0.10), border }
    default: /* blue */ return { bg: rgba(59, 130, 246, alpha), border }
  }
}

// Solid (opaque) color for group icons/badges
function groupSolid(color?: Project['color']): string {
  switch (color) {
    case 'red': return 'rgb(239, 68, 68)'
    case 'green': return 'rgb(16, 185, 129)'
    case 'purple': return 'rgb(168, 85, 247)'
    case 'orange': return 'rgb(251, 146, 60)'
    case 'yellow': return 'rgb(234, 179, 8)'
    case 'gray': return 'rgb(120, 120, 128)'
    case 'black': return 'rgb(0, 0, 0)'
    case 'white': return 'rgb(255, 255, 255)'
    default: /* blue */ return 'rgb(59, 130, 246)'
  }
}

// Symmetric small patterns (even-q offset: col,row)
function smallHexPattern(n: number): Array<[number, number]> | null {
  const base: Array<[number, number]>[] = []
  base[1] = [[0, 0]]
  base[2] = [[0, 0], [1, 0]]
  base[3] = [[0, 0], [1, 0], [0, 1]]
  base[4] = [[0, 0], [1, 0], [0, 1], [-1, 1]]
  base[5] = [[0, 0], [1, 0], [0, 1], [-1, 1], [-1, 0]]
  base[6] = [[0, 0], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]]
  base[7] = [[0, 0], [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]
  if (n <= 7) return base[n] || null
  return null
}

function renderHoneycomb(root: HTMLElement, projects: Project[]): void {
  const wrap = root.querySelector('#honeyWrap') as HTMLElement | null
  const canvas = root.querySelector('#honeyCanvas') as HTMLElement | null
  if (!wrap || !canvas) return
  // layout state on host
  const prev = (wrap as any)._hx as HexLayout | undefined
  const st: HexLayout = prev || { scale: 1, tile: 220, width: 0, height: 0, offsetX: 120, offsetY: 80 }
  // If returning from detail with back-arrival animation, prevent one-frame flash
  try { if ((root as HTMLElement).getAttribute('data-back-anim') === '1') wrap.style.visibility = 'hidden' } catch {}
  let W = st.tile
  let H = Math.round(W * 0.866)
  const n = projects.length
  const stepX = () => Math.round(W * 0.75)
  const stepY = () => H
  canvas.innerHTML = ''

  // Multi-cluster plane: arrange groups on a grid; each cluster has its own honeycomb area
  const me = (root as any)._me as { id?: number } | undefined
  const groups = layoutGroups(me?.id)
  st.uid = me?.id
  const gcount = Math.max(1, groups.length)
  // Determine a uniform cluster radius to fit projects per group (+slack)
  const gmapTmp = getGroupMap(me?.id)
  const perGroupCount: Record<string, number> = {}
  projects.forEach((p) => { const gid = gmapTmp[String(p.id)] || 'user'; perGroupCount[gid] = (perGroupCount[gid] || 0) + 1 })
  const maxNeed = Math.max(1, ...groups.map((g) => perGroupCount[g.id] || 0))
  const slack = 6
  const needWithSlack = maxNeed + slack
  const cap = (R: number) => 1 + 3 * R * (R + 1)
  let R_CLUSTER = 3
  while (cap(R_CLUSTER) < needWithSlack) R_CLUSTER++
  const S = 2 * R_CLUSTER + 1 // center spacing in hex-distance to meet edges
  const gcols = Math.max(1, Math.ceil(Math.sqrt(gcount)))
  const grows = Math.max(1, Math.ceil(gcount / gcols))
  // Build per-group centers on a coarse axial lattice (E/SE basis)
  type Node = { x: number; y: number; i: number; gid: string; q: number; r: number }
  const nodes: Node[] = []
  const centers: Record<string, { x: number; y: number }> = {}
  type Ctr = { gid: string | null; ax: Ax; isGhost: boolean }
  const realCenters: Ctr[] = []
  const allCenters: Ctr[] = []
  let gi = 0
  for (let row = 0; row < grows; row++) {
    for (let col = 0; col < gcols; col++) {
      if (gi >= gcount) break
      const gid = groups[gi].id
      const axc: Ax = { x: col * S, z: row * S }
      realCenters.push({ gid, ax: axc, isGhost: false })
      gi++
    }
  }
  // one-ring ghost centers around the grid to make edge groups hex-shaped and ensure seamless edges
  for (let row = -1; row <= grows; row++) {
    for (let col = -1; col <= gcols; col++) {
      const inside = (row >= 0 && row < grows && col >= 0 && col < gcols)
      if (inside) continue
      const axc: Ax = { x: col * S, z: row * S }
      allCenters.push({ gid: null, ax: axc, isGhost: true })
    }
  }
  // add reals to all list
  allCenters.push(...realCenters)
  // compute centers pixels for UI
  realCenters.forEach((c) => {
    const o = axialToOddq(c.ax.x, c.ax.z)
    const px = o.q * stepX()
    const py = Math.round((o.r + (o.q % 2 ? 0.5 : 0)) * stepY())
    centers[c.gid!] = { x: px, y: py }
  })
  // Determine fine-grid bounds from centers (including ghosts)
  const odds = allCenters.map((c) => axialToOddq(c.ax.x, c.ax.z))
  let minQ = Math.min(...odds.map(o => o.q)), maxQ = Math.max(...odds.map(o => o.q))
  let minR = Math.min(...odds.map(o => o.r)), maxR = Math.max(...odds.map(o => o.r))
  minQ -= S; maxQ += S; minR -= S; maxR += S
  // classify each fine cell to nearest center (Voronoi in hex distance) and assign to real gid
  for (let q = minQ; q <= maxQ; q++) {
    for (let r = minR; r <= maxR; r++) {
      const cellAx = oddqToAxial(q, r)
      let best: { c: Ctr; d: number } | null = null
      for (const c of allCenters) {
        const d = hexDist(cellAx, c.ax)
        if (!best || d < best.d) best = { c, d }
      }
      if (!best || best.c.isGhost || !best.c.gid) continue
      const x = q * stepX()
      const y = Math.round((r + (q % 2 ? 0.5 : 0)) * stepY())
      nodes.push({ x, y, i: -1, gid: best.c.gid, q, r })
    }
  }
  // Normalize to positive coordinates and compute canvas size
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  nodes.forEach((n) => { if (n.x < minX) minX = n.x; if (n.y < minY) minY = n.y; if (n.x > maxX) maxX = n.x; if (n.y > maxY) maxY = n.y })
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = W; maxY = H }
  const shiftX = -minX, shiftY = -minY
  nodes.forEach((n) => { n.x += shiftX; n.y += shiftY })
  Object.keys(centers).forEach((gid) => { centers[gid].x += shiftX; centers[gid].y += shiftY })
  const width = (maxX - minX) + W
  const height = (maxY - minY) + H
  st.width = width; st.height = height
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  // Ensure we can't zoom out beyond full coverage
  st.minScale = Math.max(wrap.clientWidth / width, wrap.clientHeight / height)
  st.centers = centers
  ;(wrap as any)._hx = st

  // Assign projects to their group cluster near its center
  const map = getGroupMap(me?.id)
  const byGroup: Record<string, Project[]> = {}
  projects.forEach((p) => { const gid = map[String(p.id)] || 'user'; (byGroup[gid] ||= []).push(p) })
  const groupedNodes: Record<string, typeof nodes> = {}
  nodes.forEach((n) => { (groupedNodes[n.gid] ||= []).push(n) })
  for (const gid of Object.keys(groupedNodes)) {
    const c = centers[gid]
    groupedNodes[gid].sort((a, b) => {
      const da = (a.x - c.x) ** 2 + (a.y - c.y) ** 2
      const db = (b.x - c.x) ** 2 + (b.y - c.y) ** 2
      return da - db
    })
  }
  // -- Shrink common area (about 1/3 radius) --
  const COMMON_ID = 'area-common'
  const commonNodes = groupedNodes[COMMON_ID] || []
  const userNodes = groupedNodes['user'] || []
  const commonCenterQR = commonNodes.length ? { q: commonNodes[0].q, r: commonNodes[0].r } : null
  const userCenterQR = userNodes.length ? { q: userNodes[0].q, r: userNodes[0].r } : null
  // Slightly larger (約1/2半径) and leave a 1-ring gap around it
  const R_COMMON = Math.max(2, Math.round(R_CLUSTER * 0.5))
  const isInsideCommon = (q: number, r: number): boolean => {
    if (!commonCenterQR) return false
    const a = oddqToAxial(q, r)
    const b = oddqToAxial(commonCenterQR.q, commonCenterQR.r)
    const d = hexDist(a, b)
    return d <= R_COMMON
  }
  const isCommonGap = (q: number, r: number): boolean => {
    if (!commonCenterQR) return false
    const a = oddqToAxial(q, r)
    const b = oddqToAxial(commonCenterQR.q, commonCenterQR.r)
    const d = hexDist(a, b)
    return d === (R_COMMON + 1)
  }
  for (const [gid, arr] of Object.entries(byGroup)) {
    const spots = groupedNodes[gid] || []
    arr.forEach((p, idx) => { if (spots[idx]) spots[idx].i = projects.indexOf(p) })
  }

  // Determine focus tile (when returning from detail) in pixel coordinates
  let focusPx: { x: number; y: number } | null = null
  try {
    const fid = sessionStorage.getItem('pj-back-focus-id')
    if (fid) {
      const idx = projects.findIndex((p) => String(p.id) === String(fid))
      if (idx >= 0) {
        const node = nodes.find((n) => n.i === idx)
        if (node) { focusPx = { x: node.x + W / 2, y: node.y + H / 2 } }
      }
      // clear after reading so it won't affect future entries
      try { sessionStorage.removeItem('pj-back-focus-id') } catch {}
    }
  } catch {}

  // Decide hub tiles (first N center-most) for the common feature area
  type Hub = { q: number; r: number; label: string; sub: string; route: string }
  const hubs: Record<string, Hub[]> = {}
  {
    const gid = 'area-common'
    const arr = groupedNodes[gid] || []
    const defs: Array<{ label: string; sub: string; route: string }> = [
      { label: 'チュートリアル', sub: '使い方を学ぶ', route: '#/project/tutorial' },
      { label: '共有ウィジェット', sub: 'みんなの作品を使う', route: '#/widgets/share' },
      { label: 'ウィジェット作成', sub: '自作ウィジェットを作る', route: '#/widget/create' },
      { label: '自作ウィジェット管理', sub: '投稿・編集・削除', route: '#/widgets/manage' },
    ]
    if (arr.length) {
      hubs[gid] = arr.slice(0, defs.length).map((n, i) => ({ q: n.q, r: n.r, ...defs[i] }))
    }
  }

  // Initial centering on preferred group (once)
  if (!st.inited) {
    let pref = null as string | null
    try { pref = sessionStorage.getItem('proj-center-gid') } catch {}
    const wantAnim = (() => { try { return sessionStorage.getItem('proj-center-anim') === '1' } catch { return false } })()
    const justCreated = (() => { try { return sessionStorage.getItem('group-just-created') === '1' } catch { return false } })()
    const sel = pref || getSelectedGroup(me?.id) || groups[0]?.id || 'user'
    centerOnGroup(root, sel, !!wantAnim)
    st.inited = true
    try { updateGroupInfoPanel(document.getElementById('app') as HTMLElement, sel) } catch {}
    // Show success toast if it was just created
    try {
      if (justCreated) {
        const delay = wantAnim ? 280 : 0
        setTimeout(() => { try { showMiniToastList('グループを作成しました') } catch {} }, delay)
      }
    } catch {}
    try { if (pref) sessionStorage.removeItem('proj-center-gid') } catch {}
    try { if (wantAnim) sessionStorage.removeItem('proj-center-anim') } catch {}
    try { if (justCreated) sessionStorage.removeItem('group-just-created') } catch {}
  }

  // Save nodes for minimap rendering
  // Save for minimap: tint empty cells by group color
  ;(wrap as any)._hx.nodes = nodes
    .filter((n) => !isCommonGap(n.q, n.r))
    .filter((n) => n.gid !== COMMON_ID || isInsideCommon(n.q, n.r))
    .map(n => ({
      x: n.x,
      y: n.y,
      filled: n.i >= 0,
      color: colorForGroupId(groups, n.gid)
    }))

  // Render (with one create tile per group if there is a free spot)
  const createdSpot = new Set<string>()
  // For adjacency: build lookup by (gid,q,r)
  const idxKey = (gid: string, q: number, r: number) => `${gid}:${q}:${r}`
  const occ = new Set<string>()
  nodes.forEach((n) => { if (n.i >= 0) occ.add(idxKey(n.gid, n.q, n.r)) })
  const nbrs = (q: number, r: number) => {
    const even = (q % 2) === 0
    return even
      ? [[q+1,r],[q+1,r-1],[q,r-1],[q-1,r-1],[q-1,r],[q,r+1]]
      : [[q+1,r+1],[q+1,r],[q,r-1],[q-1,r],[q-1,r+1],[q,r+1]]
  }
  nodes.forEach((pt) => {
    const tile = document.createElement('div')
    tile.className = 'hx-tile'
    tile.style.left = `${pt.x}px`
    tile.style.top = `${pt.y}px`
    tile.style.width = `${W}px`
    tile.style.height = `${H}px`
    if (pt.gid === COMMON_ID && !isInsideCommon(pt.q, pt.r)) return
    if (isCommonGap(pt.q, pt.r)) return
    let gid = pt.gid
    if (pt.i >= 0) {
      const p = projects[pt.i]
      tile.setAttribute('data-id', String(p.id))
      const title = (p.alias && String(p.alias).trim() !== '' ? p.alias : p.name)
      // Use group color for filled tiles to unify honeycomb color by group
      const gcol = colorForGroupId(groups, gid)
      const tone = hexTone(gcol)
      const facets = deriveFacets(tone.bg)
      tile.innerHTML = `
        <div class="hx-clip hx-plain hx-svgclip" style="color:${tone.bg}; --hx-side:${facets.side}; --hx-hi:${facets.hi}; --hx-edge:${facets.side}">
          ${honeyHexFilledSvg()}
          <div class="hx-info hx-plain"><div>${escapeHtml(title)}</div></div>
        </div>`
      // Start deeper prefetch at the earliest selection moment
      tile.addEventListener('pointerdown', () => { try { prefetchProjectDetailDeep(p.id) } catch {} }, { once: true })
      tile.addEventListener('click', () => {
        try { document.querySelectorAll('#giInfo').forEach((el) => (el as HTMLElement).remove()) } catch {}
        // 保存: 戻ってきた時にこのプロジェクトのグループを中心に
        try {
          const me = (root as any)._me as { id?: number } | undefined
          const map = getGroupMap(me?.id)
          const gid = map[String(p.id)] || 'user'
          sessionStorage.setItem('proj-center-gid', gid)
        } catch {}
        try { prefetchProjectDetailDeep(p.id) } catch {}
        // Suppress group location toast during transition
        try { sessionStorage.setItem('suppress-group-toast', '1') } catch {}
        try { document.body.setAttribute('data-suppress-group-toast', '1') } catch {}
        // Native transition: move actual list honeycomb off-screen with dim
        try {
          const wrap = root.querySelector('#honeyWrap') as HTMLElement | null
          if (wrap) {
            // Fixed direction for consistency: list moves left, detail enters from right
            try { sessionStorage.setItem('proj-entry-dir', 'right') } catch {}
            // Dimmer
            let dim = document.getElementById('pageDimmer') as HTMLElement | null
            if (!dim) {
              dim = document.createElement('div')
              dim.id = 'pageDimmer'
              document.body.appendChild(dim)
            }
            // Sequence using actual canvas transform (no cut-out): shrink via zoomAt, then pan left
            const canvas = root.querySelector('#honeyCanvas') as HTMLElement | null
            const st: any = (wrap as any)._hx
            let sent = false
            const go = () => { if (sent) return; sent = true; try { document.querySelectorAll('#giInfo').forEach((el) => (el as HTMLElement).remove()) } catch {}; window.location.hash = `#/project/detail?id=${p.id}` }
            if (!canvas || !st) { setTimeout(go, 50); return }
            const rect = tile.getBoundingClientRect()
            const cx = Math.round(rect.left + rect.width / 2)
            const cy = Math.round(rect.top + rect.height / 2)
            const startScale = st.scale || 1
            const endScale = startScale * 0.6
            const durationShrink = 400
            const durationMove = 800
            // S-curve easing (easeInOutCubic): 徐々に加速→徐々に減速
            const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
            const now = () => performance.now()
            const animate = (dur: number, step: (t:number)=>void, done: ()=>void) => {
              const t0 = now()
              const tick = () => {
                const t = Math.min(1, (now() - t0) / dur)
                step(ease(t))
                if (t < 1) requestAnimationFrame(tick); else done()
              }
              requestAnimationFrame(tick)
            }
            // Helper: zoom keeping a screen point fixed (same logic as wheel pinch)
            const zoomAtPoint = (clientX: number, clientY: number, nextScale: number) => {
              const min = Math.max(0.2, (st.minScale || 0))
              const ns = Math.max(min, Math.min(2.4, nextScale))
              const rect = wrap.getBoundingClientRect()
              const prev = st.scale
              const cx2 = clientX - rect.left
              const cy2 = clientY - rect.top
              const wx = (cx2 - st.offsetX) / prev
              const wy = (cy2 - st.offsetY) / prev
              st.scale = ns
              st.offsetX = cx2 - wx * ns
              st.offsetY = cy2 - wy * ns
              applyHexTransform(wrap, canvas!, st)
            }
            // No full-screen dim; keep it transparent to avoid flash
            // setTimeout(() => { dim!.style.opacity = '0.25' }, 180)
            // Phase 1: shrink around tile center using built-in zoomAt
            animate(durationShrink, (t) => {
              const s = startScale + (endScale - startScale) * t
              try { zoomAtPoint(cx, cy, s) } catch { /* ignore */ }
            }, () => {
              // Persist achieved shrink ratio for detail to match visual scale
              try {
                const achieved = st.scale || endScale
                const ratio = (startScale > 0.0001) ? (achieved / startScale) : 0.6
                sessionStorage.setItem('proj-shrink-ratio', String(ratio))
                // Persist the on-screen unit size (tile * scale) at small state to match detail visually
                const unitSmall = (st.tile || 1) * (achieved || endScale)
                sessionStorage.setItem('proj-small-unit', String(unitSmall))
              } catch {}
              // Phase 2: pan left while small
              const startX = st.offsetX || 0
              const targetX = startX - Math.max(wrap.clientWidth * 1.2, 600)
              const startY = st.offsetY || 0
              animate(durationMove, (t2) => {
                st.offsetX = Math.round(startX + (targetX - startX) * t2)
                st.offsetY = startY
                try { applyHexTransform(wrap, canvas!, st) } catch {}
              }, () => {})
              // Navigate near end of move so edge is gone
              setTimeout(go, Math.max(600, durationMove - 180))
              setTimeout(go, durationMove + 700) // absolute fallback
            })
          } else {
            window.location.hash = `#/project/detail?id=${p.id}`
          }
        } catch { window.location.hash = `#/project/detail?id=${p.id}` }
      })
      // Hover/touch prefetch for snappier transition
      const doPrefetch = () => { try { prefetchProjectDetail(p.id) } catch {} }
      tile.addEventListener('mouseenter', doPrefetch)
      tile.addEventListener('touchstart', doPrefetch, { passive: true })
    } else {
      // use effective gid for rendering logic below
      if (gid === 'area-common') {
        // Render hub tiles with labels; others as tinted background
        const gcol = colorForGroupId(groups, gid)
        const tone = hexTone(gcol)
        const picks = hubs[gid] || []
        const h = picks.find((x) => x.q === pt.q && x.r === pt.r)
        if (h) {
          const label = h.label
          const sub = h.sub
          // Vibrant palette for hub tiles (distinct, eye-catching)
          const picksIdx = Math.max(0, (picks || []).findIndex(x => x.q === h.q && x.r === h.r))
          const hubPalette = [
            'rgba(255, 64, 129, 0.50)', // vivid pink
            'rgba(0, 200, 255, 0.52)',  // bright cyan
            'rgba(255, 214, 10, 0.52)', // vivid yellow
            'rgba(168, 85, 247, 0.52)', // vibrant purple
            'rgba(255, 128, 0, 0.50)',  // vivid orange
            'rgba(80, 220, 100, 0.50)', // bright lime green
          ]
          const hubBg = hubPalette[picksIdx % hubPalette.length]
          const facets = deriveFacets(hubBg)
          tile.innerHTML = `
            <div class="hx-clip hx-plain hx-svgclip" style="color:${hubBg}; --hx-side:${facets.side}; --hx-hi:${facets.hi}; --hx-edge:${facets.side}; filter: drop-shadow(0 0 10px rgba(255,255,255,0.16))">
              ${honeyHexFilledSvg()}
              <div class="hx-info hx-plain"><div>${escapeHtml(label)}</div><div class="text-[10px] opacity-80 mt-0.5">${escapeHtml(sub)}</div></div>
            </div>`
          tile.addEventListener('click', () => {
            try { sessionStorage.setItem('proj-center-gid', gid) } catch {}
            try { showRouteLoading(h.label, 'blue', { style: 'single', spinMs: 1200, minMs: 900 }) } catch {}
            window.location.hash = h.route
          })
        } else {
          const theme = (document.documentElement.getAttribute('data-theme') || 'dark')
          const light = theme === 'warm' || theme === 'sakura'
          const emptyTone = light ? 'rgba(120,120,128,0.26)' : 'rgba(120,120,128,0.22)'
          const f = deriveFacets(emptyTone)
          tile.innerHTML = `<div class="hx-clip hx-plain hx-svgclip" style="color:${emptyTone}; --hx-side:${f.side}; --hx-hi:${f.hi}">${honeyHexEmptySvg()}</div>`
        }
        canvas.appendChild(tile)
        return
      }
      let makeCreate = false
      if (!createdSpot.has(gid)) {
        // place create tile next to existing project if any in this group
        const adj = nbrs(pt.q, pt.r)
        makeCreate = adj.some(([aq, ar]) => occ.has(idxKey(gid, aq, ar)))
        // fallback: ifグループに1件もない場合は中心に近い最初の空きを使う
        if (gid === 'area-common') {
          makeCreate = false
        } else if (!makeCreate && !(byGroup[gid] && byGroup[gid].length > 0)) {
          const c = centers[gid]
          const dist = (pt.x - c.x) ** 2 + (pt.y - c.y) ** 2
          // Threshold based on cluster radius in pixels
          const clusterRadiusPx = stepX() * (R_CLUSTER + 0.5)
          makeCreate = dist < (clusterRadiusPx * clusterRadiusPx) / 2
        }
      }
      if (makeCreate) {
        createdSpot.add(gid)
        tile.classList.add('hx-create')
        // Use occupied-tile SVG for create button as requested
        const theme = (document.documentElement.getAttribute('data-theme') || 'dark')
        const light = theme === 'warm' || theme === 'sakura'
        const base = light ? 'rgba(120,120,128,0.26)' : 'rgba(120,120,128,0.22)'
        const facets = deriveFacets(base)
        tile.innerHTML = `
          <div class="hx-clip hx-svgclip" style="color:${base}; --hx-side:${facets.side}; --hx-hi:${facets.hi}; --hx-edge:${facets.side}">
            ${honeyHexFilledSvg()}
            <div class="hx-info"><div class="text-xs">プロジェクト追加</div><div class="plus">＋</div></div>
          </div>`
        tile.addEventListener('click', () => {
          try { localStorage.setItem('createTargetGroup', gid) } catch {}
          openCreateProjectModal(root)
        })
      } else {
        // Empty cells in list should be tinted per area/group (keep area differentiation)
        const gcol = colorForGroupId(groups, gid)
        const gt = groupTone(gcol)
        const f = deriveFacets(gt.bg)
        tile.setAttribute('data-group', gid)
        tile.innerHTML = `<div class="hx-clip hx-plain hx-svgclip" style="color:${gt.bg}; --hx-side:${f.side}; --hx-hi:${f.hi}">${honeyHexEmptySvg()}</div>`
      }
    }
    canvas.appendChild(tile)
  })
  // apply transform
  applyHexTransform(wrap, canvas, st)
  bindHoneyInteractions(root, wrap, canvas, st)
  // Run reverse arrival (from left, then grow) if flagged
  try {
    const need = (root as HTMLElement).getAttribute('data-back-anim') === '1'
    if (need && !(wrap as any)._backArrivalRun) {
      ;(wrap as any)._backArrivalRun = true
      const origScale = st.scale || 1
      // Small state target (mirror of forward path)
      let smallRatio = 0.6
      try {
        const r = parseFloat(sessionStorage.getItem('pj-back-shrink-ratio') || '')
        if (isFinite(r) && r > 0.1 && r < 2.0) smallRatio = r
      } catch {}
      const small = Math.max(0.1, origScale * smallRatio)
      // Compute target offsets at small scale such that the focused tile (if any)
      // is centered on screen; otherwise center the whole content.
      const viewW = wrap.clientWidth || 0
      const viewH = wrap.clientHeight || 0
      let targetXSmall: number, targetYSmall: number
      if (focusPx) {
        targetXSmall = Math.round(viewW / 2 - focusPx.x * small)
        targetYSmall = Math.round(viewH / 2 - focusPx.y * small)
      } else {
        const contentWSmall = st.width * small
        const contentHSmall = st.height * small
        targetXSmall = Math.round((viewW - contentWSmall) / 2)
        targetYSmall = Math.round((viewH - contentHSmall) / 2)
      }
      st.scale = small
      st.offsetX = targetXSmall - Math.max(viewW * 1.2, 600)
      st.offsetY = targetYSmall
      applyHexTransform(wrap, canvas, st)
      wrap.style.visibility = ''
      const durationMove = 800
      const durationGrow = 400
      const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
      const now = () => performance.now()
      const animate = (dur: number, step: (t:number)=>void, done: ()=>void) => {
        const t0 = now()
        const tick = () => { const tt = Math.min(1, (now()-t0)/dur); step(ease(tt)); if (tt<1) requestAnimationFrame(tick); else done() }
        requestAnimationFrame(tick)
      }
      // Phase A: slide in from left while small
      const startXOff = st.offsetX
      animate(durationMove, (t) => {
        st.offsetX = Math.round(startXOff + (targetXSmall - startXOff) * t)
        st.offsetY = targetYSmall
        applyHexTransform(wrap, canvas, st)
      }, () => {
        // Phase B: grow to normal scale around viewport center
        const rect = wrap.getBoundingClientRect()
        const cx2 = rect.width / 2
        const cy2 = rect.height / 2
        const zoomAtCenter = (s: number) => {
          const prev = st.scale
          const wx = (cx2 - st.offsetX) / prev
          const wy = (cy2 - st.offsetY) / prev
          st.scale = s
          st.offsetX = Math.round(cx2 - wx * s)
          st.offsetY = Math.round(cy2 - wy * s)
          applyHexTransform(wrap, canvas, st)
        }
        const startS = st.scale
        animate(durationGrow, (t2) => {
          const s = startS + (origScale - startS) * t2
          zoomAtCenter(s)
        }, () => {
          // Clear suppression and hide loader now that arrival is complete
          try { sessionStorage.removeItem('suppress-group-toast'); document.body.removeAttribute('data-suppress-group-toast') } catch {}
          try { hideRouteLoading() } catch {}
          try { (root as HTMLElement).removeAttribute('data-back-anim') } catch {}
        })
      })
    }
  } catch {}
}

function escapeHtml(s: string): string { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;') }

function hexTone(color?: Project['color']): { bg: string; border: string; texture: string } {
  // Match the palette used by project detail's honeycomb (hx widgets)
  // Base RGBs align with Tailwind-like tones used in detail view
  const t = (document.documentElement.getAttribute('data-theme') || 'dark')
  const light = t === 'warm' || t === 'sakura'
  const alpha = light ? 0.42 : 0.38
  const border = 'var(--gh-border)'
  const TX = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 60'><defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='white' stop-opacity='.04'/><stop offset='1' stop-color='black' stop-opacity='.08'/></linearGradient></defs><rect width='80' height='60' fill='url(#g)'/></svg>`)
  const texture = `data:image/svg+xml;utf8,${TX}`
  const rgba = (r: number, g: number, b: number, a: number) => `rgba(${r},${g},${b},${a})`
  switch (color) {
    case 'red': return { bg: rgba(239, 68, 68, alpha), border, texture }
    case 'green': return { bg: rgba(16, 185, 129, alpha), border, texture }
    case 'purple': return { bg: rgba(168, 85, 247, alpha), border, texture }
    case 'orange': return { bg: rgba(251, 146, 60, alpha), border, texture }
    case 'yellow': return { bg: rgba(234, 179, 8, alpha), border, texture }
    case 'gray': return { bg: rgba(120, 120, 128, light ? 0.38 : 0.35), border, texture }
    case 'black': return { bg: rgba(0, 0, 0, light ? 0.45 : 0.55), border, texture }
    case 'white': return { bg: rgba(255, 255, 255, light ? 0.65 : 0.10), border, texture }
    default: /* blue */ return { bg: rgba(59, 130, 246, alpha), border, texture }
  }
}

// Derive darker side and lighter highlight from a base rgba() color string
function deriveFacets(main: string): { side: string; hi: string } {
  // expect rgba(r,g,b,a) or rgb(r,g,b)
  let m = main.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\)$/)
  if (!m) return { side: main, hi: main }
  const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10)
  const a = m[4] != null ? Math.max(0, Math.min(1, parseFloat(m[4]))) : 1
  const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)))
  // side: darker, black-mix strong
  const sr = clamp(r * 0.35), sg = clamp(g * 0.35), sb = clamp(b * 0.35)
  const sa = Math.max(0.65, Math.min(0.9, a + 0.30))
  // hi: subtle white-mix to avoid wash-out
  const hr = clamp(r + (255 - r) * 0.12)
  const hg = clamp(g + (255 - g) * 0.12)
  const hb = clamp(b + (255 - b) * 0.12)
  const ha = Math.max(0.16, Math.min(0.3, a + 0.06))
  return { side: `rgba(${sr},${sg},${sb},${sa})`, hi: `rgba(${hr},${hg},${hb},${ha})` }
}

function clampOffsets(wrap: HTMLElement, st: HexLayout): void {
  // Allow overscroll so users can move into empty space and center any group
  const PAD = Math.max(480, Math.floor(Math.max(wrap.clientWidth, wrap.clientHeight) * 0.7))
  const contentW = st.width * st.scale
  const contentH = st.height * st.scale
  const minX = wrap.clientWidth - contentW - PAD
  const minY = wrap.clientHeight - contentH - PAD
  const maxX = PAD
  const maxY = PAD
  // If the range collapses (extremely small content), center within the allowed span
  if (minX > maxX) st.offsetX = Math.floor((minX + maxX) / 2)
  else st.offsetX = Math.max(minX, Math.min(maxX, st.offsetX))
  if (minY > maxY) st.offsetY = Math.floor((minY + maxY) / 2)
  else st.offsetY = Math.max(minY, Math.min(maxY, st.offsetY))
}

function applyHexTransform(wrap: HTMLElement, canvas: HTMLElement, st: HexLayout): void {
  clampOffsets(wrap, st)
  canvas.style.transform = `translate(${st.offsetX}px, ${st.offsetY}px) scale(${st.scale})`
  drawMiniMap(wrap, st)
  // Auto-select group based on viewport center
  try {
    if (!st.centers) return
    const cx = (wrap.clientWidth / 2 - st.offsetX) / st.scale
    const cy = (wrap.clientHeight / 2 - st.offsetY) / st.scale
    let best: [string, number] | null = null
    for (const [gid, c] of Object.entries(st.centers)) {
      const d2 = (c.x - cx) ** 2 + (c.y - cy) ** 2
      if (!best || d2 < best[1]) best = [gid, d2]
    }
    if (best) {
      const uid = st.uid
      const curSel = getSelectedGroup(uid)
      const gidNow = best[0]
      const prevLoc = (wrap as any)._locCenter
      // Toast when center group actually changes (real or common)
      if (gidNow && gidNow !== prevLoc) {
        try {
          if (!document.body.hasAttribute('data-suppress-group-toast') && !document.getElementById('pageDimmer')) {
            showGroupLocationToast(gidNow, uid)
          }
        } catch {}
        try { (wrap as any)._locCenter = gidNow } catch {}
        try { updateGroupInfoPanel(document.getElementById('app') as HTMLElement, gidNow) } catch {}
      }
      // Maintain selected group only for real groups
      const real = getGroupById(uid, gidNow)
      if (gidNow && real && curSel !== gidNow) {
        setSelectedGroup(uid, gidNow)
        // Slightly update title text without reload
        const me = (document.getElementById('app') as any)?._me
        updateListTitle(document.getElementById('app') as HTMLElement, me || {})
        // highlight in sidebar if present
        const sb = document.getElementById('groupSidebar')
        sb?.querySelectorAll('[data-group]')?.forEach((el) => {
          el.classList.toggle('ring-sky-500', (el as HTMLElement).getAttribute('data-group') === gidNow)
          el.classList.toggle('ring-neutral-600', (el as HTMLElement).getAttribute('data-group') !== gidNow)
        })
        // highlight in quickbar as well
        const qb = document.getElementById('groupQuick')
        qb?.querySelectorAll('[data-group]')?.forEach((el) => {
          const on = (el as HTMLElement).getAttribute('data-group') === gidNow
          el.classList.toggle('gq-active', on)
          el.classList.toggle('ring-sky-500', on)
          el.classList.toggle('ring-neutral-600', !on)
          if (on) (el as HTMLElement).style.zIndex = '9000'
        })
        // Refresh info panel contents for the selected group
        try { updateGroupInfoPanel(document.getElementById('app') as HTMLElement, gidNow) } catch {}
      }
      // Ensure info panel reflects current center even if group didn't change
      try { updateGroupInfoPanel(document.getElementById('app') as HTMLElement, gidNow) } catch {}
    }
  } catch {}
}

function showGroupLocationToast(gid: string, uid?: number): void {
  // Disable while navigating to detail
  try { if (sessionStorage.getItem('suppress-group-toast') === '1') return } catch {}
  if (document.body.hasAttribute('data-suppress-group-toast')) return
  if (document.getElementById('pageDimmer')) return
  // Throttle a bit to avoid overwhelming on rapid toggles
  const app = document.getElementById('app') as HTMLElement | null
  const host = app || document.body
  const overlayId = 'groupLocToast'
  // Find group name
  let name = ''
  let accentRgb: string | null = null
  try {
    const g = getGroupById(uid, gid)
    name = g?.name || ''
    // Resolve group color for accent using the same layout group ordering
    const groups = layoutGroups(uid)
    const col = colorForGroupId(groups as any, gid)
    // Use the same solid color used for group icons; force white for 共有スペース
    accentRgb = (gid === 'area-common') ? '#ffffff' : groupSolid(col as any)
  } catch {}
  // Fallback names for virtual areas
  if (!name && gid === 'area-common') name = '共有スペース'
  if (!name) return
  // Recreate to restart animation cleanly
  document.getElementById(overlayId)?.remove()
  const wrap = document.createElement('div')
  wrap.id = overlayId
  wrap.className = 'loc-toast'
  const inner = document.createElement('div')
  inner.className = 'loc-inner'
  inner.textContent = name
  if (accentRgb) { inner.style.setProperty('--loc-color', accentRgb) }
  wrap.appendChild(inner)
  host.appendChild(wrap)
  // Auto remove after animation
  setTimeout(() => { wrap.remove() }, 1100)
}

// Small success/danger toast for project list (top-right)
function showMiniToastList(message: string, opts?: { variant?: 'success' | 'danger' }): void {
  try {
    const id = 'miniToast'
    document.getElementById(id)?.remove()
    const wrap = document.createElement('div')
    wrap.id = id
    wrap.className = 'mini-toast'
    if (opts?.variant === 'danger') wrap.classList.add('is-danger'); else wrap.classList.add('is-success')
    // Position like detail: under minimap or 10px under modal top; right edge hugged
    let top = 164
    let right = -16
    try {
      const modal = document.querySelector('.pop-modal') as HTMLElement | null
      if (modal) {
        const r = modal.getBoundingClientRect()
        top = Math.max(10, Math.round(r.top + 10))
      } else {
        const miniWrap = document.querySelector('.hx-mini') as HTMLElement | null
        const mini = document.getElementById('hxMini') as HTMLCanvasElement | null
        const ref = miniWrap || mini
        if (ref) {
          const r = ref.getBoundingClientRect()
          top = Math.round(r.bottom + 8)
        }
      }
    } catch {}
    wrap.style.top = `${top}px`
    wrap.style.right = `${right}px`
    const inner = document.createElement('div')
    inner.className = 'mini-inner'
    const body = document.createElement('div')
    body.className = 'mini-body'
    const icon = document.createElement('span')
    icon.className = 'mini-ico'
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '16'); svg.setAttribute('height', '16'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'currentColor'); svg.setAttribute('aria-hidden', 'true')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    if (opts?.variant === 'danger') {
      path.setAttribute('d', 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 5v6h-2V7h2zm0 8v2h-2v-2h2z')
    } else {
      path.setAttribute('d', 'M20.285 6.709l-11.1 11.1-5.47-5.47 1.414-1.415 4.056 4.056 9.686-9.686 1.414 1.415z')
    }
    svg.appendChild(path)
    icon.appendChild(svg)
    const sep = document.createElement('span')
    sep.className = 'mini-sep'
    const text = document.createElement('span')
    text.className = 'mini-text'
    text.textContent = message
    body.appendChild(icon)
    body.appendChild(sep)
    body.appendChild(text)
    inner.appendChild(body)
    wrap.appendChild(inner)
    document.body.appendChild(wrap)
  } catch {}
}

// ----- Group Info Panel (bottom) -----
function updateGroupInfoPanel(root: HTMLElement, gid: string): void {
  const info = root.querySelector('#giInfo') as HTMLElement | null
  const body = root.querySelector('#giInfoBody') as HTMLElement | null
  const handle = root.querySelector('#giInfoHandle') as HTMLElement | null
  if (!info || !body || !handle) return
  // Hide for common area
  if (!gid || gid === 'area-common') { info.classList.add('hidden'); return }
  // Resolve group
  const me = (root as any)._me as { id?: number } | undefined
  const g = getGroupById(me?.id, gid)
  if (!g) { info.classList.add('hidden'); return }
  // Resolve projects in this group
  const all = ((root as any)._projectsList as Project[]) || []
  const map = getGroupMap(me?.id)
  const list = all.filter((p) => (map[String(p.id)] || 'user') === gid)
  // Build
  const head = `<div class=\"flex items-center justify-between\">
    <div class=\"text-[15px] font-semibold\">${escapeHtml(g.name)}</div>
    <div class=\"flex items-center gap-2\">
      <button id=\"giDelGroup\" class=\"rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-medium px-3 py-1\">グループ削除</button>
    </div>
  </div>`
  const projList = list.length
    ? list.map((p) => `<div class=\"flex items-center justify-between rounded bg-neutral-900/60 ring-2 ring-neutral-600 px-2 py-1\">
          <div class=\"truncate pr-2\">${escapeHtml(p.alias && p.alias.trim() ? p.alias : p.name)}</div>
          <button class=\"rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-medium px-2 py-0.5\" data-del-pid=\"${p.id}\" data-del-name=\"${escapeHtml(p.name)}\">削除</button>
        </div>`).join('')
    : '<div class="text-xs text-gray-400">このグループに所属するプロジェクトはありません。</div>'
  body.innerHTML = `${head}<div class="mt-2 space-y-2" id="giList">${projList}</div>`
  // Mild spacing polish for generated rows (increase internal padding)
  try {
    const listWrap = body.querySelector('#giList') as HTMLElement | null
    listWrap?.querySelectorAll(':scope > div')?.forEach((row) => {
      const el = row as HTMLElement
      el.classList.remove('px-2'); el.classList.remove('py-1')
      el.classList.add('px-3'); el.classList.add('py-1.5')
    })
  } catch {}
  // Animated collapse/expand (same behavior as widget info)
  const panelAny: any = info
  const cont = root.querySelector('#giInfoPanel') as HTMLElement | null
  info.classList.remove('hidden')
  const applyCollapsed = (on: boolean) => {
    try {
      if (!cont || !handle) return
      handle.setAttribute('aria-expanded', on ? 'false' : 'true')
      handle.title = on ? '展開' : 'しまう'
      // measure, then animate
      const h = cont.scrollHeight
      cont.style.maxHeight = h + 'px'
      void cont.offsetHeight
      if (on) {
        cont.style.maxHeight = '0px'
        cont.style.opacity = '0'
        cont.style.transform = 'translateY(8px)'
        cont.style.pointerEvents = 'none'
        info.setAttribute('data-collapsed', '1')
      } else {
        const target = cont.scrollHeight || 1
        cont.style.maxHeight = target + 'px'
        cont.style.opacity = '1'
        cont.style.transform = 'translateY(0)'
        cont.style.pointerEvents = ''
        info.removeAttribute('data-collapsed')
      }
      panelAny._giCollapsed = !!on
    } catch {}
  }
  if (!panelAny._giBound) {
    panelAny._giBound = true
    // initialize visual state once
    try { if (cont) { cont.style.maxHeight = '0px'; cont.style.opacity = '0'; cont.style.transform = 'translateY(8px)'; cont.style.pointerEvents = 'none' } } catch {}
    const initCollapsed = !!panelAny._giCollapsed
    requestAnimationFrame(() => applyCollapsed(initCollapsed))
    handle.addEventListener('click', (e) => { e.preventDefault(); applyCollapsed(!panelAny._giCollapsed) })
  } else {
    // preserve current state across updates
    applyCollapsed(!!panelAny._giCollapsed)
  }
  // (old toggle override removed; use unified applyCollapsed above)
  // Bind delete group
  const delGroupBtn = body.querySelector('#giDelGroup') as HTMLElement | null
  delGroupBtn?.addEventListener('click', () => openGroupDeleteConfirm(root, g))
  // Bind project deletes
  body.querySelectorAll('[data-del-pid]')?.forEach((btn) => {
    btn.addEventListener('click', () => {
      const pid = Number((btn as HTMLElement).getAttribute('data-del-pid') || '0')
      const name = String((btn as HTMLElement).getAttribute('data-del-name') || '')
      openProjectDeleteConfirm(root, pid, name)
    })
  })
}

function openProjectDeleteConfirm(root: HTMLElement, id: number, requiredName: string): void {
  const overlay = document.createElement('div')
  overlay.className = 'fixed inset-0 z-[70] bg-black/60 grid place-items-center'
  overlay.innerHTML = `
    <div class="relative w-[min(520px,92vw)] rounded-xl bg-neutral-900 ring-2 ring-neutral-600 shadow-2xl text-gray-100">
      <header class="h-10 flex items-center px-4 border-b border-neutral-600"><div class="font-semibold">プロジェクトを削除</div><button id="pdelClose" class="ml-auto text-xl">×</button></header>
      <div class="p-4 space-y-3">
        <p class="text-sm text-gray-300">削除するには <span class="px-2 py-0.5 rounded bg-neutral-800/70 ring-1 ring-neutral-600">${escapeHtml(requiredName) || '（名前未取得）'}</span> と入力してください。</p>
        <input id="pdelInput" class="w-full rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-2 text-gray-100" placeholder="プロジェクト名を入力" />
        <div class="flex justify-end gap-2 pt-2">
          <button id="pdelCancel" class="px-3 py-1.5 rounded bg-neutral-800/60 text-gray-200 text-sm">キャンセル</button>
          <button id="pdelOk" class="px-3 py-1.5 rounded bg-rose-700 text-white text-sm opacity-60 pointer-events-none">削除</button>
        </div>
      </div>
    </div>`
  const close = () => overlay.remove()
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#pdelClose')?.addEventListener('click', close)
  overlay.querySelector('#pdelCancel')?.addEventListener('click', close)
  const input = overlay.querySelector('#pdelInput') as HTMLInputElement
  const ok = overlay.querySelector('#pdelOk') as HTMLButtonElement
  const apply = () => { const match = input.value.trim() === requiredName && requiredName.length > 0; ok.style.opacity = match ? '1' : '0.6'; ok.style.pointerEvents = match ? 'auto' : 'none' }
  input.addEventListener('input', apply)
  ok.addEventListener('click', async () => {
    try {
      await apiFetch(`/projects/${id}`, { method: 'DELETE' })
      close()
      loadProjects(root)
      try { showMiniToastList('プロジェクトを削除しました', { variant: 'danger' }) } catch {}
    } catch { alert('削除に失敗しました') }
  })
  document.body.appendChild(overlay)
}

function openGroupDeleteConfirm(root: HTMLElement, g: Group): void {
  const overlay = document.createElement('div')
  overlay.className = 'fixed inset-0 z-[70] bg-black/60 grid place-items-center'
  overlay.innerHTML = `
    <div class="relative w-[min(520px,92vw)] rounded-xl bg-neutral-900 ring-2 ring-neutral-600 shadow-2xl text-gray-100">
      <header class="h-10 flex items-center px-4 border-b border-neutral-600"><div class="font-semibold">グループを削除</div><button id="gidelClose" class="ml-auto text-xl">×</button></header>
      <div class="p-4 space-y-3">
        <p class="text-sm text-gray-300">削除するには <span class="px-2 py-0.5 rounded bg-neutral-800/70 ring-1 ring-neutral-600">${escapeHtml(g.name)}</span> と入力してください。</p>
        <input id="gidelInput" class="w-full rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-2 text-gray-100" placeholder="グループ名を入力" />
        <div class="flex justify-end gap-2 pt-2">
          <button id="gidelCancel" class="px-3 py-1.5 rounded bg-neutral-800/60 text-gray-200 text-sm">キャンセル</button>
          <button id="gidelOk" class="px-3 py-1.5 rounded bg-rose-700 text-white text-sm opacity-60 pointer-events-none">削除</button>
        </div>
      </div>
    </div>`
  const close = () => overlay.remove()
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#gidelClose')?.addEventListener('click', close)
  overlay.querySelector('#gidelCancel')?.addEventListener('click', close)
  const input = overlay.querySelector('#gidelInput') as HTMLInputElement
  const ok = overlay.querySelector('#gidelOk') as HTMLButtonElement
  const apply = () => { const match = input.value.trim() === g.name; ok.style.opacity = match ? '1' : '0.6'; ok.style.pointerEvents = match ? 'auto' : 'none' }
  input.addEventListener('input', apply)
  ok.addEventListener('click', () => {
    const me = (root as any)._me as { id?: number } | undefined
    deleteGroup(me?.id, g.id)
    close()
    renderGroupQuickbar(root, (root as any)._me)
    loadProjects(root)
    try { (root.querySelector('#hxwInfo') as HTMLElement | null)?.classList.add('hidden') } catch {}
    try { showMiniToastList('グループを削除しました', { variant: 'danger' }) } catch {}
  })
  document.body.appendChild(overlay)
}

function drawMiniMap(wrap: HTMLElement, st: HexLayout): void {
  const cvs = document.getElementById('hxMini') as HTMLCanvasElement | null
  if (!cvs) return
  const ctx = cvs.getContext('2d')
  if (!ctx) return
  const W = cvs.width, H = cvs.height
  ctx.clearRect(0, 0, W, H)
  // Clip to circle
  ctx.save()
  ctx.beginPath(); ctx.arc(W/2, H/2, Math.min(W,H)/2 - 4, 0, Math.PI*2); ctx.clip()
  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0,0,W,H)
  // Scale so circleはしっかり埋まる（少し大きめ）
  const pad = 2
  const sx = (W - pad*2) / (st.width || 1)
  const sy = (H - pad*2) / (st.height || 1)
  const s = Math.max(sx, sy) * 1.15
  // 現在ビューポート中心座標
  const vx = (-st.offsetX) / st.scale
  const vy = (-st.offsetY) / st.scale
  const vw = wrap.clientWidth / st.scale
  const vh = wrap.clientHeight / st.scale
  const cxView = vx + vw / 2
  const cyView = vy + vh / 2
  // その中心がミニマップ円の中心に来るよう移動
  const ox = W/2 - cxView * s
  const oy = H/2 - cyView * s
  // Draw groups centers
  // Draw hex tiles (overview)
  const t = st.tile || 220
  const hw = t * 0.25 * s, hh = (t * 0.866) * s
  const drawHex = (x: number, y: number, fill: string) => {
    ctx.beginPath()
    const px = ox + x * s, py = oy + y * s
    ctx.moveTo(px + hw, py)
    ctx.lineTo(px + hw*3, py)
    ctx.lineTo(px + hw*4, py + hh/2)
    ctx.lineTo(px + hw*3, py + hh)
    ctx.lineTo(px + hw, py + hh)
    ctx.lineTo(px + 0, py + hh/2)
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
  }
  const isLight = (document.documentElement.getAttribute('data-theme') || 'dark') !== 'dark'
  const emptyFill = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
  const colorFor = (key?: any) => {
    if (!key) return emptyFill
    const alpha = isLight ? 0.42 : 0.38
    switch (key) {
      case 'red': return `rgba(239, 68, 68, ${alpha})`
      case 'green': return `rgba(16, 185, 129, ${alpha})`
      case 'purple': return `rgba(168, 85, 247, ${alpha})`
      case 'orange': return `rgba(251, 146, 60, ${alpha})`
      case 'yellow': return `rgba(234, 179, 8, ${alpha})`
      case 'gray': return isLight ? 'rgba(120,120,128,0.38)' : 'rgba(120,120,128,0.35)'
      case 'black': return isLight ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.55)'
      case 'white': return isLight ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.10)'
      default: return `rgba(59, 130, 246, ${alpha})`
    }
  }
  const nodes = st.nodes || []
  for (const n of nodes) drawHex(n.x, n.y, colorFor((n as any).color))
  ctx.restore()
}

function bindHoneyInteractions(root: HTMLElement, wrap: HTMLElement, canvas: HTMLElement, st: HexLayout): void {
  if ((wrap as any)._bound) return
  (wrap as any)._bound = true
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
  const Z_MAX = 2.4
  const getMin = () => Math.max(st.minScale || 0.5, 0.4)
  let dragging = false, sx = 0, sy = 0, sox = 0, soy = 0, activePid: number | null = null
  const DRAG_TOL = 4
  // Zoom keeping the world point under (clientX, clientY) fixed
  const zoomAt = (clientX: number, clientY: number, nextScale: number) => {
    const ns = clamp(nextScale, getMin(), Z_MAX)
    const rect = wrap.getBoundingClientRect()
    const prev = st.scale
    const cx = clientX - rect.left
    const cy = clientY - rect.top
    const wx = (cx - st.offsetX) / prev
    const wy = (cy - st.offsetY) / prev
    st.scale = ns
    st.offsetX = cx - wx * ns
    st.offsetY = cy - wy * ns
    applyHexTransform(wrap, canvas, st)
  }
  wrap.addEventListener('pointerdown', (e) => {
    activePid = e.pointerId
    dragging = false
    sx = e.clientX; sy = e.clientY; sox = st.offsetX; soy = st.offsetY
  })
  window.addEventListener('pointerup', (e) => { if (activePid === null || e.pointerId === activePid) { dragging = false; activePid = null; sx = 0; sy = 0 } })
  window.addEventListener('pointermove', (e) => {
    if (activePid === null || e.pointerId !== activePid) return
    // if no button pressed and not already dragging, ignore plain cursor moves
    if ((e.buttons === 0) && !dragging) return
    const dx = e.clientX - sx, dy = e.clientY - sy
    if (!dragging && Math.hypot(dx, dy) > DRAG_TOL) dragging = true
    if (!dragging) return
    st.offsetX = sox + dx; st.offsetY = soy + dy; applyHexTransform(wrap, canvas, st)
  })
  wrap.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault()
      const prev = st.scale
      // Match detail view 2D zoom sensitivity
      const ds = Math.exp(-e.deltaY * 0.0055)
      zoomAt(e.clientX, e.clientY, prev * ds)
    } else {
      // two-finger pan on trackpad
      e.preventDefault()
      st.offsetX -= e.deltaX
      st.offsetY -= e.deltaY
      applyHexTransform(wrap, canvas, st)
    }
  }, { passive: false })
  // basic pinch-zoom (two pointers)
  const pts = new Map<number, { x: number; y: number }>()
  const dist = () => {
    const a = Array.from(pts.values())
    if (a.length < 2) return 0
    const dx = a[0].x - a[1].x, dy = a[0].y - a[1].y
    return Math.hypot(dx, dy)
  }
  let startDist = 0, startScale = st.scale
  wrap.addEventListener('pointerdown', (e) => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }) })
  wrap.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.size === 2) {
      const d = dist()
      if (startDist === 0) { startDist = d; startScale = st.scale }
      if (d > 0 && startDist > 0) {
        // Match detail view 2D pinch sensitivity
        const s = Math.pow(d / startDist, 1.9)
        // Zoom around pinch midpoint
        const a = Array.from(pts.values())
        const midX = (a[0].x + a[1].x) / 2
        const midY = (a[0].y + a[1].y) / 2
        zoomAt(midX, midY, startScale * s)
      }
    }
  })
  window.addEventListener('pointerup', (e) => { pts.delete(e.pointerId); if (pts.size < 2) startDist = 0 })
  // No toolbar buttons (zoom handled by pinch/gesture)
  ; (wrap as any)._hx = st
  // Update minimap on resize as well
  window.addEventListener('resize', () => applyHexTransform(wrap, canvas, st))
}

// ----- Progress Overlay for Project Creation -----
function openCreateProgress(msg: string) {
  // 既存オーバーレイを閉じる
  document.getElementById('pjProgress')?.remove()
  const overlay = document.createElement('div')
  overlay.id = 'pjProgress'
  // フルスクリーンで中央にシンプル表示
  overlay.className = 'fixed inset-0 z-[70] bg-black/60 grid place-items-center'
  overlay.innerHTML = `
    <div class="flex flex-col items-center gap-4 text-gray-100 select-none">
      <div id="pjProgMsg" class="text-xl md:text-2xl tracking-wide">${msg}</div>
      <div id="pjProgError" class="hidden text-rose-400 text-sm"></div>
      <button id="pjProgClose" class="hidden mt-4 rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-1.5 text-gray-200">閉じる</button>
    </div>
  `
  document.body.appendChild(overlay)
  ;(function () {
    const c = +(document.body.getAttribute('data-lock') || '0')
    if (c === 0) { document.body.style.overflow = 'hidden' }
    document.body.setAttribute('data-lock', String(c + 1))
  })()
  const set = (text: string) => {
    const el = overlay.querySelector('#pjProgMsg') as HTMLElement | null
    if (el) el.textContent = text
  }
  const unlockBody = () => {
    const c = +(document.body.getAttribute('data-lock') || '0')
    const n = Math.max(0, c - 1)
    if (n === 0) { document.body.style.overflow = '' }
    document.body.setAttribute('data-lock', String(n))
  }
  const showError = (text: string) => {
    const err = overlay.querySelector('#pjProgError') as HTMLElement | null
    if (err) { err.textContent = text; err.classList.remove('hidden') }
    const closeBtn = overlay.querySelector('#pjProgClose') as HTMLElement | null
    if (closeBtn) {
      closeBtn.classList.remove('hidden')
      closeBtn.addEventListener('click', () => { overlay.remove(); unlockBody() })
    }
  }
  const showSuccess = (id?: number) => {
    set('プロジェクトの準備が完了しました。')
    // 作成完了後は自動で該当プロジェクトを開く
    if (id) {
      try { window.location.hash = `#/project/detail?id=${id}` } catch {}
    }
    // すぐに閉じる（遷移中の背景ロック解除）
    overlay.remove(); unlockBody()
  }
  // 互換のため残す（何もしない）
  const updateFromMeta = (_meta: any) => { /* no-op for simplified UI */ }
  return { set, showError, showSuccess, updateFromMeta, close: () => { overlay.remove(); unlockBody() } }
}

function loadProjects(root: HTMLElement): void {
  apiFetch<any[]>('/projects')
    .then((list) => {
      const toCard = (p: any): Project => ({
        id: p.id,
        name: (p.name ?? '').toString().trim(),
        alias: ((p.github_meta && p.github_meta.ui && p.github_meta.ui.alias) || p.alias || '').toString(),
        start: p.start_date || p.start || undefined,
        end: p.end_date || p.end || undefined,
        color: ((p.github_meta && p.github_meta.ui && p.github_meta.ui.color) || (p.ui && p.ui.color) || 'blue'),
      })
      // filter minimal invalids and render
      const all = list
        .filter((p) => p && typeof p === 'object' && Number(p.id) > 0 && (p.name ?? '').toString().trim().length > 0)
      const items = all.map(toCard)
      // Cache snapshot (best-effort) but do not use cache for rendering to avoid showing non-existent projects
      try { localStorage.setItem('projects-cache', JSON.stringify(items)) } catch {}
      // Cache for group-info usage
      try { (root as any)._projectsList = items } catch {}
      renderHoneycomb(root, items)
    })
    .catch(() => {
      // On failure, render empty state (do not use stale cache to avoid 404-on-click)
      renderHoneycomb(root, [])
    })
}

function bindGridInteractions(root: HTMLElement): void {
  const grid = root.querySelector('#projectGrid') as HTMLElement | null
  if (!grid) return
  // card click + menu
  grid.querySelectorAll('[data-id]')?.forEach((el) => {
    // Light prefetch on hover/touch
    const idAttr = (el as HTMLElement).getAttribute('data-id')
    if (idAttr) {
      const pid = Number(idAttr)
      el.addEventListener('mouseenter', () => { try { prefetchProjectDetail(pid) } catch {} })
      el.addEventListener('touchstart', () => { try { prefetchProjectDetail(pid) } catch {} }, { passive: true })
      // Deep prefetch as soon as selection starts
      el.addEventListener('pointerdown', () => { try { prefetchProjectDetailDeep(pid) } catch {} }, { once: true })
    }
    el.addEventListener('click', () => {
      try { document.querySelectorAll('#giInfo').forEach((n)=> (n as HTMLElement).remove()) } catch {}
      const id = (el as HTMLElement).getAttribute('data-id')
      if (id) {
        try { sessionStorage.setItem('proj-entry-dir', 'right') } catch {}
        window.location.hash = `#/project/detail?id=${encodeURIComponent(id)}`
      }
    })
    // right-click context menu
    el.addEventListener('contextmenu', (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      const id = (el as HTMLElement).getAttribute('data-id')
      if (id) openCardMenu(root, el as HTMLElement, Number(id))
    })
      ; (el as HTMLElement).querySelector('.card-menu')?.addEventListener('click', (ev) => {
        ev.stopPropagation()
        const id = (el as HTMLElement).getAttribute('data-id')
        if (id) openCardMenu(root, el as HTMLElement, Number(id))
      })
  })
  // create card
  const openCreate = () => openCreateProjectModal(root)
  grid.querySelector('#createCard')?.addEventListener('click', openCreate)
  removeEmptyCards(grid)
  sanitizeProjectGrid(grid)
}

function removeEmptyCards(root: HTMLElement): void {
  const cards = Array.from(root.querySelectorAll('[data-id]')) as HTMLElement[]
  cards.forEach((card) => {
    const titleEl = card.querySelector('.text-base') as HTMLElement | null
    const dateEl = card.querySelector('.mt-2') as HTMLElement | null
    const title = titleEl?.textContent?.trim() || ''
    // remove if title/date missing (invalid card) or extremely short
    if (!titleEl || !dateEl || !title) {
      card.remove()
      return
    }
  })
}

function sanitizeProjectGrid(grid: HTMLElement): void {
  // Remove any rogue card-menu buttons or unexpected children without data-id
  grid.querySelectorAll('.card-menu').forEach((btn) => {
    const host = (btn as HTMLElement).closest('[data-id]')
    if (!host) (btn as HTMLElement).remove()
  })
  Array.from(grid.children).forEach((child) => {
    const el = child as HTMLElement
    if (el.id === 'createCard') return
    if (el.getAttribute('data-id')) return
    // Unknown element inside grid -> drop
    el.remove()
  })
}

// ---------- Groups (client-side) ----------
type Group = { id: string; name: string; avatar?: string }

function groupsKey(uid?: number): string { return `groups-${uid ?? 'guest'}` }
function groupMapKey(uid?: number): string { return `groupMap-${uid ?? 'guest'}` }
function groupSelectedKey(uid?: number): string { return `groupSelected-${uid ?? 'guest'}` }
function userNameKey(uid?: number): string { return `userName-${uid ?? 'guest'}` }

function getGroups(uid?: number): Group[] {
  try {
    const raw = localStorage.getItem(groupsKey(uid))
    const arr = raw ? (JSON.parse(raw) as Group[]) : []
    return arr
  } catch { return [] }
}

function saveGroups(uid: number | undefined, list: Group[]): void {
  localStorage.setItem(groupsKey(uid), JSON.stringify(list))
}

function getGroupMap(uid?: number): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(groupMapKey(uid)) || '{}') as Record<string, string> } catch { return {} }
}

function setGroupMap(uid: number | undefined, map: Record<string, string>): void {
  localStorage.setItem(groupMapKey(uid), JSON.stringify(map))
}

function getSelectedGroup(uid?: number): string | null {
  return localStorage.getItem(groupSelectedKey(uid))
}

function setSelectedGroup(uid: number | undefined, id: string): void {
  localStorage.setItem(groupSelectedKey(uid), id)
}

function ensureDefaultGroups(uid?: number, avatar?: string): Group[] {
  let list = getGroups(uid)
  const hasUser = list.some((g) => g.id === 'user')
  if (!hasUser) {
    // Default name will be replaced by stored user name if available
    const fallback = 'マイグループ'
    let uname = fallback
    try { const s = localStorage.getItem(userNameKey(uid)); if (s && s.trim()) uname = s } catch {}
    list = [{ id: 'user', name: uname, avatar }, ...list]
    saveGroups(uid, list)
  }
  // Keep user group name in sync with stored user name (first-time rename)
  try {
    const s = localStorage.getItem(userNameKey(uid))
    if (s && s.trim()) {
      const idx = list.findIndex((g) => g.id === 'user')
      if (idx >= 0 && list[idx].name !== s) {
        list[idx] = { ...list[idx], name: s }
        saveGroups(uid, list)
      }
    }
  } catch {}
  return list
}

// Groups used for honeycomb layout and color mapping (includes the common feature area)
function layoutGroups(uid?: number, avatar?: string): Group[] {
  const base = ensureDefaultGroups(uid, avatar)
  // Friendly common hub name
  return [{ id: 'area-common', name: '共有スペース' } as Group].concat(base)
}

function renderGroupSidebar(root: HTMLElement, me: { id?: number; github_id?: number }): void {
  const sidebar = root.querySelector('#groupSidebar') as HTMLElement | null
  if (!sidebar) return
  // clear circles except create button
  const createBtn = sidebar.querySelector('#sidebar-create') as HTMLElement | null
  sidebar.querySelectorAll('[data-group]').forEach((el) => el.remove())

  const avatar = me.github_id ? `https://avatars.githubusercontent.com/u/${me.github_id}?s=64` : undefined
  const groups = ensureDefaultGroups(me.id, avatar)
  const selected = getSelectedGroup(me.id) || 'user'
  setSelectedGroup(me.id, selected)
  const getActive = () => host.querySelector('.gq-active') as HTMLElement | null
  const suppressActiveFor = (el: HTMLElement) => {
    const act = getActive()
    if (act && act !== el) act.classList.add('gq-suppressed')
  }
  const unsuppressActiveFor = (el: HTMLElement) => {
    const act = getActive()
    if (act && act !== el) act.classList.remove('gq-suppressed')
  }

  groups.forEach((g, idx) => {
    const el = document.createElement('button')
    el.setAttribute('data-group', g.id)
    el.className = `w-10 h-10 rounded-full ${selected === g.id ? 'ring-2 ring-sky-500' : 'ring-2 ring-neutral-600'} overflow-hidden bg-neutral-700 grid place-items-center`
    if (g.avatar && idx === 0) {
      el.innerHTML = `<img src="${g.avatar}" class="w-full h-full object-cover" alt="avatar"/>`
    } else {
      el.textContent = g.name.charAt(0)
      el.classList.add('text-white')
    }
    el.addEventListener('click', () => {
      setSelectedGroup(me.id, g.id)
      renderGroupSidebar(root, me)
      updateListTitle(root, (root as any)._me)
      centerOnGroup(root, g.id, true)
    })
    // 右クリックでメニュー（削除など）
    el.addEventListener('contextmenu', (ev) => {
      ev.preventDefault()
      openGroupMenu(root, me, g, el)
    })
    sidebar.insertBefore(el, createBtn)
  })

  createBtn?.addEventListener('click', () => openCreateGroupPopover(root, me))
}

function renderGroupQuickbar(root: HTMLElement, me: { id?: number; github_id?: number }): void {
  const host = root.querySelector('#groupQuick') as HTMLElement | null
  if (!host) return
  host.innerHTML = ''
  const avatar = me.github_id ? `https://avatars.githubusercontent.com/u/${me.github_id}?s=64` : undefined
  const groups = ensureDefaultGroups(me.id, avatar)
  const mapGroups = layoutGroups(me.id, avatar)
  const selected = getSelectedGroup(me.id) || 'user'
  setSelectedGroup(me.id, selected)
  const makeBtn = (g: Group, idx: number) => {
    const el = document.createElement('button')
    el.setAttribute('data-group', g.id)
    el.className = `gq-icon ${selected === g.id ? 'gq-active ring-2 ring-sky-500' : 'ring-2 ring-neutral-600'} overflow-hidden grid place-items-center rounded-full text-base`
    el.style.zIndex = selected === g.id ? '9000' : String(100 + idx)
    try {
      const gcol = colorForGroupId(mapGroups as any, g.id)
      // Apply solid background to non-avatar icons
      if (!(g.avatar && idx === 0)) {
        el.textContent = g.name.charAt(0)
        el.style.background = groupSolid(gcol)
        const darkText = (gcol === 'yellow' || gcol === 'white' || gcol === 'gray')
        el.style.color = darkText ? '#111' : '#fff'
      } else {
        el.innerHTML = `<img src="${g.avatar}" class="w-full h-full object-cover" alt="avatar"/>`
      }
      // Match ring color to area color using Tailwind ring var
      const ring = ((): string => {
        switch (gcol) {
          case 'red': return 'rgb(239,68,68)'
          case 'green': return 'rgb(16,185,129)'
          case 'purple': return 'rgb(168,85,247)'
          case 'orange': return 'rgb(251,146,60)'
          case 'yellow': return 'rgb(234,179,8)'
          case 'gray': return 'rgb(120,120,128)'
          case 'black': return 'rgb(0,0,0)'
          case 'white': return 'rgb(255,255,255)'
          default: return 'rgb(59,130,246)'
        }
      })()
      el.style.setProperty('--tw-ring-color', ring)
    } catch {
      if (!(g.avatar && idx === 0)) { el.textContent = g.name.charAt(0); el.style.background = 'var(--gh-canvas-subtle)'; el.style.color = '#fff' }
    }
    el.title = g.name
    // Hover: bring to front and enlarge; suppress active (only if different icon)
    el.addEventListener('mouseenter', () => { el.classList.add('gq-hover'); el.style.zIndex = '11000'; suppressActiveFor(el) })
    el.addEventListener('mouseleave', () => { el.classList.remove('gq-hover'); el.style.zIndex = (selected === g.id) ? '9000' : String(100 + idx); unsuppressActiveFor(el) })
    el.addEventListener('click', () => {
      setSelectedGroup(me.id, g.id)
      renderGroupQuickbar(root, me)
      updateListTitle(root, (root as any)._me)
      centerOnGroup(root, g.id, true)
    })
    // 右クリックでグループメニュー（削除など）
    el.addEventListener('contextmenu', (ev) => {
      ev.preventDefault()
      openGroupMenu(root, me, g, el)
    })
    return el
  }
  groups.forEach((g, idx) => host.appendChild(makeBtn(g, idx)))
  // Add group add-circle as the last overlapped icon
  const plus = document.createElement('button')
  plus.id = 'groupAddCircle'
  plus.className = 'gq-icon ring-2 ring-neutral-600 overflow-hidden bg-neutral-800/80 grid place-items-center rounded-full text-2xl text-gray-100 hover:text-white'
  // rely on CSS for overlapped margin
  plus.style.zIndex = String(100 + groups.length)
  plus.textContent = '＋'
  plus.title = 'グループ追加'
  plus.addEventListener('mouseenter', () => { plus.classList.add('gq-hover'); plus.style.zIndex = '11000'; suppressActiveFor(plus) })
  plus.addEventListener('mouseleave', () => { plus.classList.remove('gq-hover'); plus.style.zIndex = String(100 + groups.length); unsuppressActiveFor(plus) })
  plus.addEventListener('click', () => openCreateGroupPopover(root, me))
  host.appendChild(plus)
}

function getGroupById(uid: number | undefined, id: string | null): Group | null {
  if (!id) return null
  return getGroups(uid).find((g) => g.id === id) || null
}

function centerOnGroup(root: HTMLElement, gid: string, animate = false): void {
  const wrap = root.querySelector('#honeyWrap') as HTMLElement | null
  const canvas = root.querySelector('#honeyCanvas') as HTMLElement | null
  if (!wrap || !canvas) return
  const st: HexLayout = (wrap as any)._hx || ({} as HexLayout)
  if (!st.centers || !st.centers[gid]) return
  const c = st.centers[gid]
  const tx = Math.floor(wrap.clientWidth / 2 - c.x * st.scale)
  const ty = Math.floor(wrap.clientHeight / 2 - c.y * st.scale)
  if (!animate) {
    st.offsetX = tx; st.offsetY = ty; applyHexTransform(wrap, canvas, st); return
  }
  const sx = st.offsetX, sy = st.offsetY
  const dur = 250
  const start = performance.now()
  const ease = (t: number) => 1 - Math.pow(1 - t, 3)
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / dur)
    st.offsetX = sx + (tx - sx) * ease(p)
    st.offsetY = sy + (ty - sy) * ease(p)
    applyHexTransform(wrap, canvas, st)
    if (p < 1) requestAnimationFrame(step)
    else try { showGroupLocationToast(gid, st.uid) } catch {}
  }
  requestAnimationFrame(step)
}

function updateListTitle(root: HTMLElement, me: { id?: number; name?: string }): void {
  const title = root.querySelector('#userTitle') as HTMLElement | null
  if (!title) return
  const sel = getSelectedGroup(me.id)
  if (!sel || sel === 'all' || sel === 'user') {
    title.textContent = me.name ? `${me.name}のプロジェクト` : 'プロジェクト'
    return
  }
  const g = getGroupById(me.id, sel)
  title.textContent = g?.name ? `${g.name}のプロジェクト` : (me.name ? `${me.name}のプロジェクト` : 'プロジェクト')
}

function openGroupMenu(root: HTMLElement, me: { id?: number }, g: Group, anchor: HTMLElement): void {
  // デフォルトグループ(user)は削除不可
  const rect = anchor.getBoundingClientRect()
  const menu = document.createElement('div')
  menu.className = 'fixed z-[62] w-40 rounded-md bg-neutral-900 ring-2 ring-neutral-600 shadow-xl text-sm text-gray-200'
  menu.style.top = `${rect.bottom + 6}px`
  menu.style.left = `${rect.left - 20}px`
  menu.innerHTML = `
    <div class="px-3 py-2 text-xs text-gray-400">${g.name}</div>
    ${g.id !== 'user' ? '<button id="gdel" class="w-full text-left px-3 py-2 hover:bg-neutral-800 text-rose-400">削除</button>' : '<div class="px-3 py-2 text-xs text-gray-500">マイグループ</div>'}
  `
  const close = () => menu.remove()
  const onDoc = (e: MouseEvent) => { if (!menu.contains(e.target as Node)) { close(); document.removeEventListener('click', onDoc) } }
  setTimeout(() => document.addEventListener('click', onDoc), 0)
  document.body.appendChild(menu)
  menu.querySelector('#gdel')?.addEventListener('click', () => {
    const overlay = document.createElement('div')
    overlay.className = 'fixed inset-0 z-[70] bg-black/60 grid place-items-center'
    overlay.innerHTML = `
      <div class="relative w-[min(520px,92vw)] rounded-xl bg-neutral-900 ring-2 ring-neutral-600 shadow-2xl text-gray-100">
        <header class="h-10 flex items-center px-4 border-b border-neutral-600"><div class="font-semibold">グループを削除</div><button id="gdelClose" class="ml-auto text-xl">×</button></header>
        <div class="p-4 space-y-3">
          <p class="text-sm text-gray-300">削除するには <span class="px-2 py-0.5 rounded bg-neutral-800/70 ring-1 ring-neutral-600">${g.name}</span> と入力してください。</p>
          <input id="gdelInput" class="w-full rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-2 text-gray-100" placeholder="グループ名を入力" />
          <div class="flex justify-end gap-2 pt-2">
            <button id="gdelCancel" class="px-3 py-1.5 rounded bg-neutral-800/60 text-gray-200 text-sm">キャンセル</button>
            <button id="gdelOk" class="px-3 py-1.5 rounded bg-rose-700 text-white text-sm opacity-60 pointer-events-none">削除</button>
          </div>
        </div>
      </div>
    `
    const closeModal = () => overlay.remove()
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal() })
    overlay.querySelector('#gdelClose')?.addEventListener('click', closeModal)
    overlay.querySelector('#gdelCancel')?.addEventListener('click', closeModal)
    const input = overlay.querySelector('#gdelInput') as HTMLInputElement
    const okBtn = overlay.querySelector('#gdelOk') as HTMLButtonElement
    const applyState = () => {
      const match = input.value.trim() === g.name
      okBtn.style.opacity = match ? '1' : '0.6'
      okBtn.style.pointerEvents = match ? 'auto' : 'none'
    }
    input.addEventListener('input', applyState)
    okBtn.addEventListener('click', () => {
      deleteGroup(me.id, g.id)
      renderGroupQuickbar(root, (root as any)._me)
      loadProjects(root)
      closeModal()
      close()
      try { showMiniToastList('グループを削除しました', { variant: 'danger' }) } catch {}
    })
    document.body.appendChild(overlay)
  })
}

function deleteGroup(uid: number | undefined, gid: string): void {
  // グループ一覧から削除
  const list = getGroups(uid).filter((x) => x.id !== gid)
  saveGroups(uid, list)
  // 割当マップをuserに移す
  const map = getGroupMap(uid)
  Object.keys(map).forEach((pid) => { if (map[pid] === gid) map[pid] = 'user' })
  setGroupMap(uid, map)
  // 選択中が削除されたらuserに戻す
  if (getSelectedGroup(uid) === gid) setSelectedGroup(uid, 'user')
}

function openCreateGroupPopover(root: HTMLElement, me: { id?: number }): void {
  const anchor = (root.querySelector('#groupAddCircle') as HTMLElement) || document.body
  const rect = anchor.getBoundingClientRect()
  const pop = document.createElement('div')
  pop.className = 'fixed z-[60] w-64 rounded-lg bg-neutral-900 ring-2 ring-neutral-600 shadow-xl'
  pop.style.top = `${rect.top + rect.height + 8}px`
  // 画面内に収まるように位置を調整（左右のはみ出し防止）
  const desired = rect.left
  const maxLeft = window.innerWidth - 276 // 16rem(=256px) + 20pxマージン
  const left = Math.min(maxLeft, Math.max(12, desired))
  pop.style.left = `${left}px`
  pop.innerHTML = `
    <div class="p-3">
      <div class="text-sm text-gray-300 mb-2">新しいグループ</div>
      <input id="gname" class="w-full rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-2 text-gray-100" placeholder="グループ名" />
      <div class="mt-3 flex justify-end gap-2">
        <button id="gcancel" class="px-3 py-1 rounded bg-neutral-800/60 text-gray-200 text-sm">キャンセル</button>
        <button id="gcreate" class="px-3 py-1 rounded bg-emerald-700 text-white text-sm">作成</button>
      </div>
    </div>
  `
  const close = () => pop.remove()
  setTimeout(() => document.addEventListener('click', (e) => { if (!pop.contains(e.target as Node)) close() }, { once: true }), 0)
  document.body.appendChild(pop)
  const input = pop.querySelector('#gname') as HTMLInputElement
  input.focus()
  pop.querySelector('#gcancel')?.addEventListener('click', close)
  pop.querySelector('#gcreate')?.addEventListener('click', () => {
    const name = input.value.trim()
    if (!name) return
    const list = getGroups(me.id)
    const id = `grp-${Date.now()}`
    list.push({ id, name })
    saveGroups(me.id, list)
    setSelectedGroup(me.id, id)
    // Prepare centering and success toast after reload
    try { sessionStorage.setItem('proj-center-gid', id) } catch {}
    try { sessionStorage.setItem('proj-center-anim', '1') } catch {}
    try { sessionStorage.setItem('group-just-created', '1') } catch {}
    // Force next render to run initial centering again
    try { const wrap = root.querySelector('#honeyWrap') as HTMLElement | null; if (wrap && (wrap as any)._hx) (wrap as any)._hx.inited = false } catch {}
    renderGroupQuickbar(root, (root as any)._me)
    loadProjects(root)
    close()
  })
}

// (card menu enhancement is injected inside the original openCardMenu below)

// Inline SVG icons for account modal tabs
const ICON_USER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="currentColor" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.87 0-7 3.13-7 7h14c0-3.87-3.13-7-7-7z"/></svg>'
function tintHex(hex, pct = 0.2) {
  const m = (hex || '').trim().match(/^#?([0-9a-fA-F]{6})$/)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  r = Math.min(255, Math.round(r + (255 - r) * pct))
  g = Math.min(255, Math.round(g + (255 - g) * pct))
  b = Math.min(255, Math.round(b + (255 - b) * pct))
  return `rgb(${r}, ${g}, ${b})`
}
const ICON_BELL = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="currentColor" aria-hidden="true"><path d="M12 22a2 2 0 002-2h-4a2 2 0 002 2zm6-6v-5a6 6 0 00-4.5-5.82V4a1.5 1.5 0 10-3 0v1.18A6 6 0 006 11v5l-2 2v1h16v-1l-2-2z"/></svg>'
const ICON_PALETTE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 100 18h1a2 2 0 002-2 2 2 0 012-2h1a4 4 0 100-8h-1a1 1 0 01-1-1 4 4 0 00-4-4zm-5.5 8A1.5 1.5 0 118 9.5 1.5 1.5 0 016.5 11zm3 3A1.5 1.5 0 1111 12.5 1.5 1.5 0 019.5 14zm5-6A1.5 1.5 0 1116 6.5 1.5 1.5 0 0114.5 8zm2 4A1.5 1.5 0 1118 10.5 1.5 1.5 0 0116.5 12z"/></svg>'

function openAccountModal(root: HTMLElement): void {
  const me = (root as any)._me as { name?: string; email?: string; github_id?: number } | undefined
  const avatarUrl = me?.github_id ? `https://avatars.githubusercontent.com/u/${me.github_id}?s=128` : ''

  const overlay = document.createElement('div')
  overlay.id = 'accountOverlay'
  overlay.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] grid justify-center items-start pt-16 sm:pt-20 px-4 fade-overlay'
  overlay.innerHTML = `
    <div class="relative w-[min(960px,92vw)] h-[74vh] max-h-[80vh] overflow-visible rounded-xl bg-neutral-900 ring-2 ring-neutral-600 shadow-2xl text-gray-100 pop-modal">
      <!-- Accent bar across top (color changes per tab) -->
      <div id="acctAccent" class="absolute left-0 right-0 rounded-t-xl z-10 pointer-events-none" style="height:12px; top:-8px; background-color: transparent;"></div>
      <!-- Floating top icon tabs -->
      <div id="acctTabs" class="absolute left-6 z-30 flex gap-0 items-end relative" style="top:-56px;">
        <button data-tab="basic" data-name="基本情報" data-accent="#3b82f6" class="tab-btn acct-tab grid place-items-center rounded-t-[18px] text-white" style="background-color:#3b82f6; width:80px; height:48px;">
          ${ICON_USER}
        </button>
        <button data-tab="notify" data-name="通知設定" data-accent="#ef4444" class="tab-btn acct-tab grid place-items-center rounded-t-[18px] text-white ml-[-2px]" style="background-color:#ef4444; width:80px; height:48px;">
          ${ICON_BELL}
        </button>
        <button data-tab="theme" data-name="着せ替え" data-accent="#8b5cf6" class="tab-btn acct-tab grid place-items-center rounded-t-[18px] text-white ml-[-2px]" style="background-color:#8b5cf6; width:80px; height:48px;">
          ${ICON_PALETTE}
        </button>
        <!-- Floating label under active tab -->
        <div id="acctTabLabel" class="absolute pointer-events-none text-[13px] font-semibold text-white text-center rounded-b-md shadow z-30" style="left:0; transform: translateX(-50%); padding:8px 14px; min-width:110px; background-color:#3b82f6;">
          <span id="acctTabLabelText">基本情報</span>
        </div>
      </div>
      <div class="flex items-center h-12 px-5">
        <button id="accountClose" class="ml-auto text-2xl text-neutral-300 hover:text-white">×</button>
      </div>
      <div>
        <section class="p-6 space-y-6 overflow-y-auto h-[calc(74vh-3rem)]">
          <div class="tab-panel" data-tab="basic">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-full overflow-hidden bg-neutral-700 ring-2 ring-neutral-600">
                ${avatarUrl ? `<img src="${avatarUrl}" class="w-full h-full object-cover"/>` : ''}
              </div>
              <div>
                <div class="text-sm text-gray-400">連携中のGitHubアカウント</div>
                <div class="text-base">${me?.name ?? 'ゲスト'}</div>
              </div>
              <button id="logoutBtn" class="ml-auto inline-flex items-center rounded-md bg-rose-700 hover:bg-rose-600 text-white text-sm font-medium px-3 py-1.5">ログアウト</button>
            </div>

            <hr class="my-6 border-neutral-600"/>

            <h4 class="text-base font-medium">ユーザー設定</h4>

            <div class="space-y-6">
              ${renderSkillSection('owned', '所有スキル一覧', (root as any)._me?.id)}
              ${renderSkillSection('want', '希望スキル一覧', (root as any)._me?.id)}
            </div>
          </div>
          <div class="tab-panel hidden" data-tab="notify">
            <div class="mb-6 p-4 rounded-lg ring-2 ring-neutral-600 bg-neutral-900/60">
              <p class="text-gray-300">Slackと連携することで、アクティビティをSlack通知で受け取ることができるようになります。</p>
              <div class="mt-3">
                <button class="inline-flex items-center gap-2 rounded-md px-4 py-2 text-white font-medium bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:brightness-110">
                  <span class="inline-block w-5 h-5 rounded bg-white"></span>
                  <span>slack と連携する</span>
                </button>
              </div>
            </div>

            <section class="space-y-3">
              <h4 class="text-base font-medium">通知のタイミング</h4>
              <div class="divide-y divide-neutral-600 ring-2 ring-neutral-600 rounded-lg overflow-hidden">
                ${notifyRow('レビュアーに割り当てられた時')}
                ${notifyRow('新しいタスクが割り当てられた時')}
                ${notifyRow('担当タスクの期日が近くなった時', '<span class="ml-2 text-xs rounded-md bg-neutral-800/80 ring-2 ring-neutral-600 px-2 py-0.5 text-gray-300">3日前</span>')}
                ${notifyRow('自分のタスクに対するレビューが完了した時')}
              </div>
            </section>

            <section class="mt-8 space-y-3">
              <h4 class="text-base font-medium">通知の送信時間</h4>
              <p class="text-sm text-gray-400">送信時間の制限をオンにすると、指定した時間帯のみ通知を受け取ることができます。設定した時間外に届いた通知は、次の通知可能時間にまとめて送信されます。</p>
              <div class="mt-3 flex items-center gap-3">
                <span class="text-sm text-gray-200">通知の時間を制限する</span>
                ${toggle(true)}
              </div>
              <div class="mt-2 flex items-center gap-4 text-gray-200">
                ${timeBox('AM 6 : 30')} <span class="text-gray-400">〜</span> ${timeBox('PM 8 : 30')}
              </div>
            </section>
          </div>
          <div class="tab-panel hidden" data-tab="theme">
            <h4 class="text-base font-medium mb-2">テーマを選択</h4>
            <p class="text-sm text-gray-400 mb-4">プレビューをクリックすると即時に適用されます。</p>
            <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              ${themeOption('dark', 'ダーク', '夜間やコントラスト重視向け', 'th-dark')}
              ${themeOption('warm', 'ウォーム', 'やわらかい紙風の見た目', 'th-warm')}
              ${themeOption('sakura', 'さくら', 'やわらかい桜色のUI', 'th-sakura')}
            </div>
          </div>
        </section>
      </div>
    </div>
  `

  const close = () => { overlay.remove(); const c = +(document.body.getAttribute('data-lock') || '0'); const n = Math.max(0, c - 1); if (n === 0) { document.body.style.overflow = ''; } document.body.setAttribute('data-lock', String(n)) }
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close()
  })
  overlay.querySelector('#accountClose')?.addEventListener('click', close)
  overlay.querySelector('#logoutBtn')?.addEventListener('click', async () => {
    try { await apiFetch('/logout', { method: 'POST' }) } catch { }
    localStorage.removeItem('apiToken')
    localStorage.setItem('justLoggedOut', '1')
    close()
    window.location.hash = '#/login'
  })

  // Tabs + accent + floating label
  const tabsRow = overlay.querySelector('#acctTabs') as HTMLElement | null
  const accent = overlay.querySelector('#acctAccent') as HTMLElement | null
  const label = overlay.querySelector('#acctTabLabel') as HTMLElement | null
  const labelText = overlay.querySelector('#acctTabLabelText') as HTMLElement | null
  let currentTabEl: HTMLElement | null = null
  const setTabVisual = (el: HTMLElement, active: boolean) => {
    const col = el.getAttribute('data-accent') || '#3b82f6'
    el.style.backgroundColor = col
    el.style.width = active ? '96px' : '80px'
    el.style.height = active ? '56px' : '48px'
    el.style.zIndex = active ? '40' : '10'
    el.classList.remove('shadow-xl', 'shadow-lg', 'shadow')
  }
  const activate = (btn: HTMLElement | null) => {
    if (!btn) return
    currentTabEl = btn
    const id = btn.getAttribute('data-tab') || 'basic'
    const name = btn.getAttribute('data-name') || ''
    const col = btn.getAttribute('data-accent') || '#3b82f6'
    overlay.querySelectorAll('.tab-panel').forEach((p) => {
      const tab = (p as HTMLElement).getAttribute('data-tab')
      (p as HTMLElement).classList.toggle('hidden', tab !== id)
    })
    overlay.querySelectorAll('#acctTabs .tab-btn').forEach((b) => {
      const active = b === btn
      setTabVisual(b as HTMLElement, active)
    })
    // Align tabs row so the bottom of active tab sits just above the popup border
    if (tabsRow) {
      const h = btn.offsetHeight || 48
      tabsRow.style.top = `-${h + 8}px`
    }
    if (accent) (accent as HTMLElement).style.backgroundColor = col
    if (label && labelText && tabsRow && accent) {
      labelText.textContent = name
      label.style.backgroundColor = tintHex(col, 0.2)
      const rr = tabsRow.getBoundingClientRect()
      const ar = accent.getBoundingClientRect()
      const br = btn.getBoundingClientRect()
      const labTop = Math.round(ar.bottom - rr.top)
      label.style.top = `${labTop}px`
      const minW = Math.max(br.width + 24, 110)
      label.style.minWidth = `${minW}px`
      const cx = (btn as HTMLElement).offsetLeft + ((btn as HTMLElement).offsetWidth / 2)
      label.style.left = `${cx}px`
    }
  }
  tabsRow?.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('.tab-btn') as HTMLElement | null
    if (t && tabsRow.contains(t)) activate(t)
  })
  // Append first, then compute positions so label doesn't misplace
  document.body.appendChild(overlay); (function () { const c = +(document.body.getAttribute('data-lock') || '0'); if (c === 0) { document.body.style.overflow = 'hidden' } document.body.setAttribute('data-lock', String(c + 1)) })()
  // Ensure each tab shows its own accent color background
  overlay.querySelectorAll('#acctTabs .acct-tab').forEach((el) => {
    const b = el as HTMLElement
    const col = b.getAttribute('data-accent') || '#555'
    b.style.backgroundColor = col
    // initialize base size for consistent layout before activate()
    b.style.width = '80px'
    b.style.height = '48px'
  })
  activate(overlay.querySelector('#acctTabs .tab-btn[data-tab="basic"]') as HTMLElement | null)
  // Keep label aligned on resize
  window.addEventListener('resize', () => { if (currentTabEl) activate(currentTabEl) }, { passive: true })

  // Toggle switches interaction
  overlay.querySelectorAll('.toggle').forEach((t) => {
    t.addEventListener('click', () => {
      t.classList.toggle('bg-emerald-600')
      t.classList.toggle('bg-neutral-700')
      const knob = (t as HTMLElement).querySelector('.knob') as HTMLElement | null
      knob?.classList.toggle('translate-x-5')
    })
  })

  
  // Theme option interactions
  const initTheme = getTheme()
  const mark = () => {
    overlay.querySelectorAll('.theme-option').forEach((opt) => {
      const id = (opt as HTMLElement).getAttribute('data-theme')
      const selected = id === initTheme
      opt.classList.toggle('ring-emerald-600', selected)
      opt.classList.toggle('ring-neutral-600', !selected)
      const badge = opt.querySelector('[data-check]') as HTMLElement | null
      if (badge) badge.classList.toggle('opacity-100', selected)
      if (badge) badge.classList.toggle('opacity-0', !selected)
    })
  }
  mark()
  overlay.querySelectorAll('.theme-option')?.forEach((el) => {
    el.addEventListener('click', () => {
      const id = (el as HTMLElement).getAttribute('data-theme') as 'dark' | 'warm'
      setTheme(id)
      // Update selection state
      overlay.querySelectorAll('.theme-option').forEach((opt) => {
        const sel = (opt as HTMLElement).getAttribute('data-theme') === id
        opt.classList.toggle('ring-emerald-600', sel)
        opt.classList.toggle('ring-neutral-600', !sel)
        const badge = opt.querySelector('[data-check]') as HTMLElement | null
        if (badge) badge.classList.toggle('opacity-100', sel)
        if (badge) badge.classList.toggle('opacity-0', !sel)
      })
    })
  })
  // Skills interactions (toggle/select + see-all)
  const meId = (root as any)._me?.id as number | undefined
  const onToggle = (btn: HTMLElement, sec: HTMLElement) => {
    const kind = (sec.getAttribute('data-skill-section') as SkillGroup) || 'owned'
    const name = btn.getAttribute('data-skill') || ''
    const sel = new Set(loadSkills(meId, kind))
    if (sel.has(name)) sel.delete(name); else sel.add(name)
    saveSkills(meId, kind, Array.from(sel))
    btn.classList.toggle('bg-emerald-700')
    btn.classList.toggle('text-white')
    btn.classList.toggle('ring-emerald-600')
    btn.classList.toggle('bg-neutral-800/60')
    btn.classList.toggle('text-gray-200')
    btn.classList.toggle('ring-neutral-600')
  }
  overlay.querySelectorAll('section[data-skill-section]')?.forEach((sec) => {
    const section = sec as HTMLElement
    section.querySelectorAll('.skill-pill')?.forEach((el) => {
      el.addEventListener('click', () => onToggle(el as HTMLElement, section))
    })
    const toggleMore = section.querySelector('.see-all') as HTMLElement | null
    toggleMore?.addEventListener('click', () => {
      const box = section.querySelector('.more-skills') as HTMLElement | null
      box?.classList.toggle('hidden')
    })
  })
}

type SkillGroup = 'owned' | 'want'
const ALL_SKILLS = ['JavaScript', 'TypeScript', 'Python', 'Ruby', 'Go', 'Rust', 'Java', 'Kotlin', 'Swift', 'Dart', 'PHP', 'C', 'C++', 'C#', 'Scala', 'Elixir', 'Haskell', 'R', 'Julia', 'SQL', 'HTML', 'CSS', 'Sass', 'Tailwind', 'React', 'Vue', 'Svelte', 'Next.js', 'Nuxt', 'Node.js', 'Deno', 'Bun', 'Express', 'Rails', 'Laravel', 'Spring', 'Django', 'FastAPI', 'Flutter', 'React Native', 'iOS', 'Android', 'Unity', 'Unreal', 'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Git', 'GitHub Actions', 'Figma', 'Storybook', 'Jest', 'Playwright', 'Vitest', 'Grafana', 'Prometheus']
const SKILL_ICON: Record<string, string> = {
  JavaScript: '🟨', TypeScript: '🟦', Python: '🐍', Ruby: '💎', Go: '🌀', Rust: '🦀', Java: '☕', Kotlin: '🟪', Swift: '🟧', Dart: '🎯', PHP: '🐘', 'C#': '🎼', 'C++': '➕', C: '🧩', Scala: '📈', Elixir: '🧪', Haskell: 'λ', R: '📊', Julia: '💠', SQL: '🗄️', HTML: '📄', CSS: '🎨', Sass: '🧵', Tailwind: '🌬️', React: '⚛️', Vue: '🟩', Svelte: '🟠', 'Next.js': '⏭️', Nuxt: '🟢', 'Node.js': '🟢', Deno: '🦕', Bun: '🥯', Express: '🚂', Rails: '🛤️', Laravel: '🟥', Spring: '🌱', Django: '🟩', FastAPI: '⚡', Flutter: '💙', 'React Native': '📱', iOS: '📱', Android: '🤖', Unity: '🎮', Unreal: '🧰', AWS: '☁️', GCP: '☁️', Azure: '☁️', Docker: '🐳', Kubernetes: '☸️', Terraform: '🧱', Ansible: '📦', Git: '🔧', 'GitHub Actions': '🛠️', Figma: '🎨', Storybook: '📚', Jest: '🧪', Playwright: '🎭', Vitest: '🧪', Grafana: '📊', Prometheus: '🔥'
}
function slugSkill(name: string): string { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
function skillIcon(name: string): string {
  const slug = slugSkill(name)
  return `<img src="./icons/${slug}.svg" alt="${name}" class="w-4 h-4 mr-1 inline-block align-[-2px]" onerror="this.style.display='none'" />`
}
function skillsKey(uid?: number, kind: SkillGroup = 'owned'): string { return `acct-skills-${uid ?? 'guest'}-${kind}` }
function loadSkills(uid?: number, kind: SkillGroup = 'owned'): string[] {
  try { return JSON.parse(localStorage.getItem(skillsKey(uid, kind)) || '[]') as string[] } catch { return [] }
}
function saveSkills(uid: number | undefined, kind: SkillGroup, list: string[]): void {
  localStorage.setItem(skillsKey(uid, kind), JSON.stringify(Array.from(new Set(list))))
}
function renderSkillSection(kind: SkillGroup, title: string, uid?: number): string {
  const selected = new Set(loadSkills(uid, kind).filter((s) => ALL_SKILLS.includes(s)))
  const seed = ALL_SKILLS.slice(0, 12)
  return `
    <section class="space-y-3" data-skill-section="${kind}">
      <div class="text-sm text-gray-400">${title}</div>
      <div class="rounded-lg ring-2 ring-neutral-600 bg-neutral-900/40 p-3 flex flex-wrap gap-2">
        ${seed.map((s) => `<button class=\"skill-pill px-3 py-1.5 rounded-full text-sm ring-2 ${selected.has(s) ? 'bg-emerald-700 text-white ring-emerald-600' : 'bg-neutral-800/60 text-gray-200 ring-neutral-600'}\" data-skill=\"${s}\">${skillIcon(s)}${s}</button>`).join('')}
      </div>
      <button class="see-all text-xs mx-auto block text-gray-400 hover:text-gray-200">+ すべてみる</button>
      <div class="more-skills hidden rounded-lg ring-2 ring-neutral-600 bg-neutral-900/40 p-3 flex flex-wrap gap-2 max-h-48 overflow-auto">
        ${ALL_SKILLS.map((s) => `<button class=\"skill-pill px-3 py-1.5 rounded-full text-sm ring-2 ${selected.has(s) ? 'bg-emerald-700 text-white ring-emerald-600' : 'bg-neutral-800/60 text-gray-200 ring-neutral-600'}\" data-skill=\"${s}\">${skillIcon(s)}${s}</button>`).join('')}
      </div>
    </section>
  `
}

function toggle(on = true): string {
  return `<button type="button" class="toggle ${on ? 'bg-emerald-600' : 'bg-neutral-700'} relative inline-flex h-6 w-10 items-center rounded-full transition-colors">
    <span class="knob inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${on ? 'translate-x-5' : 'translate-x-1'}"></span>
  </button>`
}

function notifyRow(label: string, extra: string = ''): string {
  return `
    <div class="flex items-center justify-between px-4 py-3 bg-neutral-900/60">
      <div class="text-sm text-gray-200">${label} ${extra}</div>
      ${toggle(true)}
    </div>
  `
}

function timeBox(text: string): string {
  return `<span class="inline-flex items-center rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-1 text-sm text-gray-200">${text}</span>`
}

function themeOption(id: 'dark' | 'warm' | 'sakura', title: string, desc: string, scopeClass: string): string {
  // Preview uses theme-scoped visuals, but the labels below use current theme colors for readability
  return `
  <button type="button" data-theme="${id}" class="theme-option relative text-left rounded-lg ring-2 ring-neutral-600 bg-neutral-900/40 hover:ring-emerald-600 transition-colors">
    <div class="absolute right-2 top-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-700 text-white opacity-0" data-check>選択中</div>
    <div class="p-3 ${scopeClass}">
      <div class="h-5 rounded bg-neutral-900/80 ring-2 ring-neutral-600"></div>
      <div class="mt-2 flex gap-2">
        <div class="w-8 rounded bg-neutral-900/50 ring-2 ring-neutral-600 h-20"></div>
        <div class="flex-1 space-y-2">
          <div class="gh-card p-2"><div class="h-3 w-1/3 rounded bg-blue-400/30"></div><div class="mt-2 h-2 w-2/3 rounded bg-gray-400/30"></div></div>
          <div class="gh-card p-2"><div class="h-3 w-1/4 rounded bg-emerald-400/30"></div><div class="mt-2 h-2 w-1/2 rounded bg-gray-400/30"></div></div>
        </div>
      </div>
    </div>
    <div class="mt-3 px-3 pb-3">
      <div class="text-[15px] font-medium text-gray-100">${title}</div>
      <div class="text-[12px] text-gray-400">${desc}</div>
    </div>
  </button>`
}

// ---------------- Project Create Modal ----------------
function openCreateProjectModal(root: HTMLElement): void {
  // Prevent opening multiple overlays by rapid clicks
  if (document.getElementById('pjOverlay')) return
  const me = (root as any)._me as { name?: string; github_id?: number } | undefined

  const overlay = document.createElement('div')
  overlay.id = 'pjOverlay'
  overlay.className = 'fixed inset-0 z-[60] bg-black/60 backdrop-blur-[1px] grid place-items-center'
  overlay.classList.add('fade-overlay')
  overlay.innerHTML = `
    <div class="relative w-[min(1040px,95vw)] h-[82vh] overflow-hidden rounded-xl bg-neutral-900 ring-2 ring-neutral-600 shadow-2xl text-gray-100">
      <div class="flex items-center h-12 px-5 border-b border-neutral-600">
        <h3 class="text-lg font-semibold">プロジェクト</h3>
        <div class="ml-6 flex gap-6 text-sm">
          <button class="pj-tab px-2 py-1 border-b-2 border-orange-500" data-tab="new">新規</button>
          <button class="pj-tab px-2 py-1 text-gray-400 hover:text-gray-200" data-tab="existing">既存</button>
        </div>
        <button class="ml-auto text-2xl text-neutral-300 hover:text-white" id="pj-close">×</button>
      </div>
      <div class="h-[calc(100%-3rem)] flex overflow-hidden">
        <section class="flex-1 overflow-y-auto p-6 pb-28 space-y-6">
          <!-- New project tab -->
          <div class="pj-panel" data-tab="new">
            ${renderNewProjectForm(me)}
          </div>

          <!-- Existing repo link tab -->
          <div class="pj-panel hidden" data-tab="existing">
            ${renderExistingRepoPanel()}
          </div>
        </section>
      </div>

      <div class="absolute bottom-0 inset-x-0 p-4 border-t border-neutral-600 bg-neutral-900/80">
        <div class="max-w-full flex justify-end">
          <button id="pj-submit" class="inline-flex items-center rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 shadow">プロジェクト作成</button>
        </div>
      </div>
    </div>
  `

  // Close actions
  // Disable open triggers while modal is shown
  const headerBtn = root.querySelector('#createBtn') as HTMLButtonElement | null
  const cardBtn = root.querySelector('#createCard') as HTMLButtonElement | null
  headerBtn && (headerBtn.disabled = true)
  cardBtn && (cardBtn.disabled = true)

  const close = () => {
    overlay.remove()
    const c = +(document.body.getAttribute('data-lock') || '0'); const n = Math.max(0, c - 1); if (n === 0) { document.body.style.overflow = ''; } document.body.setAttribute('data-lock', String(n))
    // Re-enable triggers after close
    headerBtn && (headerBtn.disabled = false)
    cardBtn && (cardBtn.disabled = false)
  }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#pj-close')?.addEventListener('click', close)
    ; (function () { const c = +(document.body.getAttribute('data-lock') || '0'); if (c === 0) { document.body.style.overflow = 'hidden' } document.body.setAttribute('data-lock', String(c + 1)) })()

  // Tab switching
  overlay.querySelectorAll('.pj-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = (tab as HTMLElement).getAttribute('data-tab')
      overlay.querySelectorAll('.pj-panel').forEach((p) => {
        const t = (p as HTMLElement).getAttribute('data-tab')
          ; (p as HTMLElement).classList.toggle('hidden', t !== name)
      })
      overlay.querySelectorAll('.pj-tab').forEach((t) => {
        const active = t === tab
        t.classList.toggle('border-b-2', active)
        t.classList.toggle('border-orange-500', active)
        t.classList.toggle('text-gray-400', !active)
      })
    })
  })

  // Fetch GitHub info for existing tab
  if (me?.github_id) {
    fetchGithubProfile(me.github_id)
      .then((profile) => fetchGithubRepos(profile.login))
      .then((repos) => {
        const container = overlay.querySelector('#repoList') as HTMLElement | null
        if (container) container.innerHTML = repos.map(repoItem).join('')
          ; (overlay as any)._repos = repos
        // selection (delegated)
        container?.addEventListener('click', (ev) => {
          const target = (ev.target as HTMLElement).closest('[data-repo]') as HTMLElement | null
          if (!target || !container.contains(target)) return
          container.querySelectorAll('[data-repo]').forEach((n) => {
            n.classList.remove('ring-emerald-600', 'ring-2', 'bg-neutral-900/50')
          })
          target.classList.add('ring-emerald-600', 'ring-2', 'bg-neutral-900/50')
          const full = target.getAttribute('data-repo') || ''
            ; (overlay as any)._selectedRepo = full
          // populate right-side form
          try {
            const list = ((overlay as any)._repos || []) as any[]
            const r = list.find((x) => String(x.full_name) === full)
            const nameEl = overlay.querySelector('#ex-name') as HTMLInputElement | null
            const descEl = overlay.querySelector('#ex-desc') as HTMLTextAreaElement | null
            const selEl = overlay.querySelector('#ex-selected') as HTMLElement | null
            if (nameEl) nameEl.value = (r?.name || '')
            if (descEl) descEl.value = (r?.description || '')
            if (selEl) selEl.textContent = r ? `${r.full_name} ${r.private ? '(Private)' : '(Public)'}` : full
          } catch { }
        })
        // search
        const search = overlay.querySelector('#repoSearch') as HTMLInputElement | null
        search?.addEventListener('input', () => {
          const q = (search.value || '').toLowerCase()
          container?.querySelectorAll('[data-repo]').forEach((el) => {
            const text = el.textContent?.toLowerCase() || ''
              ; (el as HTMLElement).style.display = text.includes(q) ? '' : 'none'
          })
        })
      })
      .catch(() => {
        const container = overlay.querySelector('#repoList')
        if (container) container.innerHTML = `<p class="text-sm text-gray-400">GitHubのリポジトリを取得できませんでした。</p>`
      })
  }

  // Submit
  overlay.querySelector('#pj-submit')?.addEventListener('click', async () => {
    // prevent double submit
    const submitBtn = overlay.querySelector('#pj-submit') as HTMLButtonElement | null
    if (submitBtn?.disabled) return
    if (submitBtn) submitBtn.disabled = true
    const active = overlay.querySelector('.pj-panel:not(.hidden)') as HTMLElement
    const mode = active?.getAttribute('data-tab')
    try {
      if (mode === 'new') {
        clearFormErrors(overlay)
        const payload = readNewProjectForm(overlay)
        if (!validateProjectForm(overlay, payload)) return
        // Hand off creation to dedicated screen
        try { sessionStorage.setItem('project-create', JSON.stringify({ mode: 'new', payload })) } catch {}
        close()
        window.location.hash = '#/project/creating'
      } else {
        const repo = (overlay as any)._selectedRepo as string | undefined
        if (!repo) {
          const list = overlay.querySelector('#repoList') as HTMLElement | null
          if (list) list.insertAdjacentHTML('afterbegin', '<div class="mb-2 text-rose-400">リポジトリを選択してください。</div>')
          return
        }
        const extra = readExistingProjectForm(overlay)
        // validate name if provided
        if (extra.name && !/^[A-Za-z0-9._-]{1,100}$/.test(extra.name)) {
          overlay.querySelector('#ex-err-namefmt')?.classList.remove('hidden')
          const n = overlay.querySelector('#ex-name') as HTMLElement | null
          n?.classList.add('ring-rose-600')
          return
        }
        try { sessionStorage.setItem('project-create', JSON.stringify({ mode: 'existing', payload: { linkRepo: repo, ...extra } })) } catch {}
        close()
        window.location.hash = '#/project/creating'
      }
    } catch (e) {
      console.error(e)
      // If unauthorized, route to login
      if ((e as any)?.message?.includes('401')) {
        window.location.hash = '#/login'
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false
    }
  })

  // Interactions in new form
  overlay.querySelectorAll('#pj-skills .pj-skill').forEach((chip) => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active')
      const on = chip.classList.contains('active')
      chip.classList.toggle('bg-emerald-700', on)
      chip.classList.toggle('text-white', on)
      chip.classList.toggle('ring-emerald-600', on)
      chip.classList.toggle('bg-neutral-800/60', !on)
      chip.classList.toggle('text-gray-200', !on)
      chip.classList.toggle('ring-neutral-600', !on)
    })
  })

  overlay.querySelector('#pj-visibility')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLElement
    const next = btn.getAttribute('data-state') === 'public' ? 'private' : 'public'
    btn.setAttribute('data-state', next)
    btn.textContent = next === 'public' ? 'Public' : 'Private'
  })

  // Date linkage: end date cannot be before start
  const startEl = overlay.querySelector('#pj-start') as HTMLInputElement | null
  const endEl = overlay.querySelector('#pj-end') as HTMLInputElement | null
  startEl?.addEventListener('change', () => {
    if (endEl && startEl?.value) {
      endEl.min = startEl.value
      if (endEl.value && endEl.value < startEl.value) endEl.value = startEl.value
    }
  })

  // Interactions in existing form
  overlay.querySelectorAll('#ex-skills .ex-skill').forEach((chip) => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active')
      const on = chip.classList.contains('active')
      chip.classList.toggle('bg-emerald-700', on)
      chip.classList.toggle('text-white', on)
      chip.classList.toggle('ring-emerald-600', on)
      chip.classList.toggle('bg-neutral-800/60', !on)
      chip.classList.toggle('text-gray-200', !on)
      chip.classList.toggle('ring-neutral-600', !on)
    })
  })
  overlay.querySelector('#ex-visibility')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLElement
    const next = btn.getAttribute('data-state') === 'public' ? 'private' : 'public'
    btn.setAttribute('data-state', next)
    btn.textContent = next === 'public' ? 'Public' : 'Private'
  })
  const exStartEl = overlay.querySelector('#ex-start') as HTMLInputElement | null
  const exEndEl = overlay.querySelector('#ex-end') as HTMLInputElement | null
  exStartEl?.addEventListener('change', () => {
    if (exEndEl && exStartEl?.value) {
      exEndEl.min = exStartEl.value
      if (exEndEl.value && exEndEl.value < exStartEl.value) exEndEl.value = exStartEl.value
    }
  })

  document.body.appendChild(overlay)
}

function clearFormErrors(scope: HTMLElement): void {
  scope.querySelector('#err-name')?.classList.add('hidden')
  scope.querySelector('#err-date')?.classList.add('hidden')
  const name = scope.querySelector('#pj-name') as HTMLElement | null
  name?.classList.remove('ring-rose-600')
  const s = scope.querySelector('#pj-start') as HTMLElement | null
  const e = scope.querySelector('#pj-end') as HTMLElement | null
  s?.classList.remove('ring-rose-600')
  e?.classList.remove('ring-rose-600')
}

function validateProjectForm(scope: HTMLElement, payload: any): boolean {
  let ok = true
  const nameEl = scope.querySelector('#pj-name') as HTMLInputElement | null
  if (!payload.name || payload.name.trim().length === 0) {
    scope.querySelector('#err-name')?.classList.remove('hidden')
    nameEl?.classList.add('ring-rose-600')
    ok = false
  }
  // Name format (GitHub-like): ASCII letters/numbers, hyphen, underscore, dot; <=100
  const re = /^[A-Za-z0-9._-]{1,100}$/
  if (payload.name && !re.test(payload.name)) {
    scope.querySelector('#err-namefmt')?.classList.remove('hidden')
    nameEl?.classList.add('ring-rose-600')
    ok = false
  }
  const start = payload.start ? new Date(payload.start) : null
  const end = payload.end ? new Date(payload.end) : null
  if (start && end && start.getTime() > end.getTime()) {
    scope.querySelector('#err-date')?.classList.remove('hidden')
      ; (scope.querySelector('#pj-start') as HTMLElement | null)?.classList.add('ring-rose-600')
      ; (scope.querySelector('#pj-end') as HTMLElement | null)?.classList.add('ring-rose-600')
    ok = false
  }
  return ok
}

function addProjectToGrid(root: HTMLElement, p: Project): void {
  // Re-render honeycomb for simplicity
  loadProjects(root)
}

function openCardMenu(root: HTMLElement, anchor: HTMLElement, id: number): void {
  const rect = anchor.getBoundingClientRect()
  const menu = document.createElement('div')
  menu.className = 'fixed z-50 rounded-md bg-neutral-900 ring-2 ring-neutral-600 shadow-xl text-sm text-gray-200'
  // Initial position; we'll correct after mount to avoid viewport overflow
  menu.style.top = `${rect.bottom + 6}px`
  menu.style.left = `${rect.right}px`
  // Close any existing project menu before opening a new one
  document.getElementById('pjCardMenu')?.remove()
  menu.id = 'pjCardMenu'
  menu.innerHTML = `
    <button class="w-36 text-left px-3 py-2 hover:bg-neutral-800" data-act="open">開く</button>
    <button class="w-36 text-left px-3 py-2 hover:bg-neutral-800" data-act="rename">別名（アプリ内）</button>
    <div class="px-3 py-1 text-xs text-gray-400">見た目</div>
    <div class="px-2 pb-2 flex gap-2">
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-600 bg-sky-800" data-color="blue" title="Blue"></button>
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-600 bg-emerald-800" data-color="green" title="Green"></button>
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-600 bg-rose-800" data-color="red" title="Red"></button>
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-600 bg-fuchsia-800" data-color="purple" title="Purple"></button>
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-600 bg-orange-800" data-color="orange" title="Orange"></button>
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-600 bg-yellow-700" data-color="yellow" title="Yellow"></button>
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-600 bg-neutral-700" data-color="gray" title="Gray"></button>
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-600 bg-black" data-color="black" title="Black"></button>
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-600 bg-white" data-color="white" title="White"></button>
    </div>
    <button class="w-36 text-left px-3 py-2 hover:bg-neutral-800 text-rose-400" data-act="delete">削除</button>
  `
  const remove = () => menu.remove()
  const onDoc = (e: MouseEvent) => { if (!menu.contains(e.target as Node)) { remove(); document.removeEventListener('click', onDoc) } }
  setTimeout(() => document.addEventListener('click', onDoc), 0)
  const openBtn = menu.querySelector('[data-act="open"]') as HTMLElement | null
  openBtn?.addEventListener('mousedown', () => { try { prefetchProjectDetailDeep(id) } catch {} }, { once: true })
  openBtn?.addEventListener('click', () => {
    try { document.querySelectorAll('#giInfo').forEach((n)=> (n as HTMLElement).remove()) } catch {}
    try { sessionStorage.setItem('proj-entry-dir', 'right') } catch {}
    try { prefetchProjectDetailDeep(id) } catch {}
    window.location.hash = `#/project/detail?id=${id}`
    remove()
  })
  // rename
  menu.querySelector('[data-act="rename"]')?.addEventListener('click', async () => {
    const host = root.querySelector(`[data-id="${id}"]`) as HTMLElement | null
    const current = host?.querySelector('.text-base')?.textContent?.trim() || ''
    const next = prompt('別名（アプリ内のみで表示されます）', current)
    if (!next || next.trim() === '' || next === current) { remove(); return }
    try {
      await apiFetch(`/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alias: next.trim() }) })
      loadProjects(root)
    } catch (e) {
      alert('別名の保存に失敗しました')
    }
    remove()
  })
  // appearance color
  menu.querySelectorAll('[data-color]')?.forEach((el) => {
    el.addEventListener('click', async () => {
      const color = (el as HTMLElement).getAttribute('data-color') || 'blue'
      try {
        await apiFetch(`/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ color }) })
        loadProjects(root)
      } catch {
        alert('見た目の変更に失敗しました')
      }
      remove()
    })
  })
  menu.querySelector('[data-act="delete"]')?.addEventListener('click', async () => {
    let requiredName = ''
    try {
      const p = await apiFetch<any>(`/projects/${id}`)
      requiredName = (p?.name || '').toString()
    } catch {
      const host = root.querySelector(`[data-id="${id}"]`) as HTMLElement | null
      requiredName = host?.querySelector('.text-base')?.textContent?.trim() || ''
    }
    const overlay = document.createElement('div')
    overlay.className = 'fixed inset-0 z-[70] bg-black/60 grid place-items-center'
    overlay.innerHTML = `
      <div class="relative w-[min(520px,92vw)] rounded-xl bg-neutral-900 ring-2 ring-neutral-600 shadow-2xl text-gray-100">
        <header class="h-10 flex items-center px-4 border-b border-neutral-600"><div class="font-semibold">プロジェクトを削除</div><button id="delClose" class="ml-auto text-xl">×</button></header>
        <div class="p-4 space-y-3">
          <p class="text-sm text-gray-300">削除するには <span class="px-2 py-0.5 rounded bg-neutral-800/70 ring-1 ring-neutral-600">${requiredName || '（名前未取得）'}</span> と入力してください。</p>
          <input id="delInput" class="w-full rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-2 text-gray-100" placeholder="プロジェクト名を入力" />
          <div class="flex justify-end gap-2 pt-2">
            <button id="delCancel" class="px-3 py-1.5 rounded bg-neutral-800/60 text-gray-200 text-sm">キャンセル</button>
            <button id="delOk" class="px-3 py-1.5 rounded bg-rose-700 text-white text-sm opacity-60 pointer-events-none">削除</button>
          </div>
        </div>
      </div>
    `
    const closeModal = () => overlay.remove()
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal() })
    overlay.querySelector('#delClose')?.addEventListener('click', closeModal)
    overlay.querySelector('#delCancel')?.addEventListener('click', closeModal)
    const input = overlay.querySelector('#delInput') as HTMLInputElement
    const okBtn = overlay.querySelector('#delOk') as HTMLButtonElement
    const applyState = () => {
      const match = input.value.trim() === requiredName && requiredName.length > 0
      okBtn.style.opacity = match ? '1' : '0.6'
      okBtn.style.pointerEvents = match ? 'auto' : 'none'
    }
    input.addEventListener('input', applyState)
    okBtn.addEventListener('click', async () => {
      try {
        await apiFetch(`/projects/${id}`, { method: 'DELETE' })
        closeModal()
        remove()
        loadProjects(root)
        try { showMiniToastList('プロジェクトを削除しました', { variant: 'danger' }) } catch {}
      } catch {
        alert('削除に失敗しました')
      }
    })
    document.body.appendChild(overlay)
  })
  // Append group actions
  try {
    const me = (root as any)._me as { id?: number }
    const groups = ensureDefaultGroups(me?.id)
    const move = document.createElement('div')
    move.innerHTML = `<div class="px-3 py-1 text-xs text-gray-400">グループに移動</div>`
    menu.appendChild(move)
    groups.forEach((g) => {
      const b = document.createElement('button')
      b.className = 'w-36 text-left px-3 py-2 hover:bg-neutral-800'
      b.textContent = g.name
      b.addEventListener('click', () => {
        const map = getGroupMap(me?.id)
        map[String(id)] = g.id
        setGroupMap(me?.id, map)
        loadProjects(root)
        menu.remove()
      })
      menu.appendChild(b)
    })
  } catch { }

  document.body.appendChild(menu)
  // Reposition to keep menu within viewport
  const pad = 12
  const mrect = menu.getBoundingClientRect()
  let left = rect.right - mrect.width // align right edge to anchor right
  if (left < pad) left = rect.left // fallback align left edge
  if (left + mrect.width > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - mrect.width - pad)
  let top = rect.bottom + 6
  if (top + mrect.height > window.innerHeight - pad) top = Math.max(pad, rect.top - mrect.height - 6)
  menu.style.left = `${left}px`
  menu.style.top = `${top}px`
}

function renderNewProjectForm(me?: { name?: string }): string {
  const owner = me?.name ?? 'ユーザー'
  const skills = ['Ruby', 'Python', 'Dart', 'Java', 'JavaScript', 'HTML', 'CSS', 'C++', 'C', 'Lisp', 'Rust', 'Julia', 'MATLAB', 'Haskell', 'COBOL']
  return `
    <div class="space-y-6">
      <section class="space-y-4">
        <div class="flex items-center gap-4">
          <div class="text-sm text-gray-400 w-24">所有者</div>
          <div class="flex-1 flex items-center gap-2">
            <div class="inline-flex items-center gap-2 rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-1.5 text-sm text-gray-200">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>${owner}</span>
            </div>
            <span class="text-gray-500">/</span>
            <input id="pj-name" type="text" placeholder="プロジェクト名" class="flex-1 rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-gray-100 placeholder:text-gray-500" required maxlength="100" />
          </div>
        </div>
        <p id="err-name" class="text-rose-400 text-sm hidden">プロジェクト名を入力してください。</p>
        <p id="err-namefmt" class="text-rose-400 text-sm hidden">英数字・ハイフン・アンダースコア・ドットのみ、100文字以内で入力してください。</p>

        <div>
          <div class="text-sm text-gray-400 mb-1">プロジェクト概要</div>
          <textarea id="pj-desc" rows="5" class="w-full rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-gray-100 placeholder:text-gray-500" placeholder="説明を入力"></textarea>
        </div>
      </section>

      <section class="space-y-4">
        <div class="rounded-lg ring-2 ring-neutral-600 bg-neutral-900/40 p-4 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-300">表示権限を選択</div>
              <div class="text-xs text-gray-400">このプロジェクトを閲覧およびコミットできるユーザーを選択する</div>
            </div>
            <button id="pj-visibility" data-state="public" class="rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-1.5 text-sm">Public</button>
          </div>

          <div class="flex items-center gap-3">
            <div class="text-sm text-gray-300 w-28">期日を選択</div>
            <input id="pj-start" type="date" class="w-44 rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-1.5 text-gray-100 placeholder:text-gray-500" />
            <span class="text-gray-400">〜</span>
            <input id="pj-end" type="date" class="w-44 rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-1.5 text-gray-100 placeholder:text-gray-500" />
          </div>
          <p id="err-date" class="text-rose-400 text-sm hidden">開始日は終了日より前の日付にしてください。</p>

          <div>
            <div class="text-sm text-gray-300 mb-2">スキル要件を選択</div>
            <div id="pj-skills" class="flex flex-wrap gap-2">
              ${skills.map((s, i) => `<button class="pj-skill px-3 py-1.5 rounded-full text-sm ring-2 ${i % 5 === 0 ? 'bg-emerald-700 text-white ring-emerald-600' : 'bg-neutral-800/60 text-gray-200 ring-neutral-600'}" data-skill="${s}">${s}</button>`).join('')}
            </div>
          </div>
        </div>
      </section>
      <section class="space-y-3">
        <div class="rounded-lg ring-2 ring-neutral-600 bg-neutral-900/40 p-4">
          <div class="text-sm text-gray-300 mb-3">GitHubへの初期設定（任意）</div>
          <label class="flex items-center gap-3 py-1">
            <input id="pj-setup-readme" type="checkbox" class="w-4 h-4" />
            <span class="text-sm text-gray-200">README.md を初期化・更新する</span>
          </label>
          <label class="flex items-center gap-3 py-1">
            <input id="pj-setup-issues" type="checkbox" class="w-4 h-4" />
            <span class="text-sm text-gray-200">AIプランから初期Issueを作成する</span>
          </label>
          <p class="text-xs text-gray-500 mt-1">チェックしない場合、既存のREADMEやIssueは変更されません。</p>
        </div>
      </section>
    </div>
  `
}

function renderExistingRepoPanel(): string {
  const skills = ['Ruby', 'Python', 'Dart', 'Java', 'JavaScript', 'HTML', 'CSS', 'C++', 'C', 'Lisp', 'Rust', 'Julia', 'MATLAB', 'Haskell', 'COBOL']
  return `
    <div class="grid gap-6 md:grid-cols-12">
      <div class="md:col-span-5">
        <div class="text-sm text-gray-300 mb-2">GitHubリポジトリを選択</div>
        <div class="flex items-center gap-3">
          <input id="repoSearch" type="text" placeholder="リポジトリを検索..." class="flex-1 rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-gray-100 placeholder:text-gray-500" />
          <button class="rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-sm">更新が新しい順</button>
        </div>
        <div id="repoList" class="mt-3 divide-y divide-neutral-600 max-h-[48vh] overflow-y-auto"></div>
        <p class="text-xs text-gray-400 mt-2">リポジトリをひとつ選択してください。</p>
      </div>
      <div class="md:col-span-7">
        <div class="rounded-lg ring-2 ring-neutral-600 bg-neutral-900/40 p-4 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-300">選択されたリポジトリ</div>
              <div id="ex-selected" class="text-xs text-gray-400">未選択</div>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-sm text-gray-400 w-24">プロジェクト名</div>
            <input id="ex-name" type="text" placeholder="プロジェクト名" class="flex-1 rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-gray-100 placeholder:text-gray-500" maxlength="100" />
          </div>
          <p id="ex-err-namefmt" class="text-rose-400 text-sm hidden">英数字・ハイフン・アンダースコア・ドットのみ、100文字以内で入力してください。</p>
          <div>
            <div class="text-sm text-gray-400 mb-1">プロジェクト概要</div>
            <textarea id="ex-desc" rows="4" class="w-full rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-gray-100 placeholder:text-gray-500" placeholder="説明を入力"></textarea>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-300">表示権限を選択</div>
              <div class="text-xs text-gray-400">このプロジェクトを閲覧およびコミットできるユーザーを選択する</div>
            </div>
            <button id="ex-visibility" data-state="public" class="rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-1.5 text-sm">Public</button>
          </div>

          <div class="flex items-center gap-3">
            <div class="text-sm text-gray-300 w-28">期日を選択</div>
            <input id="ex-start" type="date" class="w-44 rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-1.5 text-gray-100 placeholder:text-gray-500" />
            <span class="text-gray-400">〜</span>
            <input id="ex-end" type="date" class="w-44 rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-1.5 text-gray-100 placeholder:text-gray-500" />
          </div>
          <p id="ex-err-date" class="text-rose-400 text-sm hidden">開始日は終了日より前の日付にしてください。</p>

          <div>
            <div class="text-sm text-gray-300 mb-2">スキル要件を選択</div>
            <div id="ex-skills" class="flex flex-wrap gap-2">
              ${skills.map((s, i) => `<button class="ex-skill px-3 py-1.5 rounded-full text-sm ring-2 ${i % 5 === 0 ? 'bg-emerald-700 text-white ring-emerald-600' : 'bg-neutral-800/60 text-gray-200 ring-neutral-600'}" data-skill="${s}">${s}</button>`).join('')}
            </div>
          </div>
          <div class="pt-2 border-t border-neutral-700">
            <div class="text-sm text-gray-300 mb-3">GitHubへの初期設定（任意）</div>
            <label class="flex items-center gap-3 py-1">
              <input id="ex-setup-readme" type="checkbox" class="w-4 h-4" />
              <span class="text-sm text-gray-200">README.md を初期化・更新する</span>
            </label>
            <label class="flex items-center gap-3 py-1">
              <input id="ex-setup-issues" type="checkbox" class="w-4 h-4" />
              <span class="text-sm text-gray-200">AIプランから初期Issueを作成する</span>
            </label>
            <p class="text-xs text-gray-500 mt-1">チェックしない場合、既存のREADMEやIssueは変更されません。</p>
          </div>
        </div>
      </div>
    </div>
  `
}

async function fetchGithubProfile(_id: number): Promise<{ login: string }> {
  return apiFetch('/github/profile') as Promise<{ login: string }>
}

async function fetchGithubRepos(_login: string): Promise<any[]> {
  return apiFetch('/github/repos') as Promise<any[]>
}

function repoItem(r: any): string {
  const visibility = r.private ? 'Private' : 'Public'
  const lang = r.language ? `<span class=\"ml-2 text-xs text-gray-400\">${r.language}</span>` : ''
  const updated = r.updated_at ? new Date(r.updated_at).toLocaleDateString() : ''
  return `
    <button type="button" class="w-full text-left py-4 hover:bg-neutral-900/40 px-1 rounded-md ring-2 ring-transparent" data-repo="${r.full_name}">
      <div class="flex items-center gap-2">
        <div class="font-medium text-sky-300">${r.name}</div>
        <span class="text-xs rounded bg-neutral-800/80 ring-2 ring-neutral-600 px-1.5 py-0.5">${visibility}</span>
      </div>
      <div class="text-sm text-gray-300 mt-0.5">${r.description ?? ''}</div>
      <div class="text-xs text-gray-400 mt-1">Updated ${updated} ${lang}</div>
    </button>
  `
}

function readNewProjectForm(scope: HTMLElement): any {
  const q = (sel: string) => (scope.querySelector(sel) as HTMLInputElement | null)
  const selectedSkills = Array.from(scope.querySelectorAll('#pj-skills .pj-skill.active')).map((el) => (
    (el as HTMLElement).getAttribute('data-skill') as string
  ))
  const visibilityState = scope.querySelector('#pj-visibility')?.getAttribute('data-state')
  return {
    name: q('#pj-name')?.value?.trim(),
    description: (scope.querySelector('#pj-desc') as HTMLTextAreaElement)?.value?.trim(),
    visibility: visibilityState === 'private' ? 'private' : 'public',
    start: q('#pj-start')?.value?.trim(),
    end: q('#pj-end')?.value?.trim(),
    skills: selectedSkills,
    setupReadme: (scope.querySelector('#pj-setup-readme') as HTMLInputElement | null)?.checked || false,
    setupIssues: (scope.querySelector('#pj-setup-issues') as HTMLInputElement | null)?.checked || false,
  }
}

function readExistingProjectForm(scope: HTMLElement): any {
  const selectedSkills = Array.from(scope.querySelectorAll('#ex-skills .ex-skill.active')).map((el) => (
    (el as HTMLElement).getAttribute('data-skill') as string
  ))
  const visibilityState = scope.querySelector('#ex-visibility')?.getAttribute('data-state')
  const start = (scope.querySelector('#ex-start') as HTMLInputElement | null)?.value?.trim()
  const end = (scope.querySelector('#ex-end') as HTMLInputElement | null)?.value?.trim()
  const err = scope.querySelector('#ex-err-date') as HTMLElement | null
  if (start && end && new Date(start) > new Date(end)) err?.classList.remove('hidden')
  else err?.classList.add('hidden')
  return {
    name: (scope.querySelector('#ex-name') as HTMLInputElement | null)?.value?.trim(),
    description: (scope.querySelector('#ex-desc') as HTMLTextAreaElement | null)?.value?.trim(),
    visibility: visibilityState === 'private' ? 'private' : 'public',
    start,
    end,
    skills: selectedSkills,
    setupReadme: (scope.querySelector('#ex-setup-readme') as HTMLInputElement | null)?.checked || false,
    setupIssues: (scope.querySelector('#ex-setup-issues') as HTMLInputElement | null)?.checked || false,
  }
}

async function createProject(payload: any): Promise<any> {
  // Call backend and surface errors (no mock success)
  return apiFetch('/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
