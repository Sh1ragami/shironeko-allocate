import { honeyHexEmptySvg, honeyHexFilledSvg } from '../../utils/honeycomb'
import { renderNotFound } from '../not-found/not-found'
import { hideRouteLoading } from '../../utils/route-loading'
import { apiFetch } from '../../utils/api'

// Local helpers copied to avoid refactoring large detail module
function parseHashQuery(): Record<string, string> {
  const [, query = ''] = window.location.hash.split('?')
  const params = new URLSearchParams(query)
  const out: Record<string, string> = {}
  params.forEach((v, k) => (out[k] = v))
  return out
}

function tintHex(hex: string, pct = 0.2): string {
  const m = (hex || '').trim().match(/^#?([0-9a-fA-F]{6})$/)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  r = Math.min(255, Math.round(r + (255 - r) * pct))
  g = Math.min(255, Math.round(g + (255 - g) * pct))
  b = Math.min(255, Math.round(b + (255 - b) * pct))
  return `rgb(${r}, ${g}, ${b})`
}
function deriveFacets(main: string): { side: string; hi: string } {
  const m = main.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\)$/)
  if (!m) return { side: main, hi: main }
  const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10)
  const a = m[4] != null ? Math.max(0, Math.min(1, parseFloat(m[4]))) : 1
  const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)))
  const sr = clamp(r * 0.35), sg = clamp(g * 0.35), sb = clamp(b * 0.35)
  const sa = Math.max(0.65, Math.min(0.9, a))
  const hr = clamp(r + (255 - r) * 0.36), hg = clamp(g + (255 - g) * 0.36), hb = clamp(b + (255 - b) * 0.36)
  const ha = Math.max(0.75, Math.min(0.95, a))
  return { side: `rgba(${sr}, ${sg}, ${sb}, ${sa})`, hi: `rgba(${hr}, ${hg}, ${hb}, ${ha})` }
}

// Hex grid helpers
type Ax = { x: number; z: number }
function oddqToAxial(q: number, r: number): Ax { return { x: q, z: r - ((q - (q & 1)) >> 1) } }
function axialToOddq(x: number, z: number): { q: number; r: number } { const q = x; const r = z + ((q - (q & 1)) >> 1); return { q, r } }

// Hex widget meta used only to compute default naming
function hxwKey(pid: string): string { return `pj-hx-widgets-${pid}` }
function hxwGetMeta(pid: string): Record<string, { type: string; q: number; r: number }> {
  try {
    const raw = JSON.parse(localStorage.getItem(hxwKey(pid)) || '{}') as Record<string, { type: string; q: number; r: number }>
    const meta: Record<string, { type: string; q: number; r: number }> = {}
    Object.entries(raw).forEach(([id, m]) => {
      const t = (m?.type || '')
      if (t === 'calendar') return
      if (t === 'tabbar') return
      meta[id] = m
    })
    if (Object.keys(meta).length !== Object.keys(raw).length) { try { localStorage.setItem(hxwKey(pid), JSON.stringify(meta)) } catch {} }
    return meta
  } catch { return {} }
}

// Picker library store (custom/flow widgets)
type LibEntry = { id: string; type: 'custom'|'flow'; name: string; shape: Array<[number,number]>; rgb?: [number,number,number]; alpha?: number; flowGraph?: any }
function userLibKey(uid: number): string { return `pj-wp-lib-user-${uid}` }
function userLibGet(uid: number): LibEntry[] { try { const v = JSON.parse(localStorage.getItem(userLibKey(uid))||'[]') as LibEntry[]; return Array.isArray(v)? v: [] } catch { return [] } }
function userLibSet(uid: number, list: LibEntry[]): void { try { localStorage.setItem(userLibKey(uid), JSON.stringify(list)) } catch {} }

