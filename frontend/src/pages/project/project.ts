import { apiFetch } from '../../utils/api'

type Project = {
  id: number
  name: string
  alias?: string
  start?: string
  end?: string
  color?: 'blue' | 'red' | 'green' | 'black' | 'white' | 'purple' | 'orange' | 'yellow' | 'gray'
}

const CARD_COLORS: Project['color'][] = ['blue','green','red','purple','orange','yellow','gray','black','white']
function randomCardColor(): Project['color'] {
  return CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]
}

function projectCard(p: Project): string {
  // Guard: ignore invalid/empty projects
  if (!p || !p.id || (!p.name && !p.alias) || String(p.name || p.alias || '').trim() === '') return ''
  const color = p.color || 'blue'
  const style =
    color === 'red' ? 'bg-rose-900/40 hover:bg-rose-900/55 ring-rose-900/50 hover:ring-rose-700/60'
    : color === 'green' ? 'bg-emerald-900/40 hover:bg-emerald-900/55 ring-emerald-900/50 hover:ring-emerald-700/60'
    : color === 'black' ? 'bg-black/60 hover:bg-black/70 ring-black/60 hover:ring-black/70'
    : color === 'white' ? 'bg-white/10 hover:bg-white/15 ring-white/30 hover:ring-white/40'
    : color === 'purple' ? 'bg-fuchsia-900/40 hover:bg-fuchsia-900/55 ring-fuchsia-900/50 hover:ring-fuchsia-700/60'
    : color === 'orange' ? 'bg-orange-900/40 hover:bg-orange-900/55 ring-orange-900/50 hover:ring-orange-700/60'
    : color === 'yellow' ? 'bg-yellow-900/40 hover:bg-yellow-900/55 ring-yellow-900/50 hover:ring-yellow-700/60'
    : color === 'gray' ? 'bg-neutral-800/60 hover:bg-neutral-800/70 ring-neutral-700/60 hover:ring-neutral-500/60'
    : 'bg-sky-900/40 hover:bg-sky-900/55 ring-sky-900/50 hover:ring-sky-700/60'
  const title = (p.alias && String(p.alias).trim() !== '' ? p.alias : p.name)
  return `
    <button data-id="${p.id}" class="group relative w-full h-40 rounded-xl ring-1 ${style} shadow-sm text-left p-5 transition-colors pop-card btn-press">
      <div class="text-base font-medium text-gray-100/90">${title}</div>
      <div class="mt-2 text-xs text-gray-400">${p.start ? `${p.start} ~ ${p.end ?? ''}` : '&nbsp;'}</div>
      <div class="absolute bottom-3 right-3 flex gap-2 items-center opacity-0 group-hover:opacity-80 pointer-events-none group-hover:pointer-events-auto transition-opacity">
        <button type="button" class="card-menu inline-flex items-center gap-1 rounded-md bg-neutral-800/80 ring-1 ring-neutral-700/60 px-2 py-1 text-xs text-gray-300 hover:text-white">
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
    <button id="createCard" class="w-full h-40 rounded-xl bg-neutral-800/40 ring-1 ring-neutral-700/60 hover:ring-neutral-500/60 transition-colors grid place-items-center text-gray-300 pop-card btn-press">
      <div class="text-center">
        <div class="text-sm mb-2">プロジェクト作成</div>
        <div class="text-3xl">＋</div>
      </div>
    </button>
  `
}

