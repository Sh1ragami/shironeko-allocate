import { apiFetch } from '../../utils/api'
import { openTaskModal } from './task-modal'
import { openTabPickerModal, type TabTemplate } from './tabs'

type Project = {
  id: number
  name: string
  description?: string
  link_repo?: string
  github_meta?: { full_name?: string; html_url?: string; language?: string; private?: boolean } | null
}

function parseHashQuery(): Record<string, string> {
  const [, query = ''] = window.location.hash.split('?')
  const params = new URLSearchParams(query)
  const out: Record<string, string> = {}
  params.forEach((v, k) => (out[k] = v))
  return out
}

export async function renderProjectDetail(container: HTMLElement): Promise<void> {
  container.innerHTML = `<div class="min-h-screen bg-neutral-900 text-gray-100 grid"><div class="p-8">読み込み中...</div></div>`

  const { id } = parseHashQuery()
  if (!id) {
    container.innerHTML = `<div class="p-8 text-rose-400">プロジェクトIDが指定されていません。</div>`
    return
  }

  let project: Project | null = null
  try {
    project = await apiFetch<Project>(`/projects/${id}`)
  } catch (e) {
    // Fallback to dummy detail layout when not found
    renderDummyDetail(container, id)
    return
  }

  const fullName = project.github_meta?.full_name || project.link_repo || ''

  container.innerHTML = detailLayout({ id: project.id, name: project.name, fullName })

  setupTabs(container, String(project.id))

  // DnD (Summary widgets)
  enableDragAndDrop(container)

  // Kanban board
  renderKanban(container, String(project.id))
  // Load saved custom tabs
  loadCustomTabs(container, String(project.id))

  // Account avatar click from detail -> open account settings
  container.querySelector('#accountTopBtn')?.addEventListener('click', () => {
    localStorage.setItem('openAccountModal', '1')
    window.location.hash = '#/project'
  })

  // Load collaborators avatars
  loadCollaborators(container, project.id)

  // Bind add collaborator popover
  const addBtn = container.querySelector('#addCollabBtn') as HTMLElement | null
  addBtn?.addEventListener('click', (e) => openCollaboratorPopover(container, project.id, e.currentTarget as HTMLElement))

  // Load data for widgets from GitHub proxy
  if (fullName) {
    try {
      const repo = await apiFetch<any>(`/github/repo?full_name=${encodeURIComponent(fullName)}`)
      hydrateOverview(container, repo)
      const contr = await apiFetch<any[]>(`/github/contributors?full_name=${encodeURIComponent(fullName)}`)
      hydrateCommitters(container, contr)
      const res = await fetch(`/api/github/readme?full_name=${encodeURIComponent(fullName)}&ref=${encodeURIComponent(repo.default_branch ?? '')}`)
      const readmeText = await res.text()
      hydrateReadme(container, readmeText)
    } catch {
      // ignore
    }
  }

  // Top header: path + account avatar
  try {
    const me = await apiFetch<{ id: number; name: string; github_id?: number }>(`/me`)
    const owner = fullName.includes('/') ? fullName.split('/')[0] : me.name
    const repo = fullName.includes('/') ? fullName.split('/')[1] : project.name
    const pathUser = container.querySelector('#topPathUser') as HTMLElement | null
    const pathRepo = container.querySelector('#topPathRepo') as HTMLElement | null
    const title = container.querySelector('#pageTitle') as HTMLElement | null
    const accImg = container.querySelector('#accountTopImg') as HTMLImageElement | null
    if (pathUser) pathUser.textContent = owner
    if (pathRepo) pathRepo.textContent = repo
    if (title) title.textContent = project.name
    if (me.github_id) {
      const url = `https://avatars.githubusercontent.com/u/${me.github_id}?s=96`
      if (accImg) { accImg.src = url; accImg.classList.remove('hidden') }
    }
  } catch {}
}

// ---------- Widgets helpers ----------

function widgetShell(id: string, title: string, body: string): string {
  return `
    <div class="widget group rounded-xl ring-1 ring-neutral-800/70 bg-neutral-900/50 p-4 md:col-span-6" draggable="true" data-widget="${id}">
      <div class="flex items-center mb-3">
        <div class="text-sm text-gray-300">${title}</div>
        <div class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 text-xs flex items-center gap-1">
          <span class="hidden md:inline">サイズ:</span>
          <button class="w-size px-1 py-0.5 rounded ring-1 ring-neutral-700/60 hover:bg-neutral-800" data-size="sm">S</button>
          <button class="w-size px-1 py-0.5 rounded ring-1 ring-neutral-700/60 hover:bg-neutral-800" data-size="md">M</button>
          <button class="w-size px-1 py-0.5 rounded ring-1 ring-neutral-700/60 hover:bg-neutral-800" data-size="lg">L</button>
          <span class="ml-2">ドラッグで並べ替え</span>
        </div>
      </div>
      ${body}
    </div>
  `
}

function addWidgetCard(): string {
  return `<button id="addWidget" class="rounded-xl ring-1 ring-neutral-800/70 bg-neutral-900/40 grid place-items-center text-gray-400 h-72">ウィジェット追加<br/><span class="text-3xl">＋</span></button>`
}

function contributionWidget(): string {
  // simple placeholder heatmap
  const rows = 7, cols = 52
  const cells = Array.from({ length: rows * cols }, () => {
    const v = Math.floor(Math.random() * 5)
    const color = ['bg-neutral-800','bg-emerald-900','bg-emerald-800','bg-emerald-700','bg-emerald-600'][v]
    return `<div class="w-3 h-3 ${color} rounded-sm"></div>`
  }).join('')
  return `<div class="h-72 overflow-x-auto"><div class="inline-grid" style="grid-template-columns: repeat(${cols}, 0.75rem); gap: 4px;">${cells}</div></div>`
}

