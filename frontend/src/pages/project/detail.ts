import { apiFetch } from '../../utils/api'
import { openTaskModal } from './task-modal'
// Account modal helpers (duplicated to open over current page)
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
function openAccountModal(root: HTMLElement): void {
  const me = (root as any)._me as { name?: string; email?: string; github_id?: number } | undefined
  const avatarUrl = me?.github_id ? `https://avatars.githubusercontent.com/u/${me.github_id}?s=128` : ''
  const overlay = document.createElement('div')
  overlay.id = 'accountOverlay'
  overlay.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] grid place-items-center'
  overlay.innerHTML = `
    <div class="relative w-[min(960px,92vw)] h-[80vh] max-h-[86vh] overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-neutral-700/70 shadow-2xl text-gray-100">
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
                <button id="ntf-toggle" type="button" class="toggle bg-emerald-600 relative inline-flex h-6 w-10 items-center rounded-full transition-colors">
                  <span class="knob inline-block h-5 w-5 transform rounded-full bg-white transition-transform translate-x-5"></span>
                </button>
              </div>
              <div class="mt-2 flex items-center gap-4 text-gray-200">
                <input id="ntf-start" type="time" value="06:30" class="w-32 rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-1.5 text-gray-100" />
                <span class="text-gray-400">〜</span>
                <input id="ntf-end" type="time" value="20:30" class="w-32 rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-1.5 text-gray-100" />
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  `
  const close = () => { overlay.remove(); const c=+(document.body.getAttribute('data-lock')||'0'); const n=Math.max(0,c-1); if(n===0){ document.body.style.overflow=''; } document.body.setAttribute('data-lock', String(n)) }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#accountClose')?.addEventListener('click', close)
  overlay.querySelector('#logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem('apiToken')
    close()
    window.location.hash = '#/login'
  })
  overlay.querySelectorAll('.tab-btn')?.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).getAttribute('data-tab')
      overlay.querySelectorAll('.tab-panel')?.forEach((p) => {
        (p as HTMLElement).classList.toggle('hidden', (p as HTMLElement).getAttribute('data-tab') !== id)
      })
      overlay.querySelectorAll('.tab-btn')?.forEach((b) => {
        const active = b === btn
        b.classList.toggle('bg-neutral-800/60', active)
        b.classList.toggle('ring-1', active)
        b.classList.toggle('ring-neutral-700/60', active)
      })
    })
  })
  // Toggle switch interactions
  overlay.querySelectorAll('.toggle').forEach((t) => {
    t.addEventListener('click', () => {
      t.classList.toggle('bg-emerald-600')
      t.classList.toggle('bg-neutral-700')
      const knob = (t as HTMLElement).querySelector('.knob') as HTMLElement | null
      knob?.classList.toggle('translate-x-5')
    })
  })
  // Notify time limit lock handling
  const ntfToggle = overlay.querySelector('#ntf-toggle') as HTMLElement | null
  const ntfStart = overlay.querySelector('#ntf-start') as HTMLInputElement | null
  const ntfEnd = overlay.querySelector('#ntf-end') as HTMLInputElement | null
  const applyTimeLock = () => {
    const on = ntfToggle?.classList.contains('bg-emerald-600')
    if (ntfStart) { ntfStart.disabled = !on; ntfStart.classList.toggle('opacity-50', !on) }
    if (ntfEnd) { ntfEnd.disabled = !on; ntfEnd.classList.toggle('opacity-50', !on) }
  }
  ntfToggle?.addEventListener('click', () => setTimeout(applyTimeLock, 0))
  applyTimeLock()
  document.body.appendChild(overlay); (function(){ const c=+(document.body.getAttribute('data-lock')||'0'); if(c===0){ document.body.style.overflow='hidden' } document.body.setAttribute('data-lock', String(c+1)) })()
  // Skills interactions
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
import { openTabPickerModal, type TabTemplate } from './tabs'

function tabTitle(type: TabTemplate): string {
  switch (type) {
    case 'kanban': return 'カンバンボード'
    case 'blank': return '空白のタブ'
    case 'notes': return 'ノート'
    case 'docs': return 'ドキュメント'
    case 'report': return 'レポート'
    case 'roadmap': return 'ロードマップ'
    case 'burndown': return 'バーンダウン'
    case 'timeline': return 'タイムライン'
    default: return 'タブ'
  }
}

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
  if (fullName) (container as HTMLElement).setAttribute('data-repo-full', fullName)

  container.innerHTML = detailLayout({ id: project.id, name: project.name, fullName })

  setupTabs(container, String(project.id))
  applyCoreTabs(container, String(project.id))

  // DnD (Summary widgets)
  enableDragAndDrop(container)