export function renderWidgetCreate(container: HTMLElement): void {
  // Project-independent screen; if opened from project detail, a temporary pid may be provided for back navigation only
  let targetPid: string | null = null
  try { targetPid = sessionStorage.getItem('wc-target-pid') } catch {}
  // Resolve current user (for user-bound library)
  let uid: number | null = null
  const resolveUid = async (): Promise<number | null> => {
    if (uid != null) return uid
    try { const app: any = document.getElementById('app'); const m = app?._me; if (m && m.id) { uid = Number(m.id); return uid } } catch {}
    try { const me = await apiFetch<{ id: number }>(`/me`); try { (document.getElementById('app') as any)._me = me } catch {}; uid = me?.id ?? null; return uid } catch { return null }
  }

  container.innerHTML = `
    <div class="flex flex-col h-full min-h-[calc(100vh-0px)]">
      <header class="h-12 flex items-center gap-3 px-4 border-b border-neutral-700 bg-neutral-900/80 sticky top-0 z-10">
        <button id="wc-back" class="text-sm text-gray-300 hover:text-white">← 戻る</button>
        <h1 class="text-lg font-semibold">ウィジェット作成</h1>
        <div class="inline-flex items-center gap-1 bg-neutral-800/60 ring-1 ring-neutral-600 rounded ml-2">
          <button data-tab="logic" class="px-3 py-1 text-sm rounded bg-neutral-800/80 text-gray-100">機能</button>
          <button data-tab="design" class="px-3 py-1 text-sm rounded text-gray-300 hover:text-gray-100">見た目</button>
        </div>
        <input id="wc-name" class="ml-3 min-w-[200px] rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-1.5 text-gray-100" placeholder="名前（任意）" />
        <div class="ml-auto flex items-center gap-2">
          <button id="wc-cancel" class="text-sm text-gray-300 hover:text-white">キャンセル</button>
          <button id="wc-save" class="rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 disabled:opacity-50" disabled>保存</button>
        </div>
      </header>
      <div class="flex-1 grid grid-cols-[18rem_1fr] h-[calc(100vh-3rem)]">
        <aside class="border-r border-neutral-700 p-3 overflow-y-auto">
          <div class="text-sm text-gray-300 mb-3">ノードパレット</div>
          <div class="space-y-4">
            <div>
              <div class="text-[12px] text-gray-400 mb-1">Trigger</div>
              <div class="grid grid-cols-2 gap-2">
                <button class="px-2 py-1 text-left rounded bg-neutral-800/70 ring-1 ring-neutral-600 hover:bg-neutral-800" data-node="trigger:click">クリック</button>
                <button class="px-2 py-1 text-left rounded bg-neutral-800/70 ring-1 ring-neutral-600 hover:bg-neutral-800" data-node="trigger:cron">スケジュール</button>
              </div>
            </div>
            <div>
              <div class="text-[12px] text-gray-400 mb-1">Transform</div>
              <div class="grid grid-cols-2 gap-2">
                <button class="px-2 py-1 text-left rounded bg-neutral-800/70 ring-1 ring-neutral-600 hover:bg-neutral-800" data-node="transform:map">マップ</button>
                <button class="px-2 py-1 text-left rounded bg-neutral-800/70 ring-1 ring-neutral-600 hover:bg-neutral-800" data-node="transform:filter">フィルタ</button>
                <button class="px-2 py-1 text-left rounded bg-neutral-800/70 ring-1 ring-neutral-600 hover:bg-neutral-800" data-node="transform:template">テンプレート</button>
                <button class="px-2 py-1 text-left rounded bg-neutral-800/70 ring-1 ring-neutral-600 hover:bg-neutral-800" data-node="transform:datetime">日時計算</button>
              </div>
            </div>
            <div>
              <div class="text-[12px] text-gray-400 mb-1">Action</div>
              <div class="grid grid-cols-2 gap-2">
                <button class="px-2 py-1 text-left rounded bg-neutral-800/70 ring-1 ring-neutral-600 hover:bg-neutral-800" data-node="action:notify">通知</button>
              </div>
            </div>
          </div>
        </aside>
        <section class="relative">
          <div class="absolute inset-0 flex flex-col">
            <div id="wc-design-bar" class="shrink-0 p-3 border-b border-neutral-700 flex items-center gap-3">
              <div class="ml-auto flex items-center gap-2">
                <div class="text-xs text-gray-300">色</div>
                <div id="wc-colors" class="flex items-center gap-1.5"></div>
                <label class="ml-3 text-xs text-gray-300">濃さ
                  <input id="wc-alpha" type="range" min="0.20" max="0.70" step="0.02" value="0.38" class="align-middle ml-1">
                </label>
                <div class="ml-4 inline-flex items-center gap-1">
                  <button id="wc-clear" class="rounded bg-neutral-800/60 ring-2 ring-neutral-600 text-gray-200 text-xs font-medium px-2 py-1">クリア</button>
                  <button id="wc-t1" class="rounded bg-neutral-800/60 ring-2 ring-neutral-600 text-gray-200 text-xs font-medium px-2 py-1">1</button>
                  <button id="wc-t3" class="rounded bg-neutral-800/60 ring-2 ring-neutral-600 text-gray-200 text-xs font-medium px-2 py-1">3</button>
                  <button id="wc-t4" class="rounded bg-neutral-800/60 ring-2 ring-neutral-600 text-gray-200 text-xs font-medium px-2 py-1">4</button>
                  <button id="wc-t7" class="rounded bg-neutral-800/60 ring-2 ring-neutral-600 text-gray-200 text-xs font-medium px-2 py-1">7</button>
                </div>
              </div>
            </div>
            <div class="flex-1 relative">
              <div id="wc-board" class="absolute inset-0 overflow-hidden"></div>
              <div id="wcl-wrap" class="absolute inset-0 hidden">
                <div class="wcl-canvas absolute inset-0"></div>
                <svg class="wcl-svg absolute inset-0 w-full h-full pointer-events-none"></svg>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `

  const backToDetail = () => {
    // Clear target pid after use
    try { sessionStorage.removeItem('wc-target-pid') } catch {}
    // If a project pid was provided, return to detail; otherwise go back to project list
    if (targetPid) window.location.hash = `#/project/detail?id=${encodeURIComponent(targetPid)}`
    else window.location.hash = '#/project'
  }
  const backBtn = container.querySelector('#wc-back') as HTMLButtonElement | null
  backBtn?.addEventListener('click', backToDetail)
  const cancelBtn = container.querySelector('#wc-cancel') as HTMLButtonElement | null
  cancelBtn?.addEventListener('click', backToDetail)

  // Tabs: default logic; design tab controls board visibility
  const tabBtns = Array.from(container.querySelectorAll('[data-tab]')) as HTMLElement[]
  const designBar = container.querySelector('#wc-design-bar') as HTMLElement
  const boardWrap = container.querySelector('#wc-board') as HTMLElement
  const logicWrap = container.querySelector('#wcl-wrap') as HTMLElement
  function setTab(name: 'logic'|'design') {
    tabBtns.forEach((b) => {
      const on = (b.getAttribute('data-tab') === name)
      b.classList.toggle('bg-neutral-800/80', on)
      b.classList.toggle('text-gray-100', on)
      b.classList.toggle('text-gray-300', !on)
    })
    designBar.classList.toggle('hidden', name !== 'design')
    boardWrap.classList.toggle('hidden', name !== 'design')
    logicWrap.classList.toggle('hidden', name !== 'logic')
  }
  setTab('logic')
  tabBtns.forEach((b) => b.addEventListener('click', () => setTab((b.getAttribute('data-tab') as any)||'logic')))

  // Interactive design board
  const board = container.querySelector('#wc-board') as HTMLElement
  const nameInput = container.querySelector('#wc-name') as HTMLInputElement
  const saveBtn = container.querySelector('#wc-save') as HTMLButtonElement
  const clearBtn = container.querySelector('#wc-clear') as HTMLButtonElement
  const t1Btn = container.querySelector('#wc-t1') as HTMLButtonElement
  const t3Btn = container.querySelector('#wc-t3') as HTMLButtonElement
  const t4Btn = container.querySelector('#wc-t4') as HTMLButtonElement
  const t7Btn = container.querySelector('#wc-t7') as HTMLButtonElement
  const alphaInput = container.querySelector('#wc-alpha') as HTMLInputElement
  const colorsWrap = container.querySelector('#wc-colors') as HTMLElement

  const palette: Array<[number,number,number]> = [
    [59,130,246],[16,185,129],[239,68,68],[168,85,247],[251,146,60],[234,179,8],[99,102,241],[20,184,166],[14,165,233]
  ]
  let colorIdx = 1
  const renderPalette = () => {
    colorsWrap.innerHTML = ''
    palette.forEach(([r,g,b], i) => {
      const btt = document.createElement('button')
      btt.type = 'button'
      btt.title = `rgb(${r},${g},${b})`
      btt.style.width = '22px'; btt.style.height = '22px'; btt.style.borderRadius = '9999px'
      btt.style.border = i === colorIdx ? '2px solid #fff' : '2px solid rgba(255,255,255,.22)'
      btt.style.background = `rgb(${r},${g},${b})`
      btt.addEventListener('click', () => { colorIdx = i; renderPalette(); renderBoard() })
      colorsWrap.appendChild(btt)
    })
  }
  renderPalette()

  const TILE = 76
  const sx = Math.round(TILE * 0.75)
  const sy = Math.round(TILE * 0.866)
  const sel = new Set<string>()
  const key = (ax: number, az: number) => `${ax},${az}`
  sel.add('0,0')
  function axialToOddqLocal(ax: number, az: number): { q: number; r: number } { return axialToOddq(ax, az) }
  function oddqToAxialLocal(q: number, r: number): { x: number; z: number } { return oddqToAxial(q, r) }
  const center = () => { const w = board.clientWidth, h = board.clientHeight; return { x: Math.round(w/2), y: Math.round(h/2) } }
  const renderBoard = () => {
    const cen = center()
    board.innerHTML = ''
    const host = document.createElement('div')
    host.style.position = 'absolute'
    host.style.left = '0px'; host.style.top = '0px'
    host.style.width = '100%'; host.style.height = '100%'
    board.appendChild(host)
    const put = (q: number, r: number, ax: number, az: number, kind: 'sel'|'hint') => {
      const x = q * sx
      const y = Math.round((r + (q % 2 ? 0.5 : 0)) * sy)
      const hex = document.createElement('div')
      hex.className = 'hxw-hex'
      hex.style.position = 'absolute'
      hex.style.left = `${cen.x + x - TILE/2}px`
      hex.style.top = `${cen.y + y - TILE/2}px`
      hex.style.width = `${TILE}px`
      hex.style.height = `${Math.round(TILE*0.866)}px`
      const clip = document.createElement('div')
      clip.className = 'hxw-clip hx-svgclip'
      const [r0,g0,b0] = palette[colorIdx]
      const a = Math.max(0, Math.min(1, parseFloat(alphaInput.value) || 0.38))
      if (kind === 'sel') {
        const col = `rgba(${r0},${g0},${b0}, ${a})`
        const f = deriveFacets(col)
        clip.style.color = col
        ;(clip.style as any).setProperty('--hx-side', f.side)
        ;(clip.style as any).setProperty('--hx-hi',   f.hi)
        ;(clip.style as any).setProperty('--hx-edge', f.side)
        clip.innerHTML = honeyHexFilledSvg()
        const canRemove = (() => {
          const k = key(ax, az)
          if (k === '0,0') return false
          if (!sel.has(k)) return false
          const nbrs: Array<[number,number]> = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]
          const rest = new Set<string>(Array.from(sel))
          rest.delete(k)
          if (!rest.size) return false
          if (!rest.has('0,0')) return false
          const q: Array<[number,number]> = [[0,0]]
          const seen = new Set<string>(['0,0'])
          while (q.length) {
            const [x,z] = q.shift() as [number,number]
            for (const [dx,dz] of nbrs) {
              const nk = key(x+dx, z+dz)
              if (!rest.has(nk) || seen.has(nk)) continue
              seen.add(nk); q.push([x+dx, z+dz])
            }
          }
          return seen.size === rest.size
        })()
        if (canRemove) {
          const del = document.createElement('button')
          del.type = 'button'
          del.title = '削除'
          del.textContent = '×'
          del.style.position = 'absolute'
          del.style.inset = '0'
          del.style.display = 'grid'
          ;(del.style as any).placeItems = 'center'
          del.style.background = 'transparent'
          del.style.border = 'none'
          del.style.borderRadius = '6px'
          del.style.color = 'rgba(255,255,255,0.95)'
          del.style.fontSize = `${Math.round(TILE*0.38)}px`
          del.style.lineHeight = '1'
          del.style.cursor = 'pointer'
          del.style.zIndex = '3'
          del.addEventListener('mousedown', (e) => { e.stopPropagation() })
          del.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); sel.delete(key(ax,az)); renderBoard(); updateSave() })
          hex.appendChild(del)
        }
      } else {
        const light = (document.documentElement.getAttribute('data-theme') || 'dark') !== 'dark'
        const hint = light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'
        const f = deriveFacets(hint)
        clip.style.color = hint
        ;(clip.style as any).setProperty('--hx-side', f.side)
        ;(clip.style as any).setProperty('--hx-hi',   f.hi)
        ;(clip.style as any).setProperty('--hx-edge', f.side)
        clip.innerHTML = honeyHexEmptySvg()
        const plus = document.createElement('div')
        plus.textContent = '＋'
        plus.style.position = 'absolute'; plus.style.inset = '0'; plus.style.display = 'grid'; (plus.style as any).placeItems = 'center'
        plus.style.color = light ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)'
        plus.style.fontSize = `${Math.round(TILE*0.28)}px`
        plus.style.pointerEvents = 'none'
        hex.appendChild(plus)
        hex.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); sel.add(key(ax,az)); renderBoard(); updateSave() })
      }
      hex.appendChild(clip)
      host.appendChild(hex)
    }
    const selCells: Array<[number,number]> = Array.from(sel).map(s => { const [ax,az] = s.split(',').map(Number); return [ax,az] as [number,number] })
    const nbrs: Array<[number,number]> = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]
    selCells.forEach(([ax,az]) => { const o = axialToOddqLocal(ax, az); put(o.q, o.r, ax, az, 'sel') })
    const hints = new Set<string>()
    selCells.forEach(([ax,az]) => { nbrs.forEach(([dx,dz]) => { const k2 = key(ax+dx, az+dz); if (!sel.has(k2)) hints.add(k2) }) })
    hints.forEach((k2) => { const [ax,az] = k2.split(',').map(Number); const o = axialToOddqLocal(ax, az); put(o.q, o.r, ax, az, 'hint') })
  }
  const setShape = (shape: Array<[number,number]>) => { sel.clear(); shape.forEach(([ax,az]) => sel.add(key(ax,az))); renderBoard(); updateSave() }
  const updateSave = () => { const hasName = (nameInput?.value || '').trim().length > 0; saveBtn.disabled = (sel.size === 0) || !hasName }
  renderBoard(); updateSave()
  nameInput?.addEventListener('input', updateSave)
  try { requestAnimationFrame(() => { try { renderBoard() } catch {} }) } catch {}
  try { const ro = new ResizeObserver(() => { try { renderBoard() } catch {} }); ro.observe(board) } catch {}

  // Default name like ウィジェットN (based on user library size)
  ;(async () => {
    try {
      const id = await resolveUid()
      const count = id != null ? userLibGet(id).length : 0
      const def = `ウィジェット${count + 1}`
      if (nameInput && !(nameInput.value || '').trim()) { nameInput.value = def; updateSave() }
    } catch {}
  })()
  clearBtn.addEventListener('click', () => { sel.clear(); renderBoard(); updateSave() })
  t1Btn.addEventListener('click', () => setShape([[0,0]]))
  t3Btn.addEventListener('click', () => setShape([[0,0],[1,0],[0,1]]))
  t4Btn.addEventListener('click', () => setShape([[0,0],[1,0],[0,1],[1,1]]))
  t7Btn.addEventListener('click', () => { setShape([[0,0],[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]]) })
  alphaInput.addEventListener('input', () => renderBoard())
  window.addEventListener('resize', () => renderBoard())

  // Logic editor (minimal)
  type WcNode = { id: string; kind: 'trigger'|'action'; type: string; x: number; y: number; label?: string }
  type WcEdge = { from: string; to: string }
  const g: { nodes: WcNode[]; edges: WcEdge[] } = { nodes: [], edges: [] }
  let pending: string | null = null
  let temp: SVGPathElement | null = null
  const lCanvas = container.querySelector('.wcl-canvas') as HTMLElement
  try { (lCanvas.style as any).touchAction = 'none' } catch {}
  const lSvg = container.querySelector('.wcl-svg') as SVGSVGElement
  const addNode = (kind: 'trigger'|'action', type: string, x: number, y: number, label: string) => {
    const id = `n-${Date.now()}-${Math.floor(Math.random()*999)}`
    g.nodes.push({ id, kind, type, x, y, label }); drawNodes(); drawEdges()
  }
  const drawNodes = () => {
    lCanvas.innerHTML = ''
    const portSize = 8
    g.nodes.forEach((n) => {
      const el = document.createElement('div')
      el.className = 'flow-node absolute select-none'
      el.style.left = `${n.x}px`; el.style.top = `${n.y}px`; el.style.width = '200px'; el.style.height = '120px'
      el.style.display = 'grid'; (el.style as any).placeItems = 'center'
      el.style.background = 'transparent'
      el.setAttribute('data-node', n.id)
      const visualKind = (n.type === 'expr' || n.type === 'condition') ? 'transform' : (n.kind === 'trigger' ? 'trigger' : 'action')
      const outline = visualKind === 'trigger' ? '#10b981' : (visualKind === 'transform' ? '#d946ef' : '#38bdf8')
      let shapeStyle = `position:absolute; inset:0; background: rgba(38,38,38,.8);`
      if (visualKind !== 'action') shapeStyle += ` box-shadow: 0 0 0 2px ${outline};`
      if (visualKind === 'trigger') shapeStyle += ' clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);'
      else if (visualKind === 'transform') shapeStyle += ' clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);'
      else shapeStyle += ' border-radius: 12px;'
      el.innerHTML = `
        <div class="fn-shape" style="${shapeStyle}"></div>
        <div class="fn-bar absolute top-1 right-1" style="z-index:8">
          <button class="fn-del text-rose-500 hover:text-rose-400 text-lg leading-none" title="削除">×</button>
        </div>
        <div class="fn-body text-xs text-gray-100 text-center" style="position:absolute; inset:0; display:grid; place-items:center; z-index:1; pointer-events:none;">
          <div class="text-[13px] font-semibold">${n.label || n.type}</div>
        </div>
        <div class="fn-ports" style="position:absolute; inset:0; z-index:7; pointer-events:none;">
          ${n.kind !== 'trigger' ? `<div class=\"port-in absolute left-1/2 -translate-x-1/2 rounded-full ring-2 ring-neutral-500\" style=\"top:2px;width:${portSize}px;height:${portSize}px;background:#38bdf8; pointer-events:auto;\"></div>` : ''}
          <div class="port-out absolute left-1/2 -translate-x-1/2 rounded-full ring-2 ring-neutral-500" style="bottom:2px;width:${portSize}px; height:${portSize}px; background:#34d399; pointer-events:auto;"></div>
        </div>`
      lCanvas.appendChild(el)
      const head = el.querySelector('.fn-bar') as HTMLElement | null
      const startDragNode = (ev: MouseEvent) => {
        ev.preventDefault()
        const base = lCanvas.getBoundingClientRect(); const r = el.getBoundingClientRect()
        const offX = (ev as MouseEvent).clientX - r.left; const offY = (ev as MouseEvent).clientY - r.top
        const onMove = (e: MouseEvent) => {
          n.x = Math.max(0, Math.min(base.width - r.width, e.clientX - base.left - offX))
          n.y = Math.max(0, Math.min(base.height - r.height, e.clientY - base.top - offY))
          el.style.left = `${n.x}px`; el.style.top = `${n.y}px`
          drawEdges()
        }
        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
      }
      head?.addEventListener('mousedown', (e) => startDragNode(e as MouseEvent))
      // Drag from anywhere on node except ports or delete button
      el.addEventListener('mousedown', (e) => {
        const t = e.target as HTMLElement
        if (t.closest('.port-in') || t.closest('.port-out') || t.closest('.fn-del')) return
        startDragNode(e as MouseEvent)
      })
      const del = el.querySelector('.fn-del') as HTMLElement | null
      del?.addEventListener('click', () => { g.nodes = g.nodes.filter(x => x.id !== n.id); g.edges = g.edges.filter(x => x.from !== n.id && x.to !== n.id); drawNodes(); drawEdges() })
      // simple connect: click out then in（ドラッグ接続も後段で付与）
      const out = el.querySelector('.port-out') as HTMLElement | null
      out?.addEventListener('click', (ev) => { ev.stopPropagation(); pending = n.id })
      const inp = el.querySelector('.port-in') as HTMLElement | null
      inp?.addEventListener('click', (ev) => {
        ev.stopPropagation()
        if (!pending) return
        const from = pending
        const to = n.id
        if (from === to) { pending = null; return }
        if (!g.edges.find(e => e.from === from && e.to === to)) g.edges.push({ from, to })
        pending = null
        drawEdges()
      })
    })
    // drag-to-connect from any port-out
    const startDrag = (originPort: HTMLElement, e: MouseEvent) => {
      const origin = originPort.closest('.flow-node') as HTMLElement | null
      pending = origin?.getAttribute('data-node') || ''
      if (!pending) return
      if (temp) { try { temp.remove() } catch {} }
      temp = document.createElementNS('http://www.w3.org/2000/svg','path')
      temp.setAttribute('stroke','#f59e0b'); temp.setAttribute('stroke-width','2'); temp.setAttribute('fill','none')
      lSvg.appendChild(temp)
      const base = lCanvas.getBoundingClientRect(); const r0 = (originPort as HTMLElement).getBoundingClientRect()
      const a = { x: r0.left - base.left + r0.width/2, y: r0.top - base.top + r0.height/2 }
      const mk = (mx:number,my:number) => { const dx=(mx-a.x)*0.5; const c1x=a.x,c1y=a.y+Math.max(10,Math.abs(dx))*0.15; const c2x=mx,c2y=my-Math.max(10,Math.abs(dx))*0.15; return `M ${a.x} ${a.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${mx} ${my}` }
      const onMove = (ev:MouseEvent) => { const mx=ev.clientX-base.left, my=ev.clientY-base.top; temp!.setAttribute('d', mk(mx,my)) }
      const onUp = (ev:MouseEvent) => {
        window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp)
        try {
          let target: HTMLElement | null = null
          try { const els = document.elementsFromPoint(ev.clientX, ev.clientY) as HTMLElement[]; target = (els.find(el => (el as any).classList?.contains('port-in')) as HTMLElement) || null } catch {}
          if (!target) {
            const ports = Array.from(lCanvas.querySelectorAll('.port-in')) as HTMLElement[]
            const b = lCanvas.getBoundingClientRect()
            let best: { el: HTMLElement; d2: number } | null = null
            ports.forEach(pi => { const rr=pi.getBoundingClientRect(); const cx=rr.left-b.left+rr.width/2, cy=rr.top-b.top+rr.height/2; const dx=(ev.clientX-b.left)-cx, dy=(ev.clientY-b.top)-cy; const d2=dx*dx+dy*dy; if (!best||d2<best.d2) best={el:pi,d2} })
            if (best && Math.sqrt(best.d2) <= 44) target = best.el
          }
          if (target) {
            const to = (target.closest('.flow-node') as HTMLElement | null)?.getAttribute('data-node') || ''
            if (to && to !== pending && !g.edges.find(e => e.from===pending && e.to===to)) { g.edges.push({ from: pending, to }); drawEdges() }
          } else { try { (origin as HTMLElement).style.transition='transform .08s'; (origin as HTMLElement).style.transform='translateX(-4px)'; setTimeout(()=>{ (origin as HTMLElement).style.transform='' }, 90) } catch {} }
        } finally { try { temp?.remove() } catch {}; temp=null; pending=null }
      }
      window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
    }
    lCanvas.querySelectorAll('.port-out').forEach((po) => {
      po.addEventListener('mousedown', (e) => { startDrag(po as HTMLElement, e as MouseEvent) })
    })
  }
  const drawEdges = () => {
    lSvg.innerHTML = ''
    const base = lCanvas.getBoundingClientRect()
    const getCenter = (id: string, which: 'in'|'out') => {
      const nodeEl = lCanvas.querySelector(`[data-node="${id}"]`) as HTMLElement | null
      if (!nodeEl) return null
      const r = nodeEl.getBoundingClientRect()
      if (which === 'out') return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height }
      return { x: r.left - base.left + r.width / 2, y: r.top - base.top }
    }
    const mkPath = (a:{x:number;y:number}, b:{x:number;y:number}) => { const dx=(b.x-a.x)*0.5; const c1x=a.x, c1y=a.y+Math.max(10,Math.abs(dx))*0.15; const c2x=b.x, c2y=b.y-Math.max(10,Math.abs(dx))*0.15; return `M ${a.x} ${a.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${b.x} ${b.y}` }
    g.edges.forEach(e => { const a = getCenter(e.from,'out'); const b = getCenter(e.to,'in'); if (!a||!b) return; const p = document.createElementNS('http://www.w3.org/2000/svg','path'); p.setAttribute('d', mkPath(a,b)); p.setAttribute('stroke','#34d399'); p.setAttribute('stroke-width','2'); p.setAttribute('fill','none'); lSvg.appendChild(p) })
  }
  // Palette buttons to add nodes
  container.querySelectorAll('[data-node]')?.forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = (btn as HTMLElement).getAttribute('data-node') || ''
      const add = (k:'trigger'|'action', t:string, label:string) => addNode(k, t, k==='trigger'?24:220, k==='trigger'?24:140, label)
      if (val.startsWith('trigger:')) {
        const t = val.split(':')[1]
        if (t === 'click') add('trigger','manual','Manual')
        else if (t === 'cron') add('trigger','timer','Timer')
      } else if (val.startsWith('action:')) {
        const t = val.split(':')[1]
        if (t === 'notify' || t === 'ui' || t === 'db') add('action','notify','Notify')
      } else if (val.startsWith('transform:')) {
        const t = val.split(':')[1]
        if (t === 'map' || t === 'filter' || t === 'template' || t === 'datetime') add('action','expr','Expr')
      }
    })
  })
  drawNodes(); drawEdges()

  // Save to library and go back
  saveBtn.addEventListener('click', async (e) => {
    e.preventDefault()
    if (sel.size === 0) return
    const shape: Array<[number,number]> = Array.from(sel).map(s => s.split(',').map(n => parseInt(n,10)) as [number,number])
    const rgb = palette[colorIdx]
    const alpha = parseFloat(alphaInput.value) || 0.38
    const name = (nameInput?.value || '').trim()
    const wantFlow = g.nodes.length > 0
    const entry: LibEntry = { id: `lib-${Date.now()}`, type: wantFlow ? 'flow' : 'custom', name, shape, rgb: [rgb[0], rgb[1], rgb[2]], alpha, flowGraph: wantFlow ? { nodes: g.nodes, edges: g.edges } : undefined }
    try {
      const id = await resolveUid()
      if (id != null) { const list = userLibGet(id); list.push(entry); userLibSet(id, list) }
    } catch {}
    backToDetail()
  })

  // Finish any route-loading overlay triggered before navigation after a short delay
  try { setTimeout(() => { try { hideRouteLoading() } catch {} }, 800) } catch { try { hideRouteLoading() } catch {} }
}