function overviewSkeleton(): string {
  return `<div class="space-y-3">
    <div class="h-3 rounded bg-neutral-800"></div>
    <div class="h-3 rounded bg-neutral-800 w-2/3"></div>
  </div>`
}

function barSkeleton(): string {
  return `<div class="h-60 grid place-items-center text-gray-400">Loading...</div>`
}

function readmeSkeleton(): string {
  return `<div class="h-72 overflow-auto rounded bg-neutral-950/40 ring-1 ring-neutral-800/70 p-4 text-gray-200 whitespace-pre-wrap">Loading README...</div>`
}

function hydrateOverview(root: HTMLElement, repo: any): void {
  const el = root.querySelector('[data-widget="overview"]') as HTMLElement | null
  if (!el) return
  el.innerHTML = widgetShell('overview', 'Overview', `
    <div class="grid gap-6 md:grid-cols-2">
      <div>
        <div class="text-sm text-gray-300 mb-2">Open issues</div>
        <div class="h-2 rounded bg-neutral-800">
          <div class="h-full bg-emerald-600 rounded" style="width:${Math.min(100, (repo.open_issues_count || 0))}%"></div>
        </div>
      </div>
      <div>
        <div class="text-sm text-gray-300 mb-2">Default branch</div>
        <div class="text-gray-200">${repo.default_branch || '-'}</div>
      </div>
    </div>
    <div class="mt-4 text-xs text-gray-400">Language: ${repo.language || 'N/A'} / Stars: ${repo.stargazers_count || 0}</div>
  `)
}

function hydrateCommitters(root: HTMLElement, list: any[]): void {
  const el = root.querySelector('[data-widget="committers"] .h-60') as HTMLElement | null
  if (!el) return
  const top = list.slice(0, 6)
  const bars = top.map((c) => c.contributions || 0)
  const max = Math.max(1, ...bars)
  el.innerHTML = `
    <div class="grid grid-cols-${Math.max(3, top.length)} gap-3 w-full h-full items-end">
      ${top
        .map(
          (c) => `
        <div class="flex flex-col items-center gap-2">
          <div class="w-10 bg-emerald-700 rounded" style="height:${(100 * (c.contributions || 0)) / max}%"></div>
          <img src="${c.avatar_url}" class="w-8 h-8 rounded-full"/>
        </div>`,
        )
        .join('')}
    </div>`
}

function hydrateReadme(root: HTMLElement, text: string): void {
  const el = root.querySelector('[data-widget="readme"] .whitespace-pre-wrap') as HTMLElement | null
  if (!el) return
  el.textContent = text || 'README not found'
}

function enableDragAndDrop(root: HTMLElement): void {
  const grid = root.querySelector('#widgetGrid') as HTMLElement | null
  if (!grid) return
  const pid = grid.getAttribute('data-pid') || '0'
  let dragEl: HTMLElement | null = null

  const save = () => {
    const order = Array.from(grid.querySelectorAll('.widget')).map((w) => w.getAttribute('data-widget'))
    localStorage.setItem(`pj-widgets-${pid}`, JSON.stringify(order))
  }

  const load = () => {
    const raw = localStorage.getItem(`pj-widgets-${pid}`)
    if (!raw) return
    try {
      const order = JSON.parse(raw) as string[]
      order.forEach((id) => {
        const node = grid.querySelector(`[data-widget="${id}"]`)
        if (node) grid.appendChild(node)
      })
    } catch {}
  }

  grid.addEventListener('dragstart', (e) => {
    const t = e.target as HTMLElement
    if (t.classList.contains('widget')) dragEl = t
  })
  grid.addEventListener('dragover', (e) => {
    e.preventDefault()
    const t = e.target as HTMLElement
    const widget = t.closest('.widget') as HTMLElement | null
    if (!widget || !dragEl || widget === dragEl) return
    const rect = widget.getBoundingClientRect()
    const before = (e as DragEvent).clientY < rect.top + rect.height / 2
    if (before) grid.insertBefore(dragEl, widget)
    else grid.insertBefore(dragEl, widget.nextSibling)
  })
  grid.addEventListener('drop', () => save())

  load()
  applyWidgetSizes(root, pid)
  ensureWidgets(root, pid)

  // Add widget button
  grid.querySelector('#addWidget')?.addEventListener('click', () => openWidgetPickerModal(root, pid))

  // Size change controls
  grid.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.w-size') as HTMLElement | null
    if (!btn) return
    const size = btn.getAttribute('data-size') as 'sm' | 'md' | 'lg'
    const widget = btn.closest('.widget') as HTMLElement | null
    if (!widget) return
    const id = widget.getAttribute('data-widget') || ''
    setWidgetSize(root, pid, id, size)
  })
}

type WidgetSize = 'sm' | 'md' | 'lg'

type WidgetMeta = { size: WidgetSize; type?: string }

function getWidgetMeta(pid: string): Record<string, WidgetMeta> {
  try { return JSON.parse(localStorage.getItem(`pj-widgets-meta-${pid}`) || '{}') as Record<string, WidgetMeta> } catch { return {} }
}

function setWidgetMeta(pid: string, meta: Record<string, WidgetMeta>): void {
  localStorage.setItem(`pj-widgets-meta-${pid}`, JSON.stringify(meta))
}

function setWidgetSize(root: HTMLElement, pid: string, id: string, size: WidgetSize): void {
  const meta = getWidgetMeta(pid)
  meta[id] = { size }
  setWidgetMeta(pid, meta)
  applyWidgetSizes(root, pid)
}