export function renderProject(container: HTMLElement): void {
  container.innerHTML = `
    <div class="min-h-screen bg-neutral-900 text-gray-100">
      <!-- Topbar -->
      <div class="h-14 bg-neutral-900/95 ring-1 ring-neutral-800/80 flex items-center px-6">
        <h1 class="text-lg font-semibold tracking-wide">プロジェクト一覧</h1>
        <div class="ml-auto flex items-center gap-3">
          <button id="accountBtn" class="w-8 h-8 rounded-full overflow-hidden ring-1 ring-neutral-700/70 bg-neutral-700 grid place-items-center">
            <span class="sr-only">アカウント</span>
            <img id="accountAvatar" class="w-full h-full object-cover hidden" alt="avatar"/>
            <div id="accountFallback" class="text-xs text-neutral-300">Me</div>
          </button>
        </div>
      </div>

      <div class="flex">
        <!-- Sidebar -->
        <aside class="hidden md:flex w-24 shrink-0 border-r border-neutral-800/70 min-h-[calc(100vh-3.5rem)] flex-col items-center pt-8 gap-6 bg-neutral-950/40" id="groupSidebar">
          <!-- groups will be injected here -->
          <button id="sidebar-create" class="mt-2 grid place-items-center w-10 h-10 rounded-full border border-dashed border-neutral-600 text-2xl text-neutral-400">+</button>
        </aside>

        <!-- Main -->
        <main class="flex-1 p-8">
          <div class="flex items-center">
            <h2 id="userTitle" class="text-2xl md:text-3xl font-semibold">プロジェクト</h2>
            <button id="createBtn" class="ml-auto inline-flex items-center rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 shadow-emerald-900/30 shadow">
              プロジェクト作成
            </button>
          </div>

          <section class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr" id="projectGrid">
            ${createProjectCard()}
          </section>
        </main>
      </div>
    </div>
  `

  // Set user name into title if available
  apiFetch<{ id: number; name: string; github_id?: number; email?: string }>(`/me`)
    .then((me) => {
      const el = container.querySelector('#userTitle')
      if (el) el.textContent = `${me.name}のプロジェクト`
      // avatar
      const avatar = container.querySelector('#accountAvatar') as HTMLImageElement | null
      const fallback = container.querySelector('#accountFallback') as HTMLElement | null
      if (me.github_id && avatar) {
        avatar.src = `https://avatars.githubusercontent.com/u/${me.github_id}?s=96`
        avatar.classList.remove('hidden')
        if (fallback) fallback.classList.add('hidden')
      } else if (fallback) {
        fallback.textContent = (me.name || 'Me').slice(0, 2)
      }
      ;(container as any)._me = me
      // render group sidebar now that we have user
      renderGroupSidebar(container, me)
      // apply current filter and reload
      loadProjects(container)
    })
    .catch(() => {
      // ignore silently
    })

  // interactions
  const onCreate = () => {/* noop: modal implemented below */}
  const openCreate = () => openCreateProjectModal(container)
  container.querySelector('#createBtn')?.addEventListener('click', openCreate)
  container.querySelector('#createCard')?.addEventListener('click', openCreate)
  // サイドバーの＋はグループ追加専用のため、プロジェクト作成は紐付けない

  // Card click behavior (placeholder)
  container.querySelectorAll('[data-id]')?.forEach((el) => {
    el.addEventListener('click', () => {
      const id = (el as HTMLElement).getAttribute('data-id')
      if (id) window.location.hash = `#/project/detail?id=${encodeURIComponent(id)}`
    })
    // stop propagation for menu
    ;(el as HTMLElement).querySelector('.card-menu')?.addEventListener('click', (ev) => {
      ev.stopPropagation()
      const id = (el as HTMLElement).getAttribute('data-id')
      if (id) openCardMenu(container, el as HTMLElement, Number(id))
    })
  })

  // Account modal
  const accountBtn = container.querySelector('#accountBtn')
  accountBtn?.addEventListener('click', () => openAccountModal(container))

  // Load projects when me is unknown yet (fallback)
  if (!(container as any)._me) loadProjects(container)

  // If requested from other pages, open account modal
  const wantAccount = localStorage.getItem('openAccountModal')
  if (wantAccount) {
    localStorage.removeItem('openAccountModal')
    openAccountModal(container)
  }
}