// Kanban board
renderKanban(container, String(project.id))
// After rendering base UI, refresh dynamic widgets (task summary, links, etc.)
try { refreshDynamicWidgets(container, String(project.id)) } catch {}
  // Load saved custom tabs
  loadCustomTabs(container, String(project.id))
  // Apply saved tab order (core + custom)
  try { applySavedTabOrder(container, String(project.id)) } catch {}
  // Enable DnD for tabs
  try { enableTabDnD(container, String(project.id)) } catch {}
  // Enable tab drag & drop reordering for custom tabs
  try { enableTabDnD(container, String(project.id)) } catch {}

  // Activate the leftmost visible tab (excluding the "+ 新規タブ")
  try {
    const bar = container.querySelector('#tabBar') as HTMLElement | null
    if (bar) {
      const tabs = Array.from(bar.querySelectorAll('.tab-btn')) as HTMLElement[]
      const first = tabs.find((el) => {
        const id = el.getAttribute('data-tab') || ''
        const hidden = el.classList.contains('hidden')
        return id && id !== 'new' && !hidden
      })
      first?.click()
    }
  } catch {}

  // Account avatar click: open account modal on the current page
  container.querySelector('#accountTopBtn')?.addEventListener('click', () => {
    openAccountModal(container)
  })

  // Load collaborators avatars
  loadCollaborators(container, project.id)

  // Bind add collaborator popover
  const addBtn = container.querySelector('#addCollabBtn') as HTMLElement | null
  addBtn?.addEventListener('click', (e) => openCollaboratorPopover(container, project.id, e.currentTarget as HTMLElement))

  // Load data for widgets from GitHub proxy (independent fallbacks)
  if (fullName) {
    // Overview (repo meta)
    try {
      const repo = await apiFetch<any>(`/github/repo?full_name=${encodeURIComponent(fullName)}`)
      hydrateOverview(container, repo)
    } catch {}
    // Top committers
    try {
      const contr = await apiFetch<any[]>(`/github/contributors?full_name=${encodeURIComponent(fullName)}`)
      hydrateCommitters(container, contr)
    } catch {}
    // README text (do not depend on repo call)
    try {
      const token = localStorage.getItem('apiToken')
      const res = await fetch(`/api/github/readme?full_name=${encodeURIComponent(fullName)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const readmeText = res.ok ? await res.text() : 'README not found'
      hydrateReadme(container, readmeText)
    } catch {}
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
    ;(container as any)._me = me
  } catch {}
}

// ---------- Widgets helpers ----------

function widgetShell(id: string, title: string, body: string): string {
  return `
    <div class="widget group rounded-xl ring-1 ring-neutral-700/60 bg-neutral-900/50 p-4 md:col-span-6 flex flex-col overflow-hidden" draggable="false" data-widget="${id}">
      <div class="flex items-center pb-2 mb-3 border-b border-neutral-700/60">
        <div class="text-sm text-gray-300">${title}</div>
        <div class="wg-tools ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 text-xs flex items-center gap-1">
          <span class="hidden md:inline">横:</span>
          <button class="w-size px-1 py-0.5 rounded ring-1 ring-neutral-700/60 hover:bg-neutral-800" data-size="sm">S</button>
          <button class="w-size px-1 py-0.5 rounded ring-1 ring-neutral-700/60 hover:bg-neutral-800" data-size="md">M</button>
          <button class="w-size px-1 py-0.5 rounded ring-1 ring-neutral-700/60 hover:bg-neutral-800" data-size="lg">L</button>
          <span class="hidden md:inline ml-2">縦:</span>
          <button class="w-h px-1 py-0.5 rounded ring-1 ring-neutral-700/60 hover:bg-neutral-800" data-h="sm">S</button>
          <button class="w-h px-1 py-0.5 rounded ring-1 ring-neutral-700/60 hover:bg-neutral-800" data-h="md">M</button>
          <button class="w-h px-1 py-0.5 rounded ring-1 ring-neutral-700/60 hover:bg-neutral-800" data-h="lg">L</button>
          <button class="w-del px-2 py-0.5 rounded ring-1 ring-rose-700/70 text-rose-400 hover:bg-rose-900/30">削除</button>
        </div>
      </div>
      <div class="wg-content min-h-0 flex-1 overflow-auto">${body}</div>
    </div>
  `
}

function addWidgetCard(): string {
  // Always stay at the bottom and take full width on desktop so it doesn't get in the way
  return `<button id="addWidget" class="order-last md:col-span-12 rounded-xl ring-1 ring-neutral-800/70 bg-neutral-900/40 grid place-items-center text-gray-400 h-24 md:h-28">ウィジェット追加<br/><span class="text-2xl md:text-3xl">＋</span></button>`
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
  return `<div class="h-full overflow-auto rounded bg-neutral-950/40 ring-1 ring-neutral-800/70 p-4 text-gray-200 whitespace-pre-wrap">Loading README...</div>`
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
  el.innerHTML = mdRenderToHtml(text || 'README not found')
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

  const isEdit = () => grid.getAttribute('data-edit') === '1'
  grid.addEventListener('dragstart', (e) => {
    if (!isEdit()) { (e as DragEvent).preventDefault(); return }
    const t = (e.target as HTMLElement).closest('.widget') as HTMLElement | null
    if (!t) return
    dragEl = t
    // Hide original so it doesn't look duplicated (kanban-style)
    setTimeout(() => { t.style.display = 'none' }, 0)
  })
  grid.addEventListener('dragover', (e) => {
    if (!isEdit()) return
    e.preventDefault()
    const t = e.target as HTMLElement
    const widget = t.closest('.widget') as HTMLElement | null
    if (!widget || !dragEl || widget === dragEl) return
    const rect = widget.getBoundingClientRect()
    const before = (e as DragEvent).clientY < rect.top + rect.height / 2
    if (before) grid.insertBefore(dragEl, widget)
    else grid.insertBefore(dragEl, widget.nextSibling)
  })
  grid.addEventListener('drop', () => {
    if (!isEdit()) return
    if (dragEl) (dragEl as HTMLElement).style.display = ''
    save()
    dragEl = null
  })
  grid.addEventListener('dragend', () => {
    if (dragEl) (dragEl as HTMLElement).style.display = ''
    dragEl = null
  })

  // Edit mode toggle
  const setEdit = (on: boolean) => {
    grid.setAttribute('data-edit', on ? '1' : '0')
    grid.querySelectorAll('.widget').forEach((w) => (w as HTMLElement).setAttribute('draggable', on ? 'true' : 'false'))
    const btn = root.querySelector('#wgEditToggle') as HTMLElement | null
    if (btn) btn.textContent = on ? '完了' : '編集'
    localStorage.setItem(`wg-edit-${pid}`, on ? '1' : '0')
    // Show "add widget" card only in edit mode
    const add = grid.querySelector('#addWidget') as HTMLElement | null
    if (on) {
      if (!add) {
        const t = document.createElement('template')
        t.innerHTML = addWidgetCard()
        const node = t.content.firstElementChild as HTMLElement | null
        if (node) {
          grid.appendChild(node)
          node.addEventListener('click', () => openWidgetPickerModal(root, pid))
        }
      }
    } else {
      add?.remove()
    }
    // Visual cues for edit mode
    // no badge toggle (badge removed)
    // Do not outline the whole grid in edit mode
    grid.classList.remove('ring-1', 'ring-amber-500/40', 'bg-amber-950/10', 'rounded-lg')
    grid.querySelectorAll('.widget').forEach((w) => {
      const el = w as HTMLElement
      el.classList.toggle('cursor-move', on)
      el.classList.toggle('border', on)
      el.classList.toggle('border-dashed', on)
      el.classList.toggle('border-amber-500/40', on)
      const tools = el.querySelector('.wg-tools') as HTMLElement | null
      if (tools) tools.classList.toggle('hidden', !on)
    })
  }
  const savedEdit = localStorage.getItem(`wg-edit-${pid}`) === '1'
  setEdit(!!savedEdit)
  const toggleBtn = root.querySelector('#wgEditToggle') as HTMLElement | null
  toggleBtn?.addEventListener('click', () => setEdit(grid.getAttribute('data-edit') !== '1'))

  load()
  applyWidgetSizes(root, pid)
  ensureWidgets(root, pid)

  // Row size dynamic: make vertical S equal to horizontal S (span-4)
  const adjustGridRowSize = () => {
    try {
      const probe = document.createElement('div')
      probe.style.gridColumn = 'span 4'
      probe.style.height = '1px'
      probe.style.visibility = 'hidden'
      grid.appendChild(probe)
      const w = probe.getBoundingClientRect().width || 0
      probe.remove()
      const base = Math.max(72, Math.round(w)) // keep a reasonable minimum
      ;(grid as HTMLElement).style.gridAutoRows = `${base}px`
    } catch {}
  }
  adjustGridRowSize()
  ;(function attachResize() {
    try {
      if ((grid as any)._rowSizerAttached) return
      ;(grid as any)._rowSizerAttached = true
      if ('ResizeObserver' in window) {
        const ro = new (window as any).ResizeObserver(() => adjustGridRowSize())
        ro.observe(grid)
        ;(grid as any)._ro = ro
      } else {
        window.addEventListener('resize', adjustGridRowSize)
      }
    } catch {}
  })()

  // Add widget button
  grid.querySelector('#addWidget')?.addEventListener('click', () => openWidgetPickerModal(root, pid))

  // Size change controls
  grid.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.w-size') as HTMLElement | null
    const hbtn = (e.target as HTMLElement).closest('.w-h') as HTMLElement | null
    if (!btn && !hbtn) return
    const widget = (btn || hbtn)!.closest('.widget') as HTMLElement | null
    if (!widget) return
    const id = widget.getAttribute('data-widget') || ''
    if (btn) {
      const size = btn.getAttribute('data-size') as 'sm'|'md'|'lg'
      setWidgetSize(root, pid, id, size)
    } else if (hbtn) {
      const h = hbtn.getAttribute('data-h') as 'sm'|'md'|'lg'
      setWidgetHeight(root, pid, id, h)
    }
  })

  // Delete widget
  grid.addEventListener('click', (e) => {
    const del = (e.target as HTMLElement).closest('.w-del') as HTMLElement | null
    if (!del) return
    const widget = del.closest('.widget') as HTMLElement | null
    if (!widget) return
    const id = widget.getAttribute('data-widget') || ''
    // Confirm deletion
    const ok = confirm('このウィジェットを削除しますか？')
    if (!ok) return
    // Remove DOM
    widget.remove()
    // Persist order
    const order = Array.from(grid.querySelectorAll('.widget')).map((w) => (w as HTMLElement).getAttribute('data-widget'))
    localStorage.setItem(`pj-widgets-${pid}`, JSON.stringify(order))
    // Remove meta
    const meta = getWidgetMeta(pid)
    if (meta[id]) { delete meta[id]; setWidgetMeta(pid, meta) }
  })

  // Markdown widget delegated handlers
  const getWid = (el: HTMLElement | null) => (el?.closest('.widget') as HTMLElement | null)
  grid.addEventListener('click', (e) => {
    const edit = (e.target as HTMLElement).closest('.md-edit') as HTMLElement | null
    if (edit) {
      const w = getWid(edit); if (!w) return
      const id = w.getAttribute('data-widget') || ''
      const map = mdGetMap(pid)
      const txt = map[id] || ''
      const editor = w.querySelector('.md-editor') as HTMLElement | null
      const ta = w.querySelector('.md-text') as HTMLTextAreaElement | null
      editor?.classList.remove('hidden'); if (ta) ta.value = txt
      return
    }
    const save = (e.target as HTMLElement).closest('.md-save') as HTMLElement | null
    if (save) {
      const w = getWid(save); if (!w) return
      const id = w.getAttribute('data-widget') || ''
      const ta = w.querySelector('.md-text') as HTMLTextAreaElement | null
      const preview = w.querySelector('.md-preview') as HTMLElement | null
      const val = (ta?.value || '').trim()
      mdSet(pid, id, val)
      if (preview) preview.innerHTML = mdRenderToHtml(val)
      const editor = w.querySelector('.md-editor') as HTMLElement | null
      editor?.classList.add('hidden')
      return
    }
    const cancel = (e.target as HTMLElement).closest('.md-cancel') as HTMLElement | null
    if (cancel) {
      const w = getWid(cancel); if (!w) return
      const editor = w.querySelector('.md-editor') as HTMLElement | null
      editor?.classList.add('hidden')
      return
    }
    // Links: add
    const add = (e.target as HTMLElement).closest('.lnk-add') as HTMLElement | null
    if (add) {
      const w = getWid(add); if (!w) return
      // simple prompt-based add
      const title = (prompt('リンクのタイトル') || '').trim()
      const url = (prompt('URL (https://...)') || '').trim()
      if (!url) return
      const id = w.getAttribute('data-widget') || ''
      const list = mdGetLinks(pid, id)
      list.push({ title, url })
      mdSetLinks(pid, id, list)
      refreshDynamicWidgets(root, pid)
      return
    }
  })

  // Initialize markdown previews from storage
  const mdMap = mdGetMap(pid)
  grid.querySelectorAll('.md-widget').forEach((wrap) => {
    const w = (wrap as HTMLElement).closest('.widget') as HTMLElement | null
    const id = w?.getAttribute('data-widget') || ''
    const preview = (wrap as HTMLElement).querySelector('.md-preview') as HTMLElement | null
    const txt = mdMap[id] || ''
    if (preview) preview.innerHTML = mdRenderToHtml(txt || 'ここにMarkdownを書いてください')
  })

  // Render task summary
  refreshDynamicWidgets(root, pid)
}

type WidgetSize = 'sm' | 'md' | 'lg'

type WidgetHeight = 'sm' | 'md' | 'lg'
type WidgetMeta = { size: WidgetSize; h?: WidgetHeight; type?: string }

function getWidgetMeta(pid: string): Record<string, WidgetMeta> {
  try { return JSON.parse(localStorage.getItem(`pj-widgets-meta-${pid}`) || '{}') as Record<string, WidgetMeta> } catch { return {} }
}

function setWidgetMeta(pid: string, meta: Record<string, WidgetMeta>): void {
  localStorage.setItem(`pj-widgets-meta-${pid}`, JSON.stringify(meta))
}

function setWidgetSize(root: HTMLElement, pid: string, id: string, size: WidgetSize): void {
  const meta = getWidgetMeta(pid)
  meta[id] = { ...(meta[id]||{}), size }
  setWidgetMeta(pid, meta)
  applyWidgetSizes(root, pid)
}

function setWidgetHeight(root: HTMLElement, pid: string, id: string, h: WidgetHeight): void {
  const meta = getWidgetMeta(pid)
  meta[id] = { ...(meta[id]||{}), h }
  setWidgetMeta(pid, meta)
  applyWidgetSizes(root, pid)
}

function applyWidgetSizes(root: HTMLElement, pid: string): void {
  const meta = getWidgetMeta(pid)
  root.querySelectorAll('.widget').forEach((w) => {
    const id = (w as HTMLElement).getAttribute('data-widget') || ''
    const size = (meta[id]?.size || 'md') as 'sm'|'md'|'lg'
    const h = (meta[id]?.h || 'md') as 'sm'|'md'|'lg'
    const cls = (w as HTMLElement).classList
    // remove previous spans
    cls.remove('md:col-span-4','md:col-span-6','md:col-span-8','md:col-span-12')
    if (size === 'sm') cls.add('md:col-span-4')
    else if (size === 'md') cls.add('md:col-span-8')
    else cls.add('md:col-span-12')
    // apply grid row span for height units
    const hUnits = h === 'sm' ? 1 : h === 'md' ? 2 : 3
    ;(w as HTMLElement).style.gridRow = `span ${hUnits} / span ${hUnits}`

    // Highlight active controls (size / height)
    const markActive = (btns: NodeListOf<Element>, attr: 'data-size'|'data-h', val: string) => {
      btns.forEach((b) => {
        const el = b as HTMLElement
        const isActive = el.getAttribute(attr) === val
        el.classList.toggle('bg-emerald-700', isActive)
        el.classList.toggle('text-white', isActive)
        el.classList.toggle('ring-emerald-600', isActive)
        // inactive style (subtle)
        el.classList.toggle('bg-neutral-800/40', !isActive)
        el.classList.toggle('text-gray-200', !isActive)
        el.classList.toggle('ring-neutral-700/60', !isActive)
        el.setAttribute('aria-pressed', isActive ? 'true' : 'false')
      })
    }
    const sizeBtns = w.querySelectorAll('.w-size')
    const hBtns = w.querySelectorAll('.w-h')
    markActive(sizeBtns as NodeListOf<Element>, 'data-size', size)
    markActive(hBtns as NodeListOf<Element>, 'data-h', h)
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
    if (card) {
      const add = grid.querySelector('#addWidget')
      if (add) grid.insertBefore(card, add)
      else grid.appendChild(card)
    }
  })
}

function openWidgetPickerModal(root: HTMLElement, pid: string): void {
  const overlay = document.createElement('div')
  overlay.className = 'fixed inset-0 z-[66] bg-black/60 backdrop-blur-[1px] grid place-items-center fade-overlay'
  overlay.innerHTML = `
    <div class="relative w-[min(1200px,96vw)] max-h-[90vh] overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-neutral-700/70 shadow-2xl text-gray-100 pop-modal">
      <header class="h-12 flex items-center px-5 border-b border-neutral-800/70">
        <h3 class="text-lg font-semibold">ウィジェット一覧</h3>
        <button id="wp-close" class="ml-auto text-2xl text-neutral-300 hover:text-white">×</button>
      </header>
      <div class="flex h-[calc(90vh-3rem)]">
        <aside class="w-56 shrink-0 p-4 border-r border-neutral-800/70 space-y-2">
          <button class="wp-cat w-full text-left px-3 py-2 rounded bg-neutral-800/70 ring-1 ring-neutral-700/60 text-sm" data-cat="all">すべて</button>
          <button class="wp-cat w-full text-left px-3 py-2 rounded hover:bg-neutral-800/40 text-sm" data-cat="github">GitHub</button>
          <button class="wp-cat w-full text-left px-3 py-2 rounded hover:bg-neutral-800/40 text-sm" data-cat="text">テキスト</button>
          <button class="wp-cat w-full text-left px-3 py-2 rounded hover:bg-neutral-800/40 text-sm" data-cat="manage">管理</button>
        </aside>
        <section class="flex-1 p-8 overflow-y-auto h-full">
          <div id="wp-grid" class="grid grid-cols-3 lg:grid-cols-4 auto-rows-min gap-x-12 gap-y-10 min-h-[28rem]">
            ${widgetCard('readme', 'README表示')}
            ${widgetCard('overview', 'オーバービュー')}
            ${widgetCard('contrib', 'コントリビューショングラフ')}
            ${widgetCard('committers', 'ユーザーコミットグラフ')}
            ${widgetCard('markdown', 'Markdownブロック')}
            ${widgetCard('tasksum', 'タスクサマリー')}
            ${widgetCard('milestones', 'マイルストーン')}
            ${widgetCard('links', 'クイックリンク')}
          </div>
        </section>
      </div>
    </div>
  `
  const close = () => { overlay.remove(); const c=+(document.body.getAttribute('data-lock')||'0'); const n=Math.max(0,c-1); if(n===0){ document.body.style.overflow=''; } document.body.setAttribute('data-lock', String(n)) }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#wp-close')?.addEventListener('click', close)
  // Robust delegated click to ensure closing after add
  const gridEl = overlay.querySelector('#wp-grid') as HTMLElement | null
  gridEl?.addEventListener('click', (ev) => {
    const card = (ev.target as HTMLElement).closest('[data-widget-type]') as HTMLElement | null
    if (!card || !gridEl.contains(card)) return
    const type = card.getAttribute('data-widget-type')!
    addWidget(root, pid, type)
    close()
  })
  // Category filtering
  const cats = overlay.querySelectorAll('.wp-cat')
  const getCat = (t: string): string => {
    if (['readme','overview','contrib','committers'].includes(t)) return 'github'
    if (['markdown'].includes(t)) return 'text'
    if (['tasksum','milestones','links'].includes(t)) return 'manage'
    return 'other'
  }
  const applyCat = (cat: string) => {
    gridEl?.querySelectorAll('[data-widget-type]')?.forEach((n) => {
      const t = (n as HTMLElement).getAttribute('data-widget-type') || ''
      ;(n as HTMLElement).style.display = (cat === 'all' || getCat(t) === cat) ? '' : 'none'
    })
    cats.forEach((b) => {
      const on = (b as HTMLElement).getAttribute('data-cat') === cat
      b.classList.toggle('bg-neutral-800/70', on)
      b.classList.toggle('ring-1', on)
      b.classList.toggle('ring-neutral-700/60', on)
    })
  }
  cats.forEach((b) => b.addEventListener('click', () => applyCat((b as HTMLElement).getAttribute('data-cat') || 'all')))
  applyCat('all')
  document.body.appendChild(overlay); (function(){ const c=+(document.body.getAttribute('data-lock')||'0'); if(c===0){ document.body.style.overflow='hidden' } document.body.setAttribute('data-lock', String(c+1)) })()
}

function widgetCard(type: string, title: string): string {
  return `
    <button type="button" data-widget-type="${type}" class="group block rounded-xl overflow-hidden ring-1 ring-neutral-700/60 hover:ring-emerald-600 transition pop-card btn-press">
      <div class="h-40 md:h-44 bg-neutral-800/80 grid place-items-center text-gray-300 relative px-2">
        ${widgetThumb(type)}
      </div>
      <div class="px-2 py-2 text-center text-sm font-medium">${title}</div>
    </button>
  `
}

function widgetThumb(type: string): string {
  if (type === 'contrib') return `<div class=\"w-full h-24 overflow-hidden\"><div class=\"grid\" style=\"grid-template-columns: repeat(30, 0.5rem); gap: 2px;\">${Array.from({length:210}).map((_,i)=>`<div class=\\"w-2 h-2 ${i%5? 'bg-emerald-800':'bg-emerald-600'}\\"></div>`).join('')}</div></div>`
  if (type === 'overview') return `<div class=\"w-full h-20 bg-neutral-900/60 ring-1 ring-neutral-600/60 rounded p-2\"><div class=\"h-2 bg-neutral-800 rounded mb-2\"><div class=\"h-2 bg-emerald-600 rounded w-2/3\"></div></div><div class=\"h-2 bg-neutral-800 rounded w-1/2\"></div></div>`
  if (type === 'committers') return `<div class=\"w-full h-24 flex items-end gap-1 px-2\">${[4,8,12,6,2].map(h=>`<div class=\\"w-5 bg-emerald-700 rounded\\" style=\\"height:${h * 6}px\\"></div>`).join('')}</div>`
  if (type === 'readme') return `<div class=\"w-full h-24 bg-neutral-900/60 ring-1 ring-neutral-600/60 rounded p-2 text-xs text-gray-400\"># README\n- Getting Started\n- Usage</div>`
  if (type === 'markdown') return `<div class=\"w-full h-20 bg-neutral-900/60 ring-1 ring-neutral-600/60 rounded p-2 text-xs text-gray-400\">## Markdown\n- リスト\n- **強調**</div>`
  if (type === 'tasksum') return `<div class=\"w-full h-20 bg-neutral-900/60 ring-1 ring-neutral-600/60 rounded p-2 grid grid-cols-3 gap-2 text-[10px] text-gray-300\"><div class=\"rounded bg-neutral-800/60 p-1 text-center\">TODO<br/><span class=\"text-emerald-400\">5</span></div><div class=\"rounded bg-neutral-800/60 p-1 text-center\">DOING<br/><span class=\"text-emerald-400\">3</span></div><div class=\"rounded bg-neutral-800/60 p-1 text-center\">DONE<br/><span class=\"text-emerald-400\">8</span></div></div>`
  if (type === 'milestones') return `<div class=\"w-full h-20 bg-neutral-900/60 ring-1 ring-neutral-600/60 rounded p-2 text-xs text-gray-400\"><div>v1.0 リリース</div><div class=\"text-gray-500\">2025-01-31</div></div>`
  if (type === 'links') return `<div class=\"w-full h-20 bg-neutral-900/60 ring-1 ring-neutral-600/60 rounded p-2 text-xs text-gray-400\">- PR一覧\n- 仕様書</div>`
  if (type === 'progress') return `<div class=\"w-full h-20 bg-neutral-900/60 ring-1 ring-neutral-600/60 rounded p-2\"><div class=\"h-2 bg-neutral-800 rounded\"><div class=\"h-2 bg-emerald-600 rounded w-1/2\"></div></div><div class=\"text-[10px] text-gray-400 mt-1\">50%</div></div>`
  if (type === 'team') return `<div class=\"w-full h-20 bg-neutral-900/60 ring-1 ring-neutral-600/60 rounded p-2 text-xs text-gray-400\">👥 メンバー</div>`
  if (type === 'todo') return `<div class=\"w-full h-20 bg-neutral-900/60 ring-1 ring-neutral-600/60 rounded p-2 text-xs text-gray-400\">- [ ] 項目</div>`
  return `<div class=\"text-gray-400\">Widget</div>`
}

function addWidget(root: HTMLElement, pid: string, type: string): void {
  const id = `w-${type}-${Date.now()}`
  const grid = root.querySelector('#widgetGrid') as HTMLElement
  const html = widgetShell(id, widgetTitle(type), buildWidgetBody(type))
  const t = document.createElement('template')
  t.innerHTML = html
  const el = t.content.firstElementChild
  if (el) {
    const add = grid.querySelector('#addWidget')
    if (add) grid.insertBefore(el, add)
    else grid.appendChild(el)
    // ensure tools visibility matches current edit state
    const on = grid.getAttribute('data-edit') === '1'
    const tools = (el as HTMLElement).querySelector('.wg-tools') as HTMLElement | null
    if (tools) tools.classList.toggle('hidden', !on)
    // if in edit mode, immediately apply edit visuals and drag
    if (on) {
      const card = el as HTMLElement
      card.setAttribute('draggable', 'true')
      card.classList.add('cursor-move', 'border', 'border-dashed', 'border-amber-500/40')
    }
  }
  // refresh dynamic contents after adding
  try { refreshDynamicWidgets(root, pid) } catch {}
  // persist order
  const order = Array.from(grid.querySelectorAll('.widget')).map((w) => (w as HTMLElement).getAttribute('data-widget'))
  localStorage.setItem(`pj-widgets-${pid}`, JSON.stringify(order))
  // persist meta (size default M and type)
  const meta = getWidgetMeta(pid)
  meta[id] = { size: 'md', h: 'md', type }
  setWidgetMeta(pid, meta)
}

function refreshDynamicWidgets(root: HTMLElement, pid: string): void {
  // Task summary
  const meta = getWidgetMeta(pid)
  Object.entries(meta).forEach(([id, m]) => {
    const w = root.querySelector(`[data-widget="${id}"]`) as HTMLElement | null
    if (!w) return
    if (m.type === 'tasksum') {
      const box = w.querySelector('.tasksum-body') as HTMLElement | null
      if (box) {
        // load from Kanban storage
        const tasks = loadTasks(pid)
        const counts = { todo: 0, doing: 0, review: 0, done: 0 } as Record<string, number>
        tasks.forEach(t => counts[t.status] = (counts[t.status] || 0) + 1)
        box.innerHTML = `
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
            ${[['todo','TODO'],['doing','DOING'],['review','REVIEW'],['done','DONE']].map(([k,label])=>`<div class=\"rounded ring-1 ring-neutral-700/60 bg-neutral-800/40 p-2 text-center\">${label}<div class=\"text-2xl text-emerald-400\">${counts[k]||0}</div></div>`).join('')}
          </div>
        `
      }
    }
    if (m.type === 'links') {
      const box = w.querySelector('.links-body') as HTMLElement | null
      if (box) {
        const links = mdGetLinks(pid, id)
        box.innerHTML = links.length ? `<ul class=\"list-disc ml-5 space-y-1\">${links.map(l=>`<li><a href=\"${l.url}\" target=\"_blank\" class=\"text-sky-400 hover:text-sky-300\">${l.title||l.url}</a></li>`).join('')}</ul>` : '<p class="text-gray-400">リンクはまだありません。</p>'
      }
    }
  })
}

type QuickLink = { title: string; url: string }
function mdGetLinks(pid: string, id: string): QuickLink[] {
  try { return JSON.parse(localStorage.getItem(`pj-links-${pid}-${id}`) || '[]') as QuickLink[] } catch { return [] }
}
function mdSetLinks(pid: string, id: string, list: QuickLink[]): void {
  localStorage.setItem(`pj-links-${pid}-${id}`, JSON.stringify(list))
}

function widgetTitle(type: string): string {
  switch (type) {
    case 'readme': return 'README'
    case 'overview': return 'Overview'
    case 'contrib': return 'Contributions'
    case 'markdown': return 'Markdown'
    case 'committers': return 'Top Committers'
    default: return 'Widget'
  }
}

function buildWidgetBody(type: string): string {
  switch (type) {
    case 'readme': return readmeSkeleton()
    case 'overview': return overviewSkeleton()
    case 'contrib': return contributionWidget()
    case 'markdown': return markdownWidget()
    case 'tasksum': return `<div class=\"tasksum-body text-sm text-gray-200\"></div>`
    case 'milestones': return `<ul class=\"text-sm text-gray-200 space-y-2\"><li>企画 <span class=\"text-gray-400\">(完了)</span></li><li>実装 <span class=\"text-gray-400\">(進行中)</span></li><li>リリース <span class=\"text-gray-400\">(未着手)</span></li></ul>`
    case 'links': return `<div class=\"links-body text-sm text-gray-200\"></div><div class=\"mt-2 text-xs\"><button class=\"lnk-add rounded ring-1 ring-neutral-700/60 px-2 py-0.5 hover:bg-neutral-800\">リンク追加</button></div>`
    case 'progress': return `<div class=\"progress-body\"><div class=\"h-2 bg-neutral-800 rounded\"><div class=\"h-2 bg-emerald-600 rounded w-0\"></div></div><div class=\"text-xs text-gray-400 mt-1\">0%</div></div>`
    case 'team': return `<div class=\"team-body text-sm text-gray-200\"><p class=\"text-gray-400\">読み込み中...</p></div>`
    case 'todo': return `<div class=\"todo-body text-sm text-gray-200\"></div><div class=\"mt-2 text-xs\"><button class=\"todo-add rounded ring-1 ring-neutral-700/60 px-2 py-0.5 hover:bg-neutral-800\">項目追加</button></div>`
    case 'committers': return barSkeleton()
    default: return `<div class=\"h-40 grid place-items-center text-gray-400\">Mock</div>`
  }
}

// ------- Markdown widget -------
function markdownWidget(): string {
  return `
    <div class="md-widget">
      <div class="md-toolbar text-xs text-gray-400 flex gap-2">
        <button class="md-edit rounded ring-1 ring-neutral-700/60 px-2 py-0.5 hover:bg-neutral-800">編集</button>
        <span class="md-status text-gray-500"></span>
      </div>
      <div class="md-preview whitespace-pre-wrap text-sm text-gray-200 mt-2"></div>
      <div class="md-editor hidden mt-3">
        <textarea class="md-text w-full h-36 rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-2 text-gray-100 placeholder:text-gray-500" placeholder="ここにMarkdownを書いてください"></textarea>
        <div class="mt-2 flex gap-2">
          <button class="md-save rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5">保存</button>
          <button class="md-cancel rounded bg-neutral-800/60 ring-1 ring-neutral-700/60 text-gray-200 text-xs px-3 py-1.5">キャンセル</button>
        </div>
      </div>
    </div>
  `
}

function mdGetMap(pid: string): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(`pj-md-${pid}`) || '{}') as Record<string, string> } catch { return {} }
}
function mdSet(pid: string, id: string, text: string): void {
  const m = mdGetMap(pid); m[id] = text; localStorage.setItem(`pj-md-${pid}`, JSON.stringify(m))
}
function mdRenderToHtml(src: string): string {
  // Escape HTML
  let s = (src || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
  // Code fences
  s = s.replace(/```([\s\S]*?)```/g, (m, p1) => `<pre class=\"rounded bg-neutral-900 ring-1 ring-neutral-800/70 p-3 overflow-auto\"><code>${p1}</code></pre>`)
  // Headings
  s = s.replace(/^######\s?(.*)$/gm, '<h6 class=\"text-xs font-semibold mt-2\">$1</h6>')
  s = s.replace(/^#####\s?(.*)$/gm, '<h5 class=\"text-sm font-semibold mt-2\">$1</h5>')
  s = s.replace(/^####\s?(.*)$/gm, '<h4 class=\"text-base font-semibold mt-3\">$1</h4>')
  s = s.replace(/^###\s?(.*)$/gm, '<h3 class=\"text-lg font-semibold mt-3\">$1</h3>')
  s = s.replace(/^##\s?(.*)$/gm, '<h2 class=\"text-xl font-semibold mt-4\">$1</h2>')
  s = s.replace(/^#\s?(.*)$/gm, '<h1 class=\"text-2xl font-semibold mt-4\">$1</h1>')
  // Bold/italic/code/links
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>')
  s = s.replace(/`([^`]+)`/g, '<code class=\"bg-neutral-900 px-1 rounded\">$1</code>')
  s = s.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href=\"$2\" target=\"_blank\" class=\"text-sky-400 hover:text-sky-300\">$1<\/a>')
  // Lists
  s = s.replace(/^\s*\*\s+(.*)$/gm, '<li>$1</li>')
  s = s.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul class=\"list-disc ml-5\">${m}</ul>`) // simple wrap
  // Paragraphs
  s = s.replace(/^(?!<h\d|<ul|<pre|<li|<\/li|<\/ul|<code|<strong|<em|<a)(.+)$/gm, '<p class=\"my-2\">$1</p>')
  return s
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

// ---------- Custom tab builders ----------
function buildNotesTab(panel: HTMLElement, pid: string, id: string): void {
  panel.innerHTML = `
    <div class="rounded-xl ring-1 ring-neutral-800/70 bg-neutral-900/50 p-4 text-gray-200">
      <div class="flex items-center gap-3 mb-3">
        <div class="text-sm text-gray-300">ノート</div>
        <button id="nt-save" class="ml-auto rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5">保存</button>
      </div>
      <div class="grid md:grid-cols-2 gap-4">
        <textarea id="nt-text" class="w-full h-72 rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-2 text-gray-100" placeholder="ここにMarkdownでノートを書けます"></textarea>
        <div id="nt-preview" class="h-72 overflow-auto rounded-md bg-neutral-950/40 ring-1 ring-neutral-800/70 p-3 text-gray-100 whitespace-pre-wrap"></div>
      </div>
    </div>
  `
  const key = `tab-notes-${pid}-${id}`
  const txt = panel.querySelector('#nt-text') as HTMLTextAreaElement
  const prev = panel.querySelector('#nt-preview') as HTMLElement
  try { txt.value = localStorage.getItem(key) || '' } catch {}
  const render = () => { prev.innerHTML = mdRenderToHtml(txt.value || '') }
  render()
  txt.addEventListener('input', render)
  panel.querySelector('#nt-save')?.addEventListener('click', () => { localStorage.setItem(key, txt.value || '') })
}

function buildDocsTab(panel: HTMLElement, pid: string, id: string): void {
  panel.innerHTML = `
    <div class="rounded-xl ring-1 ring-neutral-800/70 bg-neutral-900/50 p-0 text-gray-200 overflow-hidden">
      <div class="flex">
        <aside class="w-56 shrink-0 border-r border-neutral-800/70 p-3 space-y-2" id="dc-nav">
          <div class="flex items-center gap-2">
            <div class="text-sm text-gray-300">ページ</div>
            <button id="dc-add" class="ml-auto text-xs rounded bg-neutral-800/60 ring-1 ring-neutral-700/60 px-2 py-0.5">追加</button>
          </div>
          <div id="dc-list" class="space-y-1"></div>
        </aside>
        <section class="flex-1 p-4">
          <input id="dc-title" class="w-full rounded bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-2 text-gray-100 mb-2" placeholder="タイトル" />
          <textarea id="dc-body" class="w-full h-72 rounded bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-2 text-gray-100" placeholder="Markdownで本文"></textarea>
          <div class="mt-2 text-right">
            <button id="dc-save" class="rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5">保存</button>
          </div>
        </section>
      </div>
    </div>
  `
  type Page = { id: string; title: string; body: string }
  const storeKey = `tab-docs-${pid}-${id}`
  const load = (): { pages: Page[]; sel?: string } => { try { return JSON.parse(localStorage.getItem(storeKey) || '{"pages":[]}') } catch { return { pages: [] } } }
  const save = (data: { pages: Page[]; sel?: string }) => localStorage.setItem(storeKey, JSON.stringify(data))
  const state = load()
  const list = panel.querySelector('#dc-list') as HTMLElement
  const title = panel.querySelector('#dc-title') as HTMLInputElement
  const body = panel.querySelector('#dc-body') as HTMLTextAreaElement
  const renderList = () => {
    list.innerHTML = (state.pages || []).map(p => `<button data-id="${p.id}" class="w-full text-left px-2 py-1 rounded hover:bg-neutral-800/60 ${state.sel===p.id?'bg-neutral-800/60':''}">${p.title||'Untitled'}</button>`).join('') || '<p class="text-xs text-gray-400">ページがありません。</p>'
    list.querySelectorAll('[data-id]')?.forEach((el)=> el.addEventListener('click', ()=>{ state.sel = (el as HTMLElement).getAttribute('data-id')||''; save(state); loadPage() }))
  }
  const loadPage = () => {
    const p = state.pages.find(x=>x.id===state.sel)
    title.value = p?.title || ''
    body.value = p?.body || ''
    renderList()
  }
  panel.querySelector('#dc-add')?.addEventListener('click', ()=>{ const p: Page = { id: String(Date.now()), title: '新規ページ', body: '' }; state.pages.push(p); state.sel=p.id; save(state); renderList(); loadPage() })
  panel.querySelector('#dc-save')?.addEventListener('click', ()=>{ const p = state.pages.find(x=>x.id===state.sel); if (!p) return; p.title=title.value; p.body=body.value; save(state); renderList() })
  if (!state.pages.length) { state.pages=[{id:String(Date.now()), title:'はじめに', body:''}]; state.sel=state.pages[0].id; save(state) }
  renderList(); loadPage()
}

function buildReportTab(panel: HTMLElement, pid: string): void {
  const tasks = loadTasks(pid)
  const counts = { todo:0, doing:0, review:0, done:0 } as Record<string, number>
  tasks.forEach(t=> counts[t.status] = (counts[t.status]||0)+1)
  const today = new Date().toISOString().slice(0,10)
  const overdue = tasks.filter(t => t.due && t.due < today && t.status!=='done')
  panel.innerHTML = `
    <div class="rounded-xl ring-1 ring-neutral-800/70 bg-neutral-900/50 p-4 text-gray-200">
      <div class="text-sm text-gray-300 mb-2">タスクサマリー</div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        ${[['TODO','todo'],['DOING','doing'],['REVIEW','review'],['DONE','done']].map(([label,k])=>`<div class=\"rounded ring-1 ring-neutral-700/60 bg-neutral-800/40 p-3 text-center\">${label}<div class=\"text-2xl text-emerald-400\">${counts[k]||0}</div></div>`).join('')}
      </div>
      <div class="mt-4">
        <div class="text-sm text-gray-300 mb-1">期限切れ</div>
        ${overdue.length ? `<ul class=\"list-disc ml-6 space-y-1\">${overdue.map(t=>`<li>${t.title} <span class=\\"text-xs text-rose-400\\">${t.due}</span></li>`).join('')}</ul>` : '<p class="text-gray-400 text-sm">ありません。</p>'}
      </div>
    </div>
  `
}

function buildRoadmapTab(panel: HTMLElement, pid: string, id: string): void {
  panel.innerHTML = `
    <div class="rounded-xl ring-1 ring-neutral-800/70 bg-neutral-900/50 p-4 text-gray-200">
      <div class="flex items-center gap-2 mb-3">
        <input id="rd-title" class="rounded bg-neutral-800/60 ring-1 ring-neutral-700/60 px-2 py-1 text-sm" placeholder="項目名" />
        <input id="rd-date" type="date" class="rounded bg-neutral-800/60 ring-1 ring-neutral-700/60 px-2 py-1 text-sm" />
        <button id="rd-add" class="rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5">追加</button>
      </div>
      <div id="rd-list" class="space-y-2"></div>
    </div>
  `
  type Item = { title: string; date: string }
  const key = `tab-roadmap-${pid}-${id}`
  const load = (): Item[] => { try { return JSON.parse(localStorage.getItem(key) || '[]') as Item[] } catch { return [] } }
  const save = (list: Item[]) => localStorage.setItem(key, JSON.stringify(list))
  const list = panel.querySelector('#rd-list') as HTMLElement
  const render = () => {
    const data = load().sort((a,b)=> (a.date||'').localeCompare(b.date||''))
    list.innerHTML = data.length ? data.map(i=>`<div class=\"rounded ring-1 ring-neutral-700/60 bg-neutral-800/40 p-2 flex items-center\"><div class=\"text-sm\">${i.title}</div><div class=\"ml-auto text-xs text-gray-400\">${i.date||'-'}</div></div>`).join('') : '<p class="text-sm text-gray-400">項目がありません。</p>'
  }
  panel.querySelector('#rd-add')?.addEventListener('click', ()=>{
    const t = (panel.querySelector('#rd-title') as HTMLInputElement).value.trim()
    const d = (panel.querySelector('#rd-date') as HTMLInputElement).value
    if (!t) return
    const cur = load(); cur.push({ title: t, date: d }); save(cur); render()
    ;(panel.querySelector('#rd-title') as HTMLInputElement).value = ''
    ;(panel.querySelector('#rd-date') as HTMLInputElement).value = ''
  })
  render()
}

function buildBurndownTab(panel: HTMLElement, pid: string): void {
  const days = 14
  const tasks = loadTasks(pid)
  const remaining = tasks.filter(t=> t.status!=='done').length
  const series = Array.from({length: days}, (_,i)=> remaining - Math.floor((remaining/days)*i))
  panel.innerHTML = `
    <div class="rounded-xl ring-1 ring-neutral-800/70 bg-neutral-900/50 p-4 text-gray-200">
      <div class="text-sm text-gray-300 mb-2">簡易バーンダウン（${days}日）</div>
      <div class="h-40 flex items-end gap-1">
        ${series.map(v=>`<div class=\"w-4 bg-emerald-700\" style=\"height:${Math.max(4, v*6)}px\"></div>`).join('')}
      </div>
      <p class="text-xs text-gray-400 mt-2">実データ連携は未実装。タスク残数ベースの簡易表示です。</p>
    </div>
  `
}

function buildTimelineTab(panel: HTMLElement, pid: string): void {
  const tasks = loadTasks(pid)
  const events: Array<{ at: string; text: string; title: string }> = []
  tasks.forEach(t=> (t.history||[]).forEach(h=> events.push({ at: h.at, text: h.text, title: t.title })))
  events.sort((a,b)=> (b.at||'').localeCompare(a.at||''))
  panel.innerHTML = `
    <div class="rounded-xl ring-1 ring-neutral-800/70 bg-neutral-900/50 p-4 text-gray-200">
      <div class="text-sm text-gray-300 mb-2">最近のアクティビティ</div>
      ${events.length ? `<ul class=\"space-y-2\">${events.slice(0,30).map(e=>`<li class=\\"text-sm\\"><span class=\\"text-xs text-gray-400\\">${e.at}</span> - ${e.text} <span class=\\"text-xs text-gray-400\\">(${e.title})</span></li>`).join('')}</ul>` : '<p class="text-sm text-gray-400">記録がありません。</p>'}
    </div>
  `
}

// Build a widget-enabled tab panel with its own widget scope (pid:tabId)
function buildWidgetTab(panel: HTMLElement, pid: string, scope: string, defaults: string[]): void {
  panel.innerHTML = `
    <div class="space-y-3">
      <div class="flex items-center">
        <button id="wgEditToggle" class="ml-auto text-xs rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-2 py-1 text-gray-200">編集</button>
      </div>
      <div class="grid gap-7 md:gap-8 grid-cols-1 md:grid-cols-12" id="widgetGrid" data-pid="${pid}:${scope}" style="grid-auto-rows: 7rem;">
        ${addWidgetCard()}
      </div>
    </div>
  `
  // enable widget editing for this panel only
  enableDragAndDrop(panel)
  const scoped = `${pid}:${scope}`
  // seed defaults when there's no saved meta
  const meta = getWidgetMeta(scoped)
  if (Object.keys(meta).length === 0 && defaults.length) {
    defaults.forEach((t) => addWidget(panel, scoped, t))
  } else {
    applyWidgetSizes(panel, scoped)
    ensureWidgets(panel, scoped)
  }
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
        <section class="space-y-3" id="tab-summary" data-tab="summary">
          <div class="flex items-center">
            <button id="wgEditToggle" class="ml-auto text-xs rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-2 py-1 text-gray-200">編集</button>
          </div>
          <div class="grid gap-7 md:gap-8 grid-cols-1 md:grid-cols-12" id="widgetGrid" data-pid="${ctx.id}" style="grid-auto-rows: 7rem;">
            ${widgetShell('contrib', 'Contributions', contributionWidget())}
            ${widgetShell('overview', 'Overview', overviewSkeleton())}
            ${widgetShell('committers', 'Top Committers', barSkeleton())}
            ${widgetShell('readme', 'README', readmeSkeleton())}
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

// ---- Core tabs (summary/board) rename + delete with persistence ----
type CoreTabs = { summary: { title: string; visible: boolean }; board: { title: string; visible: boolean } }
function coreKey(pid: string): string { return `tabs-core-${pid}` }
function getCoreTabs(pid: string): CoreTabs {
  try {
    const raw = localStorage.getItem(coreKey(pid))
    if (raw) return JSON.parse(raw) as CoreTabs
  } catch {}
  return { summary: { title: '概要', visible: true }, board: { title: 'カンバンボード', visible: true } }
}
function saveCoreTabs(pid: string, v: CoreTabs): void { localStorage.setItem(coreKey(pid), JSON.stringify(v)) }

function applyCoreTabs(root: HTMLElement, pid: string): void {
  const bar = root.querySelector('#tabBar') as HTMLElement | null
  if (!bar) return
  const core = getCoreTabs(pid)
  const ensureWrap = (btn: HTMLElement, key: 'summary'|'board') => {
    let wrap = btn.parentElement as HTMLElement
    if (!wrap || wrap.tagName.toLowerCase() !== 'span') {
      const span = document.createElement('span')
      span.className = 'group relative inline-flex'
      btn.replaceWith(span)
      span.appendChild(btn)
      wrap = span
    }
    // Make core tabs draggable like custom tabs
    wrap.setAttribute('draggable', 'true')
    // context menu for rename/delete
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      openTabContextMenu(root, pid, { kind: 'core', id: key, btn })
    })
    // Double-click rename disabled (use context menu instead)
  }

  const sumBtn = bar.querySelector('[data-tab="summary"]') as HTMLElement | null
  const brdBtn = bar.querySelector('[data-tab="board"]') as HTMLElement | null
  if (sumBtn) {
    sumBtn.textContent = core.summary.title
    sumBtn.classList.toggle('hidden', !core.summary.visible)
    ensureWrap(sumBtn, 'summary')
  }
  if (brdBtn) {
    brdBtn.textContent = core.board.title
    brdBtn.classList.toggle('hidden', !core.board.visible)
    ensureWrap(brdBtn, 'board')
  }
  // hide sections if invisible
  const sumSec = root.querySelector('[data-tab="summary"]') as HTMLElement | null
  const brdSec = root.querySelector('[data-tab="board"]') as HTMLElement | null
  if (sumSec) sumSec.classList.toggle('hidden', !core.summary.visible)
  if (brdSec) brdSec.classList.toggle('hidden', !core.board.visible)
  // Ensure at least one visible
  const visibleCount = Array.from(bar.querySelectorAll('.tab-btn')).filter(b => (b as HTMLElement).getAttribute('data-tab') !== 'new' && !(b as HTMLElement).classList.contains('hidden')).length
  if (visibleCount === 0) {
    core.summary.visible = true
    saveCoreTabs(pid, core)
    if (sumBtn) sumBtn.classList.remove('hidden')
    if (sumSec) sumSec.classList.remove('hidden')
  }
  // persist overall order of tabs (core + custom)
  const ids = Array.from(bar.querySelectorAll('.tab-btn')).map(b => (b as HTMLElement).getAttribute('data-tab') || '').filter(id => id && id !== 'new')
  localStorage.setItem(`tabs-order-${pid}`, JSON.stringify(ids))
}

// Context menu for tabs (rename/delete)
function openTabContextMenu(root: HTMLElement, pid: string, arg: { kind: 'core'|'custom'; id: string; btn: HTMLElement; type?: TabTemplate }): void {
  const { kind, id, btn } = arg
  // Close any open rename popover
  document.getElementById('tabRenamePop')?.remove()
  // Close any existing tab context menu before opening a new one
  document.getElementById('tabCtxMenu')?.remove()
  const rect = btn.getBoundingClientRect()
  const menu = document.createElement('div')
  menu.id = 'tabCtxMenu'
  menu.className = 'fixed z-[80] w-36 rounded-md bg-neutral-900 ring-1 ring-neutral-700/70 shadow-xl text-sm text-gray-200'
  menu.style.top = `${rect.bottom + 6}px`
  menu.style.left = `${rect.left}px`
  menu.innerHTML = `
    <button data-act="rename" class="w-full text-left px-3 py-2 hover:bg-neutral-800">名前を変更</button>
    <button data-act="delete" class="w-full text-left px-3 py-2 hover:bg-neutral-800 text-rose-400">削除</button>
  `
  const close = () => menu.remove()
  const onDoc = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) { close(); document.removeEventListener('click', onDoc) }
  }
  setTimeout(() => document.addEventListener('click', onDoc), 0)
  document.body.appendChild(menu)
  const bar = root.querySelector('#tabBar') as HTMLElement
  const minCheck = (): boolean => {
    const count = Array.from(bar.querySelectorAll('.tab-btn')).filter(b => (b as HTMLElement).getAttribute('data-tab') !== 'new' && !(b as HTMLElement).classList.contains('hidden')).length
    if (count <= 1) { alert('少なくとも1つのタブは必要です。'); return false }
    return true
  }
  menu.querySelector('[data-act="rename"]')?.addEventListener('click', () => {
    // Inline rename popover (no prompt)
    close()
    const r = btn.getBoundingClientRect()
    const pop = document.createElement('div')
    document.getElementById('tabRenamePop')?.remove()
    pop.id = 'tabRenamePop'
    pop.className = 'fixed z-[81] w-[min(320px,92vw)] rounded-lg bg-neutral-900 ring-1 ring-neutral-700/70 shadow-xl p-2'
    pop.style.top = `${r.bottom + 8}px`
    pop.style.left = `${Math.max(12, Math.min(window.innerWidth - 340, r.left))}px`
    const currentTitle = kind === 'core' ? (getCoreTabs(pid)[id as 'summary'|'board']?.title || '') : (btn.textContent || '')
    const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    pop.innerHTML = `
      <div class="flex items-center gap-2">
        <input id="tr-name" type="text" class="flex-1 min-w-0 rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-2 py-1.5 text-gray-100" value="${esc(currentTitle)}" />
        <button id="tr-save" class="rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 whitespace-nowrap shrink-0">保存</button>
        <button id="tr-cancel" class="rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 text-gray-200 text-xs px-3 py-1.5 whitespace-nowrap shrink-0">取消</button>
      </div>
    `
    const remove = () => pop.remove()
    const onDoc = (e: MouseEvent) => {
      if (!pop.contains(e.target as Node)) { remove(); document.removeEventListener('click', onDoc) }
    }
    setTimeout(() => document.addEventListener('click', onDoc), 0)
    document.body.appendChild(pop)
    const input = pop.querySelector('#tr-name') as HTMLInputElement | null
    input?.focus(); input?.select()
    const doSave = () => {
      const val = (input?.value || '').trim()
      if (!val) { remove(); return }
      if (kind === 'core') {
        const k = id as 'summary'|'board'
        const c = getCoreTabs(pid)
        c[k].title = val
        saveCoreTabs(pid, c)
        applyCoreTabs(root, pid)
      } else {
        btn.textContent = val
        const saved = JSON.parse(localStorage.getItem(`tabs-${pid}`) || '[]') as Array<{ id: string; type: TabTemplate; title?: string }>
        const idx = saved.findIndex((t) => t.id === id)
        if (idx >= 0) saved[idx].title = val
        localStorage.setItem(`tabs-${pid}`, JSON.stringify(saved))
      }
      remove()
    }
    pop.querySelector('#tr-save')?.addEventListener('click', doSave)
    pop.querySelector('#tr-cancel')?.addEventListener('click', remove)
    input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSave(); if (e.key === 'Escape') remove() })
  })
  menu.querySelector('[data-act="delete"]')?.addEventListener('click', () => {
    if (!minCheck()) { close(); return }
    if (kind === 'core') {
      const c = getCoreTabs(pid)
      const k = id as 'summary'|'board'
      c[k].visible = false
      saveCoreTabs(pid, c)
      applyCoreTabs(root, pid)
    } else {
      // remove panel and tab
      const panel = root.querySelector(`section[data-tab="${id}"]`)
      panel?.parentElement?.removeChild(panel as Element)
      const wrap = btn.parentElement as HTMLElement | null
      wrap?.remove()
      const saved = JSON.parse(localStorage.getItem(`tabs-${pid}`) || '[]') as Array<{ id: string; type: TabTemplate; title?: string }>
      const next = saved.filter((t) => t.id !== id)
      localStorage.setItem(`tabs-${pid}`, JSON.stringify(next))
    }
    // activate another visible tab
    const nextBtn = bar.querySelector('.tab-btn:not(.hidden):not([data-tab="new"])') as HTMLElement | null
    nextBtn?.click()
    // persist order after deletion
    const ids = Array.from(bar.querySelectorAll('.tab-btn')).map(b => (b as HTMLElement).getAttribute('data-tab') || '').filter(x => x && x !== 'new')
    localStorage.setItem(`tabs-order-${pid}`, JSON.stringify(ids))
    close()
  })
}
// Create and append a custom tab (blank/kanban/mock). Persist to localStorage.
function addCustomTab(root: HTMLElement, pid: string, type: TabTemplate, persist = true, preId?: string, preTitle?: string): void {
  const id = preId || `custom-${Date.now()}`
  const tabBar = root.querySelector('#tabBar') as HTMLElement
  const newBtn = tabBar.querySelector('[data-tab="new"]') as HTMLElement
  // wrapper to host delete button
  const wrap = document.createElement('span')
  wrap.className = 'group relative inline-flex'
  const btn = document.createElement('button')
  // Use symmetric spacing to keep label centered under the active underline
  btn.className = 'tab-btn text-gray-400 hover:text-gray-200'
  btn.setAttribute('data-tab', id)
  btn.textContent = preTitle || tabTitle(type)
  wrap.appendChild(btn)
  tabBar.insertBefore(wrap, newBtn)
  wrap.setAttribute('draggable', 'true')

  const panel = document.createElement('section')
  panel.className = 'mt-8 hidden'
  panel.setAttribute('data-tab', id)
  if (type === 'kanban') {
    const boardId = `kb-board-${id}`
    panel.innerHTML = kanbanShell(boardId)
    root.querySelector('main')?.appendChild(panel)
    renderKanban(root, pid, boardId)
  } else if (type === 'blank') {
    buildWidgetTab(panel, pid, id, [])
    root.querySelector('main')?.appendChild(panel)
  } else if (type === 'notes') {
    buildWidgetTab(panel, pid, id, ['markdown'])
    root.querySelector('main')?.appendChild(panel)
  } else if (type === 'docs') {
    buildWidgetTab(panel, pid, id, ['markdown','links'])
    root.querySelector('main')?.appendChild(panel)
  } else if (type === 'report') {
    buildWidgetTab(panel, pid, id, ['tasksum'])
    root.querySelector('main')?.appendChild(panel)
  } else if (type === 'roadmap') {
    buildWidgetTab(panel, pid, id, ['milestones'])
    root.querySelector('main')?.appendChild(panel)
  } else if (type === 'burndown') {
    buildWidgetTab(panel, pid, id, [])
    root.querySelector('main')?.appendChild(panel)
  } else if (type === 'timeline') {
    buildWidgetTab(panel, pid, id, [])
    root.querySelector('main')?.appendChild(panel)
  } else {
    panel.innerHTML = `<div class=\"rounded-xl ring-1 ring-neutral-800/70 bg-neutral-900/50 p-8 text-gray-300\">${tabTitle(type)}（プレースホルダー）</div>`
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

  // Double-click rename disabled (use context menu instead)

  // context menu
  btn.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    openTabContextMenu(root, pid, { kind: 'custom', id, btn, type })
  })

  if (persist) {
    const saved = JSON.parse(localStorage.getItem(`tabs-${pid}`) || '[]') as Array<{ id: string; type: TabTemplate; title?: string }>
    saved.push({ id, type, title: btn.textContent || tabTitle(type) })
    localStorage.setItem(`tabs-${pid}`, JSON.stringify(saved))
  }
  btn.click()
}

function loadCustomTabs(root: HTMLElement, pid: string): void {
  const saved = JSON.parse(localStorage.getItem(`tabs-${pid}`) || '[]') as Array<{ id: string; type: TabTemplate; title?: string }>
  saved.forEach((t) => addCustomTab(root, pid, t.type, false, t.id, t.title))
}

// Enable drag & drop reordering of custom tabs in the tab bar
function enableTabDnD(root: HTMLElement, pid: string): void {
  const bar = root.querySelector('#tabBar') as HTMLElement | null
  if (!bar) return
  let dragEl: HTMLElement | null = null

  const isDraggableWrap = (el: HTMLElement | null): el is HTMLElement => {
    if (!el) return false
    const btn = el.querySelector('.tab-btn') as HTMLElement | null
    const id = btn?.getAttribute('data-tab') || ''
    return id !== 'new'
  }
  const persistOrder = () => {
    // Save custom tabs order
    const saved = JSON.parse(localStorage.getItem(`tabs-${pid}`) || '[]') as Array<{ id: string; type: TabTemplate; title?: string }>
    const map = new Map(saved.map((t) => [t.id, t]))
    const order: Array<{ id: string; type: TabTemplate; title?: string }> = []
    const ids: string[] = []
    bar.querySelectorAll('.tab-btn').forEach((b) => {
      const id = (b as HTMLElement).getAttribute('data-tab') || ''
      if (id === 'new') return
      ids.push(id)
      if (id.startsWith('custom-')) {
        const item = map.get(id) || { id, type: 'blank' as TabTemplate, title: (b as HTMLElement).textContent || undefined }
        order.push(item)
      }
    })
    localStorage.setItem(`tabs-${pid}`, JSON.stringify(order))
    localStorage.setItem(`tabs-order-${pid}`, JSON.stringify(ids))
  }

  bar.addEventListener('dragstart', (e) => {
    const wrap = (e.target as HTMLElement).closest('span') as HTMLElement | null
    if (!isDraggableWrap(wrap)) { (e as DragEvent).preventDefault(); return }
    dragEl = wrap
    // visual cue while dragging
    dragEl.classList.add('opacity-60')
  })
  bar.addEventListener('dragover', (e) => {
    if (!dragEl) return
    e.preventDefault()
    const t = (e.target as HTMLElement).closest('span') as HTMLElement | null
    if (!t || !bar.contains(t) || !isDraggableWrap(t) || t === dragEl) return
    const rect = t.getBoundingClientRect()
    const before = (e as DragEvent).clientX < rect.left + rect.width / 2
    if (before) bar.insertBefore(dragEl, t)
    else bar.insertBefore(dragEl, t.nextSibling)
  })
  bar.addEventListener('drop', () => {
    if (!dragEl) return
    dragEl.classList.remove('opacity-60')
    dragEl = null
    persistOrder()
  })
  bar.addEventListener('dragend', () => {
    if (!dragEl) return
    dragEl.classList.remove('opacity-60')
    dragEl = null
    persistOrder()
  })
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

async function renderKanban(root: HTMLElement, pid: string, targetId = 'kb-board'): Promise<void> {
  const board = root.querySelector(`#${targetId}`) as HTMLElement | null
  if (!board) return
  // Load tasks: if linked to GitHub, merge issues into tasks
  const state = loadTasks(pid)
  const repoFull = (root as HTMLElement).getAttribute('data-repo-full') || ''
  let ghTasks: any[] = []
  if (repoFull) {
    try {
      const issues = await apiFetch<any[]>(`/projects/${pid}/issues?state=all`)
      ghTasks = (issues || []).map((it) => {
        const labels: string[] = it.labels || []
        const lane = labels.find((l) => l.startsWith('kanban:'))?.split(':')[1] || (it.state === 'closed' ? 'done' : 'todo')
        return {
          id: `gh-${it.number}`,
          title: it.title,
          description: '',
          status: (lane === 'todo' || lane === 'doing' || lane === 'review' || lane === 'done') ? lane : (it.state === 'closed' ? 'done' : 'todo'),
          priority: '中',
          assignee: (it.assignees && it.assignees[0]) ? it.assignees[0] : '',
          _gh: { number: it.number, url: it.html_url }
        }
      })
    } catch {}
  }
  const merged = [...ghTasks, ...state.filter(t => !String(t.id).startsWith('gh-'))]
  board.innerHTML = ['todo', 'doing', 'review', 'done']
    .map((st) => columnHtml(st as Status, merged.filter((t) => t.status === st)))
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
    col.addEventListener('drop', async () => {
      if (!dragging) return
      const id = dragging.getAttribute('data-task') as string
      const target = (col as HTMLElement).getAttribute('data-col') as Status
      if (id.startsWith('gh-')) {
        // Update GitHub
        const num = id.replace('gh-','')
        try {
          await apiFetch(`/projects/${pid}/issues/${num}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: target }) })
          if (target === 'done') {
            const login = dragging.getAttribute('data-assignee') || ''
            if (login) {
              await apiFetch(`/projects/${pid}/issues/assign-next`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login }) })
            }
          }
        } catch {}
      } else {
        const tasks = loadTasks(pid)
        const idx = tasks.findIndex((t) => t.id === id)
        if (idx >= 0) tasks[idx].status = target
        saveTasks(pid, tasks)
      }
      renderKanban(root, pid, targetId)
    })
  })

  // Open in GitHub link handler
  board.querySelectorAll('[data-open-gh]')?.forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault()
      const num = (a as HTMLElement).getAttribute('data-open-gh') || ''
      const repo = (root as HTMLElement).getAttribute('data-repo-full') || ''
      if (num && repo) window.open(`https://github.com/${repo}/issues/${num}`, '_blank')
    })
  })

  // Add task global button (unique per board)
  const addBtn = document.getElementById(`kb-add-${targetId}`)
  addBtn?.addEventListener('click', () => openNewTaskModal(root, pid, 'todo', targetId))

  // Add task per column
  board.querySelectorAll('[data-add]')?.forEach((btn) => {
    btn.addEventListener('click', () => {
      const st = (btn as HTMLElement).getAttribute('data-add') as Status
      openNewTaskModal(root, pid, st, targetId)
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
        <div class="text-xs text-gray-400">${String(t.id).startsWith('gh-') ? '<span class=\\"text-white\\"></span> #'+String(t.id).slice(3) : '#'+t.id}</div>
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
      ${String(t.id).startsWith('gh-') ? `<div class=\"mt-2 text-right\"><a href=\"#\" data-open-gh=\"${String(t.id).slice(3)}\" class=\"text-xs text-sky-400 hover:underline\">GitHubで開く</a></div>` : ''}
    </div>
  `
}

// New Task modal (rich form)
function openNewTaskModal(root: HTMLElement, pid: string, status: Status, targetId?: string): void {
  const old = document.getElementById('newTaskOverlay')
  if (old) old.remove()
  const overlay = document.createElement('div')
  overlay.id = 'newTaskOverlay'
  overlay.className = 'fixed inset-0 z-[82] bg-black/60 grid place-items-center fade-overlay'
  overlay.innerHTML = `
    <div class="relative w-[min(980px,95vw)] h-[86vh] overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-neutral-700/70 text-gray-100 pop-modal">
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
    close(); renderKanban(root, pid, targetId || 'kb-board')
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