function applyWidgetSizes(root: HTMLElement, pid: string): void {
  const meta = getWidgetMeta(pid)
  root.querySelectorAll('.widget').forEach((w) => {
    const id = (w as HTMLElement).getAttribute('data-widget') || ''
    const size = meta[id]?.size || 'md'
    const cls = (w as HTMLElement).classList
    // remove previous spans
    cls.remove('md:col-span-4', 'md:col-span-6', 'md:col-span-12')
    if (size === 'sm') cls.add('md:col-span-4')
    else if (size === 'lg') cls.add('md:col-span-12')
    else cls.add('md:col-span-6')
  })
}

function ensureWidgets(root: HTMLElement, pid: string): void {
  const grid = root.querySelector('#widgetGrid') as HTMLElement | null
  if (!grid) return
  const meta = getWidgetMeta(pid)
  const have = new Set(Array.from(grid.querySelectorAll('.widget')).map((n) => (n as HTMLElement).getAttribute('data-widget') || ''))
  Object.entries(meta).forEach(([id, m]) => {
    if (!m.type) return
    if (have.has(id)) return
    const node = widgetShell(id, widgetTitle(m.type), buildWidgetBody(m.type))
    const t = document.createElement('template')
    t.innerHTML = node
    const card = t.content.firstElementChild
    if (card) grid.insertBefore(card, grid.querySelector('#addWidget'))
  })
}

function openWidgetPickerModal(root: HTMLElement, pid: string): void {
  const overlay = document.createElement('div')
  overlay.className = 'fixed inset-0 z-[66] bg-black/60 backdrop-blur-[1px] grid place-items-center'
  overlay.innerHTML = `
    <div class="relative w-[min(1100px,96vw)] max-h-[88vh] overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-neutral-700/70 shadow-2xl text-gray-100">
      <header class="h-12 flex items-center px-5 border-b border-neutral-800/70">
        <h3 class="text-lg font-semibold">ウィジェット一覧</h3>
        <button id="wp-close" class="ml-auto text-2xl text-neutral-300 hover:text-white">×</button>
      </header>
      <div class="flex">
        <aside class="w-64 shrink-0 p-4 border-r border-neutral-800/70">
          <button class="w-full text-left px-3 py-2 rounded bg-neutral-800/70 ring-1 ring-neutral-700/60 text-sm">すべて</button>
        </aside>
        <section class="flex-1 p-8 overflow-y-auto">
          <div class="grid grid-cols-3 lg:grid-cols-4 auto-rows-min gap-x-12 gap-y-10">
            ${widgetCard('readme', 'README表示')}
            ${widgetCard('overview', 'オーバービュー')}
            ${widgetCard('contrib', 'コントリビューショングラフ')}
            ${widgetCard('committers', 'ユーザーコミットグラフ')}
          </div>
        </section>
      </div>
    </div>
  `
  const close = () => overlay.remove()
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#wp-close')?.addEventListener('click', close)
  overlay.querySelectorAll('[data-widget-type]')?.forEach((el) => {
    el.addEventListener('click', () => {
      const type = (el as HTMLElement).getAttribute('data-widget-type')!
      addWidget(root, pid, type)
      close()
    })
  })
  document.body.appendChild(overlay)
}

function widgetCard(type: string, title: string): string {
  return `
    <button data-widget-type="${type}" class="group block rounded-xl overflow-hidden ring-1 ring-neutral-700/60 hover:ring-emerald-600 transition">
      <div class="h-40 md:h-44 bg-neutral-800/80 grid place-items-center text-gray-300 relative px-2">
        ${widgetThumb(type)}
      </div>
      <div class="px-2 py-2 text-center text-sm font-medium">${title}</div>
    </button>
  `
}

function widgetThumb(type: string): string {
  if (type === 'contrib') return `<div class=\"w-full h-24 overflow-hidden\"><div class=\"grid\" style=\"grid-template-columns: repeat(30, 0.5rem); gap: 2px;\">${Array.from({length:210}).map(()=>'<div class=\\"w-2 h-2 bg-emerald-700\\"></div>').join('')}</div></div>`
  if (type === 'overview') return `<div class=\"w-full h-20 bg-neutral-900/60 ring-1 ring-neutral-700/60 rounded\"></div>`
  if (type === 'committers') return `<div class=\"w-full h-24 flex items-end gap-1\">${[4,8,12,6,2].map(h=>`<div class=\\"w-5 bg-emerald-700\\" style=\\"height:${h * 6}px\\"></div>`).join('')}</div>`
  if (type === 'readme') return `<div class=\"w-full h-24 bg-neutral-900/60 ring-1 ring-neutral-700/60 rounded\"></div>`
  return `<div class=\"text-gray-400\">Widget</div>`
}

function addWidget(root: HTMLElement, pid: string, type: string): void {
  const id = `w-${type}-${Date.now()}`
  const grid = root.querySelector('#widgetGrid') as HTMLElement
  const html = widgetShell(id, widgetTitle(type), buildWidgetBody(type))
  const t = document.createElement('template')
  t.innerHTML = html
  const el = t.content.firstElementChild
  if (el) grid.insertBefore(el, grid.querySelector('#addWidget'))
  // persist order
  const order = Array.from(grid.querySelectorAll('.widget')).map((w) => (w as HTMLElement).getAttribute('data-widget'))
  localStorage.setItem(`pj-widgets-${pid}`, JSON.stringify(order))
  // persist meta (size default M and type)
  const meta = getWidgetMeta(pid)
  meta[id] = { size: 'md', type }
  setWidgetMeta(pid, meta)
}

function widgetTitle(type: string): string {
  switch (type) {
    case 'readme': return 'README'
    case 'overview': return 'Overview'
    case 'contrib': return 'Contributions'
    case 'committers': return 'Top Committers'
    default: return 'Widget'
  }
}

function buildWidgetBody(type: string): string {
  switch (type) {
    case 'readme': return readmeSkeleton()
    case 'overview': return overviewSkeleton()
    case 'contrib': return contributionWidget()
    case 'committers': return barSkeleton()
    default: return `<div class=\"h-40 grid place-items-center text-gray-400\">Mock</div>`
  }
}