// ----- Progress Overlay for Project Creation -----
function openCreateProgress(msg: string) {
  // Close existing one
  document.getElementById('pjProgress')?.remove()
  const overlay = document.createElement('div')
  overlay.id = 'pjProgress'
  overlay.className = 'fixed inset-0 z-[70] bg-black/50 backdrop-blur-[1px] grid place-items-center'
  overlay.innerHTML = `
    <div class="w-[min(560px,92vw)] rounded-xl bg-neutral-900 ring-1 ring-neutral-700/70 shadow-2xl p-6 text-gray-100">
      <div class="flex items-center gap-3">
        <div class="w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" id="pjProgSpin"></div>
        <div id="pjProgMsg" class="text-sm">${msg}</div>
      </div>
      <div id="pjProgBody" class="mt-4 text-sm text-gray-300">
        <ul id="pjProgSteps" class="space-y-2">
          <li data-step="ai" class="flex items-center gap-2">
            <span class="w-4 h-4 rounded-full bg-neutral-700/60" data-icon></span>
            <span>AIプラン生成</span>
            <span class="ml-auto text-xs text-gray-400" data-note></span>
          </li>
          <li data-step="repo" class="flex items-center gap-2">
            <span class="w-4 h-4 rounded-full bg-neutral-700/60" data-icon></span>
            <span>リポジトリ処理（作成/リンク）</span>
            <span class="ml-auto text-xs text-gray-400" data-note></span>
          </li>
          <li data-step="readme" class="flex items-center gap-2">
            <span class="w-4 h-4 rounded-full bg-neutral-700/60" data-icon></span>
            <span>README更新</span>
            <span class="ml-auto text-xs text-gray-400" data-note></span>
          </li>
          <li data-step="issues" class="flex items-center gap-2">
            <span class="w-4 h-4 rounded-full bg-neutral-700/60" data-icon></span>
            <span>Issue作成</span>
            <span class="ml-auto text-xs text-gray-400" data-note></span>
          </li>
          <li data-step="tasks" class="flex items-center gap-2">
            <span class="w-4 h-4 rounded-full bg-neutral-700/60" data-icon></span>
            <span>初期タスク保存</span>
            <span class="ml-auto text-xs text-gray-400" data-note></span>
          </li>
        </ul>
      </div>
      <div id="pjProgActions" class="mt-5 flex justify-end gap-3 hidden">
        <button id="pjProgClose" class="rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-1.5 text-gray-200">閉じる</button>
        <button id="pjProgOpen" class="hidden rounded-md bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5">詳細を開く</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  ;(function(){ const c=+(document.body.getAttribute('data-lock')||'0'); if(c===0){ document.body.style.overflow='hidden' } document.body.setAttribute('data-lock', String(c+1)) })()
  const set = (text: string) => { const el = overlay.querySelector('#pjProgMsg'); if (el) el.textContent = text }
  const showError = (text: string) => {
    const body = overlay.querySelector('#pjProgBody') as HTMLElement | null
    if (body) body.innerHTML = `<div class="text-rose-400">${text}</div>`
    const actions = overlay.querySelector('#pjProgActions') as HTMLElement | null
    actions?.classList.remove('hidden')
    const spinner = overlay.querySelector('#pjProgSpin') as HTMLElement | null
    if (spinner) spinner.classList.add('hidden')
    overlay.querySelector('#pjProgClose')?.addEventListener('click', () => { overlay.remove(); const c=+(document.body.getAttribute('data-lock')||'0'); const n=Math.max(0,c-1); if(n===0){ document.body.style.overflow=''; } document.body.setAttribute('data-lock', String(n)) })
  }
  const showSuccess = (id?: number) => {
    set('プロジェクトの準備が完了しました。')
    const actions = overlay.querySelector('#pjProgActions') as HTMLElement | null
    actions?.classList.remove('hidden')
    const openBtn = overlay.querySelector('#pjProgOpen') as HTMLElement | null
    if (id && openBtn) {
      openBtn.classList.remove('hidden')
      openBtn.addEventListener('click', () => {
        window.location.hash = `#/project/detail?id=${id}`
        overlay.remove(); const c=+(document.body.getAttribute('data-lock')||'0'); const n=Math.max(0,c-1); if(n===0){ document.body.style.overflow=''; } document.body.setAttribute('data-lock', String(n))
      })
    }
    const spinner = overlay.querySelector('#pjProgSpin') as HTMLElement | null
    if (spinner) spinner.classList.add('hidden')
    overlay.querySelector('#pjProgClose')?.addEventListener('click', () => overlay.remove())
  }
  const mark = (step: string, ok: boolean, note?: string) => {
    const li = overlay.querySelector(`li[data-step="${step}"]`) as HTMLElement | null
    if (!li) return
    const icon = li.querySelector('[data-icon]') as HTMLElement | null
    const noteEl = li.querySelector('[data-note]') as HTMLElement | null
    if (icon) icon.className = `w-4 h-4 rounded-full ${ok ? 'bg-emerald-600' : 'bg-rose-600'}`
    if (note && noteEl) noteEl.textContent = note
  }
  const updateFromMeta = (meta: any) => {
    // ai
    mark('ai', !!meta?.ai_used, meta?.ai_used ? `tasks: ${meta?.ai_tasks_count ?? 0}` : 'fallback')
    // repo
    mark('repo', (meta?.gh_repo_created ?? true), meta?.gh_repo_created ? 'ok' : 'linked')
    // readme
    const rs = meta?.gh_readme_status
    mark('readme', !!meta?.gh_readme_updated, meta?.gh_readme_updated ? 'updated' : (rs ? `status ${rs}` : 'skipped'))
    // issues
    const cnt = Number(meta?.gh_issues_created ?? 0)
    const is = meta?.gh_issue_last_status
    const en = meta?.gh_enable_issues_status
    const note = cnt > 0 ? `${cnt}件` : (is ? `status ${is}` : (en ? `enable ${en}` : '0件'))
    mark('issues', cnt > 0, note)
    // tasks
    mark('tasks', true, (Array.isArray(meta?.initial_tasks) ? meta.initial_tasks.length : 0) + '件')
  }
  return { set, showError, showSuccess, updateFromMeta, close: () => overlay.remove() }
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
      // filter by selected group
      const me = (root as any)._me as { id?: number } | undefined
      const selected = getSelectedGroup(me?.id)
      const map = getGroupMap(me?.id)

      const filtered = list
        .filter((p) => p && typeof p === 'object' && Number(p.id) > 0 && (p.name ?? '').toString().trim().length > 0)
        .filter((p) => {
          const gid = map[String(p.id)] || 'user'
          return !selected || selected === 'all' ? true : gid === selected
        })
      const ids = new Set(filtered.map((p)=> String(p.id)))
      const html = filtered
        .map((p) => projectCard(toCard(p)))
        .join('')
      const grid = root.querySelector('#projectGrid') as HTMLElement | null
      if (!grid) return
      grid.innerHTML = `${html}${createProjectCard()}`
      bindGridInteractions(root)
      sanitizeProjectGrid(grid)
      // remove any card not in current ids (stale/unknown)
      Array.from(grid.querySelectorAll('[data-id]')).forEach((el)=>{
        const id = (el as HTMLElement).getAttribute('data-id') || ''
        if (!ids.has(id)) (el as HTMLElement).remove()
      })
      removeEmptyCards(grid)
      sanitizeProjectGrid(grid)
    })
    .catch(() => {
      // ignore if API not ready
    })
}