// ---------- Fallback dummy detail ----------
function renderDummyDetail(container: HTMLElement, id: string): void {
  const name = 'Untitled Project'
  const fullName = ''
  container.innerHTML = detailLayout({ id: Number(id), name, fullName })
  setupTabs(container, id)
  enableDragAndDrop(container)
  renderKanban(container, id)
}

function detailLayout(ctx: { id: number; name: string; fullName: string }): string {
  return `
    <div class="min-h-screen bg-neutral-900 text-gray-100">
      <!-- Top global bar -->
      <div class="h-14 bg-neutral-950/90 ring-1 ring-neutral-800/80 flex items-center px-6">
        <div class="flex items-center gap-3">
          <!-- App logo circle -->
          <div class="w-10 h-10 rounded-full bg-neutral-800 ring-1 ring-neutral-700/70 grid place-items-center">
            <div class="grid grid-cols-3 grid-rows-3 gap-0.5 text-white/90">
              <div class="w-1.5 h-1.5 bg-white/90 col-start-2 row-start-1"></div>
              <div class="w-1.5 h-1.5 bg-white/90 col-start-1 row-start-2"></div>
              <div class="w-1.5 h-1.5 bg-white/90 col-start-2 row-start-2"></div>
              <div class="w-1.5 h-1.5 bg-white/90 col-start-3 row-start-2"></div>
              <div class="w-1.5 h-1.5 bg-white/90 col-start-2 row-start-3"></div>
            </div>
          </div>
          <a href="#/project" class="text-sm text-gray-300 hover:text-white" id="topPathUser">User</a>
          <span class="text-gray-500">/</span>
          <span class="text-sm text-gray-300" id="topPathRepo">Repo</span>
        </div>
        <button id="accountTopBtn" class="ml-auto w-9 h-9 rounded-full overflow-hidden bg-neutral-700 ring-1 ring-neutral-700/70">
          <img id="accountTopImg" class="w-full h-full object-cover hidden" alt="avatar" />
        </button>
      </div>

      <!-- Secondary header with title and actions -->
      <div class="px-6 py-6 ring-1 ring-neutral-800/80 bg-neutral-900/80">
        <div class="flex items-center">
          <h1 id="pageTitle" class="text-2xl md:text-3xl font-semibold">${ctx.name}</h1>
          <div class="ml-auto flex items-center gap-4">
            <div id="collabAvatars" class="flex items-center gap-2"></div>
            <button id="addCollabBtn" class="relative rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 shadow">コラボレーター追加</button>
          </div>
        </div>
        <div id="tabBar" class="mt-6 flex items-center gap-8 text-base">
          <button class="tab-btn border-b-2 border-orange-500" data-tab="summary">概要</button>
          <button class="tab-btn text-gray-400 hover:text-gray-200" data-tab="board">カンバンボード</button>
          <button class="tab-btn text-gray-400 hover:text-gray-200" data-tab="new">+ 新規タブ</button>
        </div>
      </div>

      <main class="p-8">
        <section class="space-y-6" id="tab-summary" data-tab="summary">
          <div class="grid gap-6 grid-cols-1 md:grid-cols-12" id="widgetGrid" data-pid="${ctx.id}">
            ${widgetShell('contrib', 'Contributions', contributionWidget())}
            ${widgetShell('overview', 'Overview', overviewSkeleton())}
            ${widgetShell('committers', 'Top Committers', barSkeleton())}
            ${widgetShell('readme', 'README', readmeSkeleton())}
            ${addWidgetCard()}
          </div>
        </section>

        <section class="mt-8 hidden" id="tab-board" data-tab="board">
          ${kanbanShell()}
        </section>
      </main>
    </div>
  `
}

function setupTabs(container: HTMLElement, pid: string): void {
  container.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = (btn as HTMLElement).getAttribute('data-tab')
      if (name === 'new') {
        // open picker and create a tab on selection
        openTabPickerModal(container, {
          onSelect: (type: TabTemplate) => addCustomTab(container, pid, type),
        } as any)
        return
      }
      container.querySelectorAll('section[data-tab]')
        .forEach((sec) => (sec as HTMLElement).classList.toggle('hidden', sec.getAttribute('data-tab') !== name))
      container.querySelectorAll('.tab-btn').forEach((b) => {
        // active style: orange underline, inactive: no underline
        b.classList.remove('border-emerald-500')
        b.classList.toggle('border-b-2', b === btn)
        b.classList.toggle('border-orange-500', b === btn)
        b.classList.toggle('text-gray-400', b !== btn)
      })
      if (name === 'board') renderKanban(container, pid)
    })
  })
}

// Create and append a custom tab (blank/kanban/mock). Persist to localStorage.
function addCustomTab(root: HTMLElement, pid: string, type: TabTemplate, persist = true): void {
  const id = `custom-${Date.now()}`
  const tabBar = root.querySelector('#tabBar') as HTMLElement
  const newBtn = tabBar.querySelector('[data-tab="new"]') as HTMLElement
  // wrapper to host delete button
  const wrap = document.createElement('span')
  wrap.className = 'group relative inline-flex'
  const btn = document.createElement('button')
  btn.className = 'tab-btn text-gray-400 hover:text-gray-200 pr-5'
  btn.setAttribute('data-tab', id)
  btn.textContent = type === 'kanban' ? 'カンバンボード' : type === 'blank' ? '空白のタブ' : 'モックアップタブ'
  const del = document.createElement('button')
  del.title = '削除'
  del.className = 'absolute right-0 -top-2 hidden group-hover:inline text-neutral-400 hover:text-rose-400 text-lg leading-none'
  del.textContent = '×'
  wrap.appendChild(btn)
  wrap.appendChild(del)
  tabBar.insertBefore(wrap, newBtn)

  const panel = document.createElement('section')
  panel.className = 'mt-8 hidden'
  panel.setAttribute('data-tab', id)
  if (type === 'kanban') {
    const boardId = `kb-board-${id}`
    panel.innerHTML = kanbanShell(boardId)
    root.querySelector('main')?.appendChild(panel)
    renderKanban(root, pid, boardId)
  } else if (type === 'blank') {
    panel.innerHTML = `<div class=\"rounded-xl ring-1 ring-neutral-800/70 bg-neutral-900/50 p-8 text-gray-300\">このタブは空白です。</div>`
    root.querySelector('main')?.appendChild(panel)
  } else {
    panel.innerHTML = `<div class=\"rounded-xl ring-1 ring-neutral-800/70 bg-neutral-900/50 p-8 text-gray-300\">モックアップタブ</div>`
    root.querySelector('main')?.appendChild(panel)
  }

  btn.addEventListener('click', () => {
    root.querySelectorAll('section[data-tab]').forEach((sec) => (sec as HTMLElement).classList.toggle('hidden', sec.getAttribute('data-tab') !== id))
    root.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.remove('border-emerald-500')
      b.classList.toggle('border-b-2', b === btn)
      b.classList.toggle('border-orange-500', b === btn)
      b.classList.toggle('text-gray-400', b !== btn)
    })
  })

  // delete handler
  del.addEventListener('click', (e) => {
    e.stopPropagation()
    // remove panel and tab
    const panel = root.querySelector(`section[data-tab="${id}"]`)
    panel?.parentElement?.removeChild(panel as Element)
    wrap.remove()
    // update storage
    const saved = JSON.parse(localStorage.getItem(`tabs-${pid}`) || '[]') as Array<{ id: string; type: TabTemplate }>
    const next = saved.filter((t) => t.id !== id)
    localStorage.setItem(`tabs-${pid}`, JSON.stringify(next))
    // activate summary tab
    ;(root.querySelector('[data-tab="summary"]') as HTMLElement)?.click()
  })

  if (persist) {
    const saved = JSON.parse(localStorage.getItem(`tabs-${pid}`) || '[]') as Array<{ id: string; type: TabTemplate }>
    saved.push({ id, type })
    localStorage.setItem(`tabs-${pid}`, JSON.stringify(saved))
  }
  btn.click()
}

function loadCustomTabs(root: HTMLElement, pid: string): void {
  const saved = JSON.parse(localStorage.getItem(`tabs-${pid}`) || '[]') as Array<{ id: string; type: TabTemplate }>
  saved.forEach((t) => addCustomTab(root, pid, t.type, false))
}

// ---------- Collaborators ----------
async function loadCollaborators(root: HTMLElement, projectId: number): Promise<void> {
  try {
    const list = await apiFetch<Array<{ login: string; avatar_url?: string; permission?: string; status?: string }>>(`/projects/${projectId}/collaborators`)
    const wrap = root.querySelector('#collabAvatars') as HTMLElement | null
    if (!wrap) return
    wrap.innerHTML = list
      .map((u) => `<img title="${u.login}${u.status==='pending'?'（招待中）':''}" data-login="${u.login}" src="${u.avatar_url || ''}" class="w-9 h-9 rounded-full ring-1 ring-neutral-700/60 object-cover cursor-pointer"/>`)
      .join('')
    wrap.querySelectorAll('img[data-login]')?.forEach((el) => {
      el.addEventListener('click', (e) => openCollabMenu(root, projectId, e.currentTarget as HTMLElement))
    })
  } catch {}
}

function openCollaboratorPopover(root: HTMLElement, projectId: number, anchor: HTMLElement): void {
  // Close any existing popover
  root.querySelector('#collabPopover')?.remove()
  const rect = anchor.getBoundingClientRect()
  const pop = document.createElement('div')
  pop.id = 'collabPopover'
  pop.className = 'fixed z-[70] w-[min(420px,92vw)] rounded-lg bg-neutral-900 ring-1 ring-neutral-700/70 shadow-xl'
  pop.style.top = `${rect.bottom + 8}px`
  pop.style.left = `${Math.max(12, rect.right - 420)}px`
  pop.innerHTML = `
    <div class="p-3">
      <div class="text-sm text-gray-300 mb-2">GitHubユーザーを検索</div>
      <input id="collabSearch" type="text" class="w-full rounded-md bg-neutral-800/70 ring-1 ring-neutral-700/60 px-3 py-2 text-gray-100" placeholder="ユーザー名で検索" />
      <div id="collabResults" class="mt-3 max-h-64 overflow-y-auto divide-y divide-neutral-800/70"></div>
    </div>
  `
  const close = (ev?: MouseEvent) => {
    if (ev && pop.contains(ev.target as Node)) return
    pop.remove(); document.removeEventListener('click', close)
  }
  setTimeout(() => document.addEventListener('click', close), 0)
  document.body.appendChild(pop)

  const input = pop.querySelector('#collabSearch') as HTMLInputElement
  const results = pop.querySelector('#collabResults') as HTMLElement
  let t: any
  input.addEventListener('input', async () => {
    const q = input.value.trim()
    clearTimeout(t)
    if (!q) { results.innerHTML = ''; return }
    t = setTimeout(async () => {
      const res = await apiFetch<any>(`/github/search/users?query=${encodeURIComponent(q)}`)
      const items: Array<{ login: string; avatar_url?: string }> = res.items || []
      results.innerHTML = items
        .map((u) => `
          <button data-login="${u.login}" class="w-full text-left flex items-center gap-3 px-2 py-2 hover:bg-neutral-800/60">
            <img src="${u.avatar_url || ''}" class="w-7 h-7 rounded-full"/>
            <span class="text-sm text-gray-100">${u.login}</span>
            <span class="ml-auto text-xs text-emerald-400">招待</span>
          </button>
        `)
        .join('')
      results.querySelectorAll('[data-login]')?.forEach((el) => {
        el.addEventListener('click', async () => {
          const login = (el as HTMLElement).getAttribute('data-login')!
          try {
            await apiFetch(`/projects/${projectId}/collaborators`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login }) })
            await loadCollaborators(root, projectId)
            pop.remove(); document.removeEventListener('click', close)
          } catch {
            alert('招待に失敗しました')
          }
        })
      })
    }, 250)
  })
  input.focus()
}