function bindGridInteractions(root: HTMLElement): void {
  const grid = root.querySelector('#projectGrid') as HTMLElement | null
  if (!grid) return
  // card click + menu
  grid.querySelectorAll('[data-id]')?.forEach((el) => {
    el.addEventListener('click', () => {
      const id = (el as HTMLElement).getAttribute('data-id')
      if (id) window.location.hash = `#/project/detail?id=${encodeURIComponent(id)}`
    })
    // right-click context menu
    el.addEventListener('contextmenu', (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      const id = (el as HTMLElement).getAttribute('data-id')
      if (id) openCardMenu(root, el as HTMLElement, Number(id))
    })
    ;(el as HTMLElement).querySelector('.card-menu')?.addEventListener('click', (ev) => {
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
    list = [{ id: 'user', name: 'マイグループ', avatar }, ...list]
    saveGroups(uid, list)
  }
  return list
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

  groups.forEach((g, idx) => {
    const el = document.createElement('button')
    el.setAttribute('data-group', g.id)
    el.className = `w-10 h-10 rounded-full ${selected === g.id ? 'ring-2 ring-sky-500' : 'ring-1 ring-neutral-700/60'} overflow-hidden bg-neutral-700 grid place-items-center`
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
      loadProjects(root)
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

function getGroupById(uid: number | undefined, id: string | null): Group | null {
  if (!id) return null
  return getGroups(uid).find((g) => g.id === id) || null
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
  menu.className = 'fixed z-[62] w-40 rounded-md bg-neutral-900 ring-1 ring-neutral-700/70 shadow-xl text-sm text-gray-200'
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
    if (!confirm(`グループ「${g.name}」を削除しますか？`)) return
    deleteGroup(me.id, g.id)
    renderGroupSidebar(root, (root as any)._me)
    loadProjects(root)
    close()
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
  const sidebar = root.querySelector('#groupSidebar') as HTMLElement
  const btn = sidebar.querySelector('#sidebar-create') as HTMLElement
  const rect = btn.getBoundingClientRect()
  const pop = document.createElement('div')
  pop.className = 'fixed z-[60] w-64 rounded-lg bg-neutral-900 ring-1 ring-neutral-700/70 shadow-xl'
  pop.style.top = `${rect.top + rect.height + 8}px`
  // 画面内に収まるように位置を調整（左右のはみ出し防止）
  const desired = rect.left - 100
  const maxLeft = window.innerWidth - 276 // 16rem(=256px) + 20pxマージン
  const left = Math.min(maxLeft, Math.max(12, desired))
  pop.style.left = `${left}px`
  pop.innerHTML = `
    <div class="p-3">
      <div class="text-sm text-gray-300 mb-2">新しいグループ</div>
      <input id="gname" class="w-full rounded-md bg-neutral-800/70 ring-1 ring-neutral-700/60 px-3 py-2 text-gray-100" placeholder="グループ名" />
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
    renderGroupSidebar(root, (root as any)._me)
    loadProjects(root)
    close()
  })
}

// (card menu enhancement is injected inside the original openCardMenu below)

function openAccountModal(root: HTMLElement): void {
  const me = (root as any)._me as { name?: string; email?: string; github_id?: number } | undefined
  const avatarUrl = me?.github_id ? `https://avatars.githubusercontent.com/u/${me.github_id}?s=128` : ''

  const overlay = document.createElement('div')
  overlay.id = 'accountOverlay'
  overlay.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] grid place-items-center fade-overlay'
  overlay.innerHTML = `
    <div class="relative w-[min(960px,92vw)] h-[80vh] max-h-[86vh] overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-neutral-700/70 shadow-2xl text-gray-100 pop-modal">
      <div class="flex items-center h-12 px-5 border-b border-neutral-800/70">
        <h3 class="text-lg font-semibold">マイページ</h3>
        <button id="accountClose" class="ml-auto text-2xl text-neutral-300 hover:text-white">×</button>
      </div>
      <div class="flex">
        <aside class="w-48 shrink-0 p-4 border-r border-neutral-800/70 space-y-2">
          <button data-tab="basic" class="tab-btn w-full text-left px-3 py-2 rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 text-gray-100">
            <span>基本情報</span>
          </button>
          <button data-tab="notify" class="tab-btn w-full text-left px-3 py-2 rounded-md hover:bg-neutral-800/40 ring-1 ring-transparent text-gray-100">
            <span>通知設定</span>
          </button>
        </aside>
        <section class="flex-1 p-6 space-y-6 overflow-y-auto">
          <div class="tab-panel" data-tab="basic">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-full overflow-hidden bg-neutral-700 ring-1 ring-neutral-600/70">
                ${avatarUrl ? `<img src="${avatarUrl}" class="w-full h-full object-cover"/>` : ''}
              </div>
              <div>
                <div class="text-sm text-gray-400">連携中のGitHubアカウント</div>
                <div class="text-base">${me?.name ?? 'ゲスト'}</div>
              </div>
              <button id="logoutBtn" class="ml-auto inline-flex items-center rounded-md bg-rose-700 hover:bg-rose-600 text-white text-sm font-medium px-3 py-1.5">ログアウト</button>
            </div>

            <hr class="my-6 border-neutral-800/70"/>

            <h4 class="text-base font-medium">ユーザー設定</h4>

            <div class="space-y-6">
              ${renderSkillSection('owned','所有スキル一覧', (root as any)._me?.id)}
              ${renderSkillSection('want','希望スキル一覧', (root as any)._me?.id)}
            </div>
          </div>
          <div class="tab-panel hidden" data-tab="notify">
            <div class="mb-6 p-4 rounded-lg ring-1 ring-neutral-700/60 bg-neutral-900/60">
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
              <div class="divide-y divide-neutral-800/70 ring-1 ring-neutral-800/60 rounded-lg overflow-hidden">
                ${notifyRow('レビュアーに割り当てられた時')}
                ${notifyRow('新しいタスクが割り当てられた時')}
                ${notifyRow('担当タスクの期日が近くなった時', '<span class="ml-2 text-xs rounded-md bg-neutral-800/80 ring-1 ring-neutral-700/60 px-2 py-0.5 text-gray-300">3日前</span>')}
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
        </section>
      </div>
    </div>
  `

  const close = () => { overlay.remove(); const c=+(document.body.getAttribute('data-lock')||'0'); const n=Math.max(0,c-1); if(n===0){ document.body.style.overflow=''; } document.body.setAttribute('data-lock', String(n)) }
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close()
  })
  overlay.querySelector('#accountClose')?.addEventListener('click', close)
  overlay.querySelector('#logoutBtn')?.addEventListener('click', async () => {
    try { await apiFetch('/logout', { method: 'POST' }) } catch {}
    localStorage.removeItem('apiToken')
    localStorage.setItem('justLoggedOut', '1')
    close()
    window.location.hash = '#/login'
  })

  // Tabs
  overlay.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = (btn as HTMLElement).getAttribute('data-tab')
      overlay.querySelectorAll('.tab-panel').forEach((p) => {
        const tab = (p as HTMLElement).getAttribute('data-tab')
        if (tab === name) (p as HTMLElement).classList.remove('hidden')
        else (p as HTMLElement).classList.add('hidden')
      })
      overlay.querySelectorAll('.tab-btn').forEach((b) => {
        b.classList.toggle('bg-neutral-800/60', b === btn)
        b.classList.toggle('ring-neutral-700/60', b === btn)
      })
    })
  })

  // Toggle switches interaction
  overlay.querySelectorAll('.toggle').forEach((t) => {
    t.addEventListener('click', () => {
      t.classList.toggle('bg-emerald-600')
      t.classList.toggle('bg-neutral-700')
      const knob = (t as HTMLElement).querySelector('.knob') as HTMLElement | null
      knob?.classList.toggle('translate-x-5')
    })
  })

  document.body.appendChild(overlay); (function(){ const c=+(document.body.getAttribute('data-lock')||'0'); if(c===0){ document.body.style.overflow='hidden' } document.body.setAttribute('data-lock', String(c+1)) })()
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
    btn.classList.toggle('ring-neutral-700/60')
  }
  overlay.querySelectorAll('section[data-skill-section]')?.forEach((sec) => {
    const section = sec as HTMLElement
    section.querySelectorAll('.skill-pill')?.forEach((el)=>{
      el.addEventListener('click', ()=> onToggle(el as HTMLElement, section))
    })
    const toggleMore = section.querySelector('.see-all') as HTMLElement | null
    toggleMore?.addEventListener('click', ()=>{
      const box = section.querySelector('.more-skills') as HTMLElement | null
      box?.classList.toggle('hidden')
    })
  })
}