function openCollabMenu(root: HTMLElement, projectId: number, anchor: HTMLElement): void {
  const login = anchor.getAttribute('data-login')!
  root.querySelector('#collabMenu')?.remove()
  const r = anchor.getBoundingClientRect()
  const pop = document.createElement('div')
  pop.id = 'collabMenu'
  pop.className = 'fixed z-[72] w-48 rounded-lg bg-neutral-900 ring-1 ring-neutral-700/70 shadow-xl'
  pop.style.top = `${r.bottom + 8}px`
  pop.style.left = `${Math.min(window.innerWidth - 200, Math.max(12, r.left - 24))}px`
  pop.innerHTML = `
    <div class="p-2">
      <div class="text-sm text-gray-300 mb-2">${login}</div>
      <div class="text-xs text-gray-400 mb-1">権限</div>
      <div class="grid grid-cols-3 gap-2 mb-2">
        ${['pull','push','admin'].map(p => `<button data-perm="${p}" class="perm-btn px-2 py-1 rounded bg-neutral-800/60 hover:bg-neutral-700/60 text-gray-200 text-xs">${p}</button>`).join('')}
      </div>
      <button id="removeCollab" class="w-full text-left px-2 py-2 rounded text-rose-400 hover:bg-neutral-800/60 text-sm">削除</button>
    </div>
  `
  const close = (ev?: MouseEvent) => { if (ev && pop.contains(ev.target as Node)) return; pop.remove(); document.removeEventListener('click', close) }
  setTimeout(() => document.addEventListener('click', close), 0)
  document.body.appendChild(pop)

  pop.querySelectorAll('.perm-btn').forEach((b) => {
    b.addEventListener('click', async () => {
      const perm = (b as HTMLElement).getAttribute('data-perm')!
      try {
        await apiFetch(`/projects/${projectId}/collaborators`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login, permission: perm }) })
        await loadCollaborators(root, projectId)
        pop.remove(); document.removeEventListener('click', close)
      } catch { alert('権限の更新に失敗しました') }
    })
  })
  pop.querySelector('#removeCollab')?.addEventListener('click', async () => {
    if (!confirm(`${login} を削除しますか？`)) return
    try {
      await apiFetch(`/projects/${projectId}/collaborators/${encodeURIComponent(login)}`, { method: 'DELETE' })
      await loadCollaborators(root, projectId)
      pop.remove(); document.removeEventListener('click', close)
    } catch { alert('削除に失敗しました') }
  })
}

// ---------- Kanban board ----------

type Task = {
  id: string
  title: string
  due?: string
  assignee?: string
  priority?: '高' | '中' | '低'
  status: Status
  description?: string
  comments?: Array<{ id: string; author: string; text: string; at: string }>
  history?: Array<{ at: string; by: string; text: string }>
}
type Status = 'todo' | 'doing' | 'review' | 'done'

const STATUS_DEF: Record<Status, { label: string; color: string }> = {
  todo: { label: '未着手', color: 'bg-sky-700' },
  doing: { label: '進行中', color: 'bg-emerald-700' },
  review: { label: 'レビュー中', color: 'bg-yellow-600' },
  done: { label: '完了', color: 'bg-rose-600' },
}

function kanbanShell(id = 'kb-board'): string {
  return `
    <div class="flex items-center gap-3 mb-4">
      <button id="kb-add-${id}" class="rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-3 py-1.5">タスクを追加</button>
    </div>
    <div id="${id}" class="grid md:grid-cols-4 gap-4"></div>
  `
}

function renderKanban(root: HTMLElement, pid: string, targetId = 'kb-board'): void {
  const board = root.querySelector(`#${targetId}`) as HTMLElement | null
  if (!board) return
  const state = loadTasks(pid)
  board.innerHTML = ['todo', 'doing', 'review', 'done']
    .map((st) => columnHtml(st as Status, state.filter((t) => t.status === st)))
    .join('')

  // DnD move（カード全体でドラッグ可。クリックはドラッグ時に抑止）
  let dragging: HTMLElement | null = null
  let wasDragging = false
  board.querySelectorAll('[data-task]')?.forEach((card) => {
    card.addEventListener('dragstart', () => {
      dragging = card as HTMLElement
      wasDragging = true
      // ドラッグ中は元位置のカードを非表示に（複製に見えないように）
      setTimeout(() => { (card as HTMLElement).style.display = 'none' }, 0)
    })
    card.addEventListener('dragend', () => {
      // もしドロップが正常に処理されず再描画されなかった場合に備えて復元
      (card as HTMLElement).style.display = ''
      setTimeout(() => { wasDragging = false }, 0)
    })
    card.addEventListener('click', (e) => {
      if (wasDragging) { e.stopPropagation(); return }
      const id = (card as HTMLElement).getAttribute('data-task') as string
      openTaskModal(root, pid, id)
    })
  })
  board.querySelectorAll('[data-col]')?.forEach((col) => {
    col.addEventListener('dragover', (e) => e.preventDefault())
    col.addEventListener('drop', () => {
      if (!dragging) return
      const id = dragging.getAttribute('data-task') as string
      const tasks = loadTasks(pid)
      const target = (col as HTMLElement).getAttribute('data-col') as Status
      const idx = tasks.findIndex((t) => t.id === id)
      if (idx >= 0) tasks[idx].status = target
      saveTasks(pid, tasks)
      renderKanban(root, pid)
    })
  })

  // Add task global button (unique per board)
  const addBtn = document.getElementById(`kb-add-${targetId}`)
  addBtn?.addEventListener('click', () => openNewTaskModal(root, pid, 'todo'))

  // Add task per column
  board.querySelectorAll('[data-add]')?.forEach((btn) => {
    btn.addEventListener('click', () => {
      const st = (btn as HTMLElement).getAttribute('data-add') as Status
      openNewTaskModal(root, pid, st)
    })
  })
}

// (global delegated handler removed to avoid multiple popups)

function columnHtml(status: Status, tasks: Task[]): string {
  const def = STATUS_DEF[status]
  return `
    <section class="rounded-xl ring-1 ring-neutral-800/70 bg-neutral-900/60 overflow-hidden flex flex-col" data-col="${status}">
      <header class="px-3 py-2 ${def.color} text-white text-sm">${def.label}</header>
      <div class="p-2 space-y-3 min-h-[300px]">
        ${tasks.map(taskCard).join('')}
        <button class="w-full text-center text-sm text-gray-400 hover:text-gray-200 py-1" data-add="${status}">+ タスクを追加</button>
      </div>
    </section>
  `
}

function taskCard(t: Task): string {
  const pr = t.priority ?? '中'
  const prColor = pr === '高' ? 'text-rose-400' : pr === '低' ? 'text-gray-400' : 'text-yellow-300'
  const assignee = t.assignee || 'Sh1ragami'
  const due = t.due || ''
  return `
    <div class="rounded-lg ring-1 ring-neutral-700/60 bg-neutral-800/80 p-3 cursor-grab shadow-sm" draggable="true" data-task="${t.id}">
      <div class="flex items-start justify-between">
        <div class="text-xs text-gray-400">#${t.id}</div>
        <div class="text-sm text-gray-300">${due}</div>
      </div>
      <div class="mt-1 font-semibold text-gray-100">${escapeHtml(t.title)}</div>
      <div class="mt-3 flex items-center justify-between">
        <div class="flex items-center gap-2 text-xs text-gray-300">
          <span class="w-3.5 h-3.5 rounded-full bg-neutral-500"></span>
          <span>${escapeHtml(assignee)}</span>
        </div>
        <div class="text-xs"><span class="text-gray-300 mr-1">優先度</span><span class="${prColor}">${pr}</span></div>
      </div>
    </div>
  `
}