type SkillGroup = 'owned' | 'want'
const ALL_SKILLS = ['JavaScript','TypeScript','Python','Ruby','Go','Rust','Java','Kotlin','Swift','Dart','PHP','C','C++','C#','Scala','Elixir','Haskell','R','Julia','SQL','HTML','CSS','Sass','Tailwind','React','Vue','Svelte','Next.js','Nuxt','Node.js','Deno','Bun','Express','Rails','Laravel','Spring','Django','FastAPI','Flutter','React Native','iOS','Android','Unity','Unreal','AWS','GCP','Azure','Docker','Kubernetes','Terraform','Ansible','Git','GitHub Actions','Figma','Storybook','Jest','Playwright','Vitest','Grafana','Prometheus']
const SKILL_ICON: Record<string, string> = {
  JavaScript: '🟨', TypeScript: '🟦', Python: '🐍', Ruby: '💎', Go: '🌀', Rust: '🦀', Java: '☕', Kotlin: '🟪', Swift: '🟧', Dart: '🎯', PHP: '🐘', 'C#': '🎼', 'C++': '➕', C: '🧩', Scala: '📈', Elixir: '🧪', Haskell: 'λ', R: '📊', Julia: '💠', SQL: '🗄️', HTML: '📄', CSS: '🎨', Sass: '🧵', Tailwind: '🌬️', React: '⚛️', Vue: '🟩', Svelte: '🟠', 'Next.js': '⏭️', Nuxt: '🟢', 'Node.js': '🟢', Deno: '🦕', Bun: '🥯', Express: '🚂', Rails: '🛤️', Laravel: '🟥', Spring: '🌱', Django: '🟩', FastAPI: '⚡', Flutter: '💙', 'React Native': '📱', iOS: '📱', Android: '🤖', Unity: '🎮', Unreal: '🧰', AWS: '☁️', GCP: '☁️', Azure: '☁️', Docker: '🐳', Kubernetes: '☸️', Terraform: '🧱', Ansible: '📦', Git: '🔧', 'GitHub Actions': '🛠️', Figma: '🎨', Storybook: '📚', Jest: '🧪', Playwright: '🎭', Vitest: '🧪', Grafana: '📊', Prometheus: '🔥'
}
function slugSkill(name: string): string { return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') }
function skillIcon(name: string): string {
  const slug = slugSkill(name)
  return `<img src="/icons/${slug}.svg" alt="${name}" class="w-4 h-4 mr-1 inline-block align-[-2px]" onerror="this.style.display='none'" />`
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
      <div class="rounded-lg ring-1 ring-neutral-700/60 bg-neutral-900/40 p-3 flex flex-wrap gap-2">
        ${seed.map((s) => `<button class=\"skill-pill px-3 py-1.5 rounded-full text-sm ring-1 ${selected.has(s)?'bg-emerald-700 text-white ring-emerald-600':'bg-neutral-800/60 text-gray-200 ring-neutral-700/60'}\" data-skill=\"${s}\">${skillIcon(s)}${s}</button>`).join('')}
      </div>
      <button class="see-all text-xs mx-auto block text-gray-400 hover:text-gray-200">+ すべてみる</button>
      <div class="more-skills hidden rounded-lg ring-1 ring-neutral-700/60 bg-neutral-900/40 p-3 flex flex-wrap gap-2 max-h-48 overflow-auto">
        ${ALL_SKILLS.map((s)=>`<button class=\"skill-pill px-3 py-1.5 rounded-full text-sm ring-1 ${selected.has(s)?'bg-emerald-700 text-white ring-emerald-600':'bg-neutral-800/60 text-gray-200 ring-neutral-700/60'}\" data-skill=\"${s}\">${skillIcon(s)}${s}</button>`).join('')}
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
  return `<span class="inline-flex items-center rounded-md bg-neutral-800/70 ring-1 ring-neutral-700/60 px-3 py-1 text-sm text-gray-200">${text}</span>`
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
    <div class="relative w-[min(1040px,95vw)] h-[82vh] overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-neutral-700/70 shadow-2xl text-gray-100">
      <div class="flex items-center h-12 px-5 border-b border-neutral-800/70">
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

      <div class="absolute bottom-0 inset-x-0 p-4 border-t border-neutral-800/70 bg-neutral-900/80">
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
    const c = +(document.body.getAttribute('data-lock')||'0'); const n=Math.max(0,c-1); if(n===0){ document.body.style.overflow=''; } document.body.setAttribute('data-lock', String(n))
    // Re-enable triggers after close
    headerBtn && (headerBtn.disabled = false)
    cardBtn && (cardBtn.disabled = false)
  }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#pj-close')?.addEventListener('click', close)
  ;(function(){ const c=+(document.body.getAttribute('data-lock')||'0'); if(c===0){ document.body.style.overflow='hidden' } document.body.setAttribute('data-lock', String(c+1)) })()

  // Tab switching
  overlay.querySelectorAll('.pj-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = (tab as HTMLElement).getAttribute('data-tab')
      overlay.querySelectorAll('.pj-panel').forEach((p) => {
        const t = (p as HTMLElement).getAttribute('data-tab')
        ;(p as HTMLElement).classList.toggle('hidden', t !== name)
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
        ;(overlay as any)._repos = repos
        // selection (delegated)
        container?.addEventListener('click', (ev) => {
          const target = (ev.target as HTMLElement).closest('[data-repo]') as HTMLElement | null
          if (!target || !container.contains(target)) return
          container.querySelectorAll('[data-repo]').forEach((n) => {
            n.classList.remove('ring-emerald-600', 'ring-2', 'bg-neutral-900/50')
          })
          target.classList.add('ring-emerald-600', 'ring-2', 'bg-neutral-900/50')
          const full = target.getAttribute('data-repo') || ''
          ;(overlay as any)._selectedRepo = full
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
          } catch {}
        })
        // search
        const search = overlay.querySelector('#repoSearch') as HTMLInputElement | null
        search?.addEventListener('input', () => {
          const q = (search.value || '').toLowerCase()
          container?.querySelectorAll('[data-repo]').forEach((el) => {
            const text = el.textContent?.toLowerCase() || ''
            ;(el as HTMLElement).style.display = text.includes(q) ? '' : 'none'
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
    const prog = openCreateProgress('プロジェクトを作成しています...')
    const active = overlay.querySelector('.pj-panel:not(.hidden)') as HTMLElement
    const mode = active?.getAttribute('data-tab')
    try {
      if (mode === 'new') {
        clearFormErrors(overlay)
        const payload = readNewProjectForm(overlay)
        if (!validateProjectForm(overlay, payload)) return
        const created = await createProject(payload)
        // Use server response if available; fallback to form values
        const id = Number(created?.id)
        const name = (created?.name ?? payload.name ?? '').toString()
        const start = created?.start_date || created?.start || payload.start
        const end = created?.end_date || created?.end || payload.end
        if (id && name) {
          const color = randomCardColor()
          addProjectToGrid(root, { id, name, start, end, color })
          // Save initial tasks (if AI provided)
          if (Array.isArray(created?.initial_tasks)) {
            try { localStorage.setItem(`kb-${id}`, JSON.stringify(created.initial_tasks)) } catch {}
          }
          // Persist chosen color
          try { await apiFetch(`/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ color }) }) } catch {}
          // Update progress steps from server meta
          prog.updateFromMeta(created)
          // Close create form and show success
          close()
          loadProjects(root)
          prog.showSuccess(id)
        }
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
        const created = await createProject({ linkRepo: repo, ...extra })
        const id = Number(created?.id)
        const name = (created?.name ?? (repo.split('/')[1] || 'Repo')).toString()
        if (id && name) {
          const color = randomCardColor()
          addProjectToGrid(root, { id, name, start: extra.start, end: extra.end, color })
          if (Array.isArray(created?.initial_tasks)) {
            try { localStorage.setItem(`kb-${id}`, JSON.stringify(created.initial_tasks)) } catch {}
          }
          try { await apiFetch(`/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ color }) }) } catch {}
          prog.updateFromMeta(created)
          close(); loadProjects(root); prog.showSuccess(id)
        }
      }
    } catch (e) {
      console.error(e)
      // If unauthorized, route to login
      if ((e as any)?.message?.includes('401')) {
        prog.showError('ログインが必要です。ログイン画面へ移動します。')
        window.location.hash = '#/login'
      } else {
        prog.showError('作成に失敗しました。サーバーやネットワークの状態をご確認ください。')
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
      chip.classList.toggle('ring-neutral-700/60', !on)
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
      chip.classList.toggle('ring-neutral-700/60', !on)
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
    ;(scope.querySelector('#pj-start') as HTMLElement | null)?.classList.add('ring-rose-600')
    ;(scope.querySelector('#pj-end') as HTMLElement | null)?.classList.add('ring-rose-600')
    ok = false
  }
  return ok
}

function addProjectToGrid(root: HTMLElement, p: Project): void {
  if (!p.name || String(p.name).trim() === '') return
  const grid = root.querySelector('#projectGrid')
  if (!grid) return
  const template = document.createElement('template')
  template.innerHTML = projectCard(p).trim()
  const card = template.content.firstElementChild
  if (card) grid.insertBefore(card, grid.lastElementChild) // before create card
  // bind click
  card?.addEventListener('click', () => {
    const idAttr = (card as HTMLElement).getAttribute('data-id')
    if (idAttr) window.location.hash = `#/project/detail?id=${encodeURIComponent(idAttr)}`
  })
  // right-click context menu
  ;(card as HTMLElement).addEventListener('contextmenu', (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    const idAttr = (card as HTMLElement).getAttribute('data-id')
    if (idAttr) openCardMenu(root, card as HTMLElement, Number(idAttr))
  })
  ;(card as HTMLElement)?.querySelector('.card-menu')?.addEventListener('click', (ev) => {
    ev.stopPropagation()
    const idAttr = (card as HTMLElement).getAttribute('data-id')
    if (idAttr) openCardMenu(root, card as HTMLElement, Number(idAttr))
  })
  sanitizeProjectGrid(grid as HTMLElement)
}

function openCardMenu(root: HTMLElement, anchor: HTMLElement, id: number): void {
  const rect = anchor.getBoundingClientRect()
  const menu = document.createElement('div')
  menu.className = 'fixed z-50 rounded-md bg-neutral-900 ring-1 ring-neutral-700/70 shadow-xl text-sm text-gray-200'
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
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-700/60 bg-sky-800" data-color="blue" title="Blue"></button>
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-700/60 bg-emerald-800" data-color="green" title="Green"></button>
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-700/60 bg-rose-800" data-color="red" title="Red"></button>
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-700/60 bg-fuchsia-800" data-color="purple" title="Purple"></button>
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-700/60 bg-orange-800" data-color="orange" title="Orange"></button>
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-700/60 bg-yellow-700" data-color="yellow" title="Yellow"></button>
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-700/60 bg-neutral-700" data-color="gray" title="Gray"></button>
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-700/60 bg-black" data-color="black" title="Black"></button>
      <button class="w-6 h-6 rounded-full ring-2 ring-neutral-700/60 bg-white" data-color="white" title="White"></button>
    </div>
    <button class="w-36 text-left px-3 py-2 hover:bg-neutral-800 text-rose-400" data-act="delete">削除</button>
  `
  const remove = () => menu.remove()
  const onDoc = (e: MouseEvent) => { if (!menu.contains(e.target as Node)) { remove(); document.removeEventListener('click', onDoc) } }
  setTimeout(() => document.addEventListener('click', onDoc), 0)
  menu.querySelector('[data-act="open"]')?.addEventListener('click', () => {
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
    if (!confirm('このプロジェクトを削除しますか？（GitHubリポジトリは削除されません）')) return
    try {
      await apiFetch(`/projects/${id}`, { method: 'DELETE' })
      // remove card from UI
      const btn = root.querySelector(`[data-id="${id}"]`)
      btn?.parentElement?.removeChild(btn)
    } catch {
      alert('削除に失敗しました')
    }
    remove()
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
  } catch {}

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
  const skills = ['Ruby','Python','Dart','Java','JavaScript','HTML','CSS','C++','C','Lisp','Rust','Julia','MATLAB','Haskell','COBOL']
  return `
    <div class="space-y-6">
      <section class="space-y-4">
        <div class="flex items-center gap-4">
          <div class="text-sm text-gray-400 w-24">所有者</div>
          <div class="flex-1 flex items-center gap-2">
            <div class="inline-flex items-center gap-2 rounded-md bg-neutral-800/70 ring-1 ring-neutral-700/60 px-3 py-1.5 text-sm text-gray-200">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>${owner}</span>
            </div>
            <span class="text-gray-500">/</span>
            <input id="pj-name" type="text" placeholder="プロジェクト名" class="flex-1 rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-2 text-gray-100 placeholder:text-gray-500" required maxlength="100" />
          </div>
        </div>
        <p id="err-name" class="text-rose-400 text-sm hidden">プロジェクト名を入力してください。</p>
        <p id="err-namefmt" class="text-rose-400 text-sm hidden">英数字・ハイフン・アンダースコア・ドットのみ、100文字以内で入力してください。</p>

        <div>
          <div class="text-sm text-gray-400 mb-1">プロジェクト概要</div>
          <textarea id="pj-desc" rows="5" class="w-full rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-2 text-gray-100 placeholder:text-gray-500" placeholder="説明を入力"></textarea>
        </div>
      </section>

      <section class="space-y-4">
        <div class="rounded-lg ring-1 ring-neutral-700/60 bg-neutral-900/40 p-4 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-300">表示権限を選択</div>
              <div class="text-xs text-gray-400">このプロジェクトを閲覧およびコミットできるユーザーを選択する</div>
            </div>
            <button id="pj-visibility" data-state="public" class="rounded-md bg-neutral-800/70 ring-1 ring-neutral-700/60 px-3 py-1.5 text-sm">Public</button>
          </div>

          <div class="flex items-center gap-3">
            <div class="text-sm text-gray-300 w-28">期日を選択</div>
            <input id="pj-start" type="date" class="w-44 rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-1.5 text-gray-100 placeholder:text-gray-500" />
            <span class="text-gray-400">〜</span>
            <input id="pj-end" type="date" class="w-44 rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-1.5 text-gray-100 placeholder:text-gray-500" />
          </div>
          <p id="err-date" class="text-rose-400 text-sm hidden">開始日は終了日より前の日付にしてください。</p>

          <div>
            <div class="text-sm text-gray-300 mb-2">スキル要件を選択</div>
            <div id="pj-skills" class="flex flex-wrap gap-2">
              ${skills.map((s, i) => `<button class="pj-skill px-3 py-1.5 rounded-full text-sm ring-1 ${i % 5 === 0 ? 'bg-emerald-700 text-white ring-emerald-600' : 'bg-neutral-800/60 text-gray-200 ring-neutral-700/60'}" data-skill="${s}">${s}</button>`).join('')}
            </div>
          </div>
        </div>
      </section>
    </div>
  `
}

function renderExistingRepoPanel(): string {
  const skills = ['Ruby','Python','Dart','Java','JavaScript','HTML','CSS','C++','C','Lisp','Rust','Julia','MATLAB','Haskell','COBOL']
  return `
    <div class="grid gap-6 md:grid-cols-12">
      <div class="md:col-span-5">
        <div class="text-sm text-gray-300 mb-2">GitHubリポジトリを選択</div>
        <div class="flex items-center gap-3">
          <input id="repoSearch" type="text" placeholder="リポジトリを検索..." class="flex-1 rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-2 text-gray-100 placeholder:text-gray-500" />
          <button class="rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-2 text-sm">更新が新しい順</button>
        </div>
        <div id="repoList" class="mt-3 divide-y divide-neutral-800/70 max-h-[48vh] overflow-y-auto"></div>
        <p class="text-xs text-gray-400 mt-2">リポジトリをひとつ選択してください。</p>
      </div>
      <div class="md:col-span-7">
        <div class="rounded-lg ring-1 ring-neutral-700/60 bg-neutral-900/40 p-4 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-300">選択されたリポジトリ</div>
              <div id="ex-selected" class="text-xs text-gray-400">未選択</div>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-sm text-gray-400 w-24">プロジェクト名</div>
            <input id="ex-name" type="text" placeholder="プロジェクト名" class="flex-1 rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-2 text-gray-100 placeholder:text-gray-500" maxlength="100" />
          </div>
          <p id="ex-err-namefmt" class="text-rose-400 text-sm hidden">英数字・ハイフン・アンダースコア・ドットのみ、100文字以内で入力してください。</p>
          <div>
            <div class="text-sm text-gray-400 mb-1">プロジェクト概要</div>
            <textarea id="ex-desc" rows="4" class="w-full rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-2 text-gray-100 placeholder:text-gray-500" placeholder="説明を入力"></textarea>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-gray-300">表示権限を選択</div>
              <div class="text-xs text-gray-400">このプロジェクトを閲覧およびコミットできるユーザーを選択する</div>
            </div>
            <button id="ex-visibility" data-state="public" class="rounded-md bg-neutral-800/70 ring-1 ring-neutral-700/60 px-3 py-1.5 text-sm">Public</button>
          </div>

          <div class="flex items-center gap-3">
            <div class="text-sm text-gray-300 w-28">期日を選択</div>
            <input id="ex-start" type="date" class="w-44 rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-1.5 text-gray-100 placeholder:text-gray-500" />
            <span class="text-gray-400">〜</span>
            <input id="ex-end" type="date" class="w-44 rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-1.5 text-gray-100 placeholder:text-gray-500" />
          </div>
          <p id="ex-err-date" class="text-rose-400 text-sm hidden">開始日は終了日より前の日付にしてください。</p>

          <div>
            <div class="text-sm text-gray-300 mb-2">スキル要件を選択</div>
            <div id="ex-skills" class="flex flex-wrap gap-2">
              ${skills.map((s, i) => `<button class="ex-skill px-3 py-1.5 rounded-full text-sm ring-1 ${i % 5 === 0 ? 'bg-emerald-700 text-white ring-emerald-600' : 'bg-neutral-800/60 text-gray-200 ring-neutral-700/60'}" data-skill="${s}">${s}</button>`).join('')}
            </div>
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
    <button type="button" class="w-full text-left py-4 hover:bg-neutral-900/40 px-1 rounded-md ring-1 ring-transparent" data-repo="${r.full_name}">
      <div class="flex items-center gap-2">
        <div class="font-medium text-sky-300">${r.name}</div>
        <span class="text-xs rounded bg-neutral-800/80 ring-1 ring-neutral-700/60 px-1.5 py-0.5">${visibility}</span>
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