// New Task modal (rich form)
function openNewTaskModal(root: HTMLElement, pid: string, status: Status): void {
  const old = document.getElementById('newTaskOverlay')
  if (old) old.remove()
  const overlay = document.createElement('div')
  overlay.id = 'newTaskOverlay'
  overlay.className = 'fixed inset-0 z-[82] bg-black/60 grid place-items-center'
  overlay.innerHTML = `
    <div class="relative w-[min(980px,95vw)] h-[86vh] overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-neutral-700/70 text-gray-100">
      <div class="flex items-center h-12 px-6 border-b border-neutral-800/70">
        <div class="text-lg font-semibold">新しいタスクを追加</div>
        <button class="ml-auto text-2xl text-neutral-300 hover:text-white" id="nt-close">×</button>
      </div>
      <div class="p-6 space-y-8 overflow-y-auto" style="max-height: calc(86vh - 3rem);">
        <!-- Section 1: General -->
        <div class="flex items-start gap-3">
          <div class="w-6 h-6 rounded-full bg-neutral-800 ring-1 ring-neutral-700/60 grid place-items-center text-sm">1</div>
          <section class="flex-1 space-y-4">
            <h3 class="text-base font-medium">一般</h3>
            <div class="flex items-center gap-4">
              <div class="text-sm text-gray-400 w-24">担当者</div>
              <label class="flex items-center gap-2 text-sm text-gray-300"><input id="nt-auto" type="checkbox" class="accent-emerald-600" checked> 自動割り当て</label>
              <span class="text-gray-500">/</span>
              <select id="nt-assigneeSel" class="rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-2 py-2 text-gray-100">
                <option value="">（選択）</option>
              </select>
              <input id="nt-assignee" type="text" class="flex-1 rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-2 text-gray-100 placeholder:text-gray-500" placeholder="自由入力（任意）" />
            </div>
            <div class="flex items-center gap-4">
              <div class="text-sm text-gray-400 w-24">タスク名</div>
              <input id="nt-title" type="text" required class="flex-1 rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-2 text-gray-100 placeholder:text-gray-500" placeholder="タスク名" />
            </div>
            <p id="nt-err-title" class="text-rose-400 text-sm hidden">タスク名を入力してください。</p>
            <div>
              <div class="text-sm text-gray-400 mb-1">タスク説明</div>
              <textarea id="nt-desc" rows="5" class="w-full rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-2 text-gray-100 placeholder:text-gray-500" placeholder="説明（任意）"></textarea>
            </div>
          </section>
        </div>

        <!-- Section 2: Config -->
        <div class="flex items-start gap-3">
          <div class="w-6 h-6 rounded-full bg-neutral-800 ring-1 ring-neutral-700/60 grid place-items-center text-sm">2</div>
          <section class="flex-1 space-y-4">
            <h3 class="text-base font-medium">構成</h3>
            <div class="rounded-lg ring-1 ring-neutral-700/60 bg-neutral-900/40 p-4 space-y-3">
              <div class="text-sm text-gray-300">タスク種別を選択</div>
              <div class="flex justify-end"><select id="nt-type" class="rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-1.5 text-gray-100"><option value="feature">feature</option><option value="bug">bug</option><option value="chore">chore</option></select></div>
            </div>
            <div class="rounded-lg ring-1 ring-neutral-700/60 bg-neutral-900/40 p-4 space-y-3">
              <div class="text-sm text-gray-300">期日を選択</div>
              <div class="flex justify-end"><input id="nt-due" type="date" class="rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-1.5 text-gray-100"/></div>
            </div>
            <div class="rounded-lg ring-1 ring-neutral-700/60 bg-neutral-900/40 p-4 space-y-3">
              <div class="text-sm text-gray-300">タスク優先度を選択</div>
              <div class="flex justify-end"><select id="nt-priority" class="rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-1.5 text-gray-100"><option>自動設定</option><option>高</option><option selected>中</option><option>低</option></select></div>
            </div>
            <div class="rounded-lg ring-1 ring-neutral-700/60 bg-neutral-900/40 p-4 space-y-3">
              <div class="text-sm text-gray-300">スキル要件を選択</div>
              <div id="nt-skills" class="flex flex-wrap gap-2">${['Ruby','Python','Dart','Java','JavaScript','HTML','CSS'].map((s,i)=>`<button class=\"nt-skill px-3 py-1.5 rounded-full text-sm ring-1 ${i===0?'bg-emerald-700 text-white ring-emerald-600':'bg-neutral-800/60 text-gray-200 ring-neutral-700/60'}\" data-skill=\"${s}\">${s}</button>`).join('')}</div>
              <p class="text-xs text-center text-gray-400">+ すべてみる</p>
            </div>
          </section>
        </div>
      </div>
      <div class="absolute bottom-0 inset-x-0 p-4 border-t border-neutral-800/70 bg-neutral-900/80 flex justify-end">
        <button id="nt-submit" class="rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2">タスクを追加</button>
      </div>
    </div>`
  const close = () => overlay.remove()
  ;(overlay as any).onclick = (e: MouseEvent) => { if (e.target === overlay) close() }
  (overlay.querySelector('#nt-close') as HTMLElement | null)?.addEventListener('click', close)

  // Toggle skills selection
  overlay.querySelectorAll('.nt-skill').forEach((chip)=>{
    chip.addEventListener('click', ()=>{
      chip.classList.toggle('bg-emerald-700')
      chip.classList.toggle('text-white')
      chip.classList.toggle('ring-emerald-600')
      chip.classList.toggle('bg-neutral-800/60')
      chip.classList.toggle('text-gray-200')
      chip.classList.toggle('ring-neutral-700/60')
    })
  })

  // Auto-assign toggle + collaborators
  const auto = overlay.querySelector('#nt-auto') as HTMLInputElement | null
  const assignee = overlay.querySelector('#nt-assignee') as HTMLInputElement | null
  const assigneeSel = overlay.querySelector('#nt-assigneeSel') as HTMLSelectElement | null
  const applyAssignLock = () => {
    const lock = !!(auto && auto.checked)
    if (assignee) assignee.disabled = lock
    if (assigneeSel) assigneeSel.disabled = lock
  }
  if (auto) auto.addEventListener('change', applyAssignLock)
  applyAssignLock()
  // load collaborators for assignee select (use apiFetch to include auth)
  const fetchCollabs = async () => {
    try {
      const list = await apiFetch<Array<{ login: string }>>(`/projects/${pid}/collaborators`)
      if (!assigneeSel) return
      assigneeSel.innerHTML = '<option value="">（選択）</option>' + (list || []).map(u => `<option value="${u.login}">${u.login}</option>`).join('')
    } catch (e) {
      // ignore 401 or network error
    }
  }
  fetchCollabs();

  (overlay.querySelector('#nt-submit') as HTMLElement | null)?.addEventListener('click', ()=>{
    const title = (overlay.querySelector('#nt-title') as HTMLInputElement).value.trim()
    if (!title) { (overlay.querySelector('#nt-err-title') as HTMLElement).classList.remove('hidden'); return }
    const due = (overlay.querySelector('#nt-due') as HTMLInputElement).value || undefined
    const pr = ((overlay.querySelector('#nt-priority') as HTMLSelectElement).value || '中') as Task['priority']
    const sel = assigneeSel?.value?.trim() || ''
    const asg = (auto && auto.checked) ? 'あなた' : (sel || (assignee?.value.trim() || 'Sh1ragami'))
    const desc = (overlay.querySelector('#nt-desc') as HTMLTextAreaElement).value.trim()
    const tasks = loadTasks(pid)
    const t: Task = { id: String(Date.now()), title, due, status, priority: pr==='自動設定'?'中':pr, assignee: asg, description: desc, comments: [], history: [{ at: new Date().toLocaleString(), by: 'あなた', text: 'タスクを作成しました。' }] }
    tasks.push(t); saveTasks(pid, tasks)
    close(); renderKanban(root, pid)
  })
  document.body.appendChild(overlay)
}

function loadTasks(pid: string): Task[] {
  const raw = localStorage.getItem(`kb-${pid}`)
  if (raw) {
    try { return JSON.parse(raw) as Task[] } catch {}
  }
  // default sample
  return [
    {
      id: '1',
      title: 'API連携の実装',
      due: '2025/05/23',
      status: 'todo',
      priority: '中',
      description: 'バックエンドAPIとフロントの連携を実装する。',
      comments: [],
      history: [{ at: '2025/02/14', by: 'Sh1ragami', text: 'タスクを作成しました。' }],
    },
    { id: '2', title: 'テストケースの作成', due: '2025/05/23', status: 'doing', priority: '低', description: '', comments: [], history: [] },
    { id: '3', title: 'レビュー対応', due: '2025/06/10', status: 'review', priority: '高', description: '', comments: [], history: [] },
    { id: '4', title: '初期README整備', due: '2025/05/20', status: 'done', priority: '低', description: '', comments: [], history: [] },
  ]
}

function saveTasks(pid: string, tasks: Task[]): void {
  localStorage.setItem(`kb-${pid}`, JSON.stringify(tasks))
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
