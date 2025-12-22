import { apiFetch, ApiError } from '../../utils/api'
import { openTaskModal, openTaskModalGh } from './task-modal'
import { renderNotFound } from '../not-found/not-found'
import { getTheme, setTheme } from '../../utils/theme'
import { hideRouteLoading } from '../../utils/route-loading'
import { consumePrefetchedProject } from '../../utils/prefetch'
// (no component-level imports; keep in-page implementations)
// Account modal helpers (duplicated to open over current page)
type SkillGroup = 'owned' | 'want'
const ALL_SKILLS = ['JavaScript', 'TypeScript', 'Python', 'Ruby', 'Go', 'Rust', 'Java', 'Kotlin', 'Swift', 'Dart', 'PHP', 'C', 'C++', 'C#', 'Scala', 'Elixir', 'Haskell', 'R', 'Julia', 'SQL', 'HTML', 'CSS', 'Sass', 'Tailwind', 'React', 'Vue', 'Svelte', 'Next.js', 'Nuxt', 'Node.js', 'Deno', 'Bun', 'Express', 'Rails', 'Laravel', 'Spring', 'Django', 'FastAPI', 'Flutter', 'React Native', 'iOS', 'Android', 'Unity', 'Unreal', 'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Git', 'GitHub Actions', 'Figma', 'Storybook', 'Jest', 'Playwright', 'Vitest', 'Grafana', 'Prometheus']
const SKILL_ICON: Record<string, string> = {
  JavaScript: '🟨', TypeScript: '🟦', Python: '🐍', Ruby: '💎', Go: '🌀', Rust: '🦀', Java: '☕', Kotlin: '🟪', Swift: '🟧', Dart: '🎯', PHP: '🐘', 'C#': '🎼', 'C++': '➕', C: '🧩', Scala: '📈', Elixir: '🧪', Haskell: 'λ', R: '📊', Julia: '💠', SQL: '🗄️', HTML: '📄', CSS: '🎨', Sass: '🧵', Tailwind: '🌬️', React: '⚛️', Vue: '🟩', Svelte: '🟠', 'Next.js': '⏭️', Nuxt: '🟢', 'Node.js': '🟢', Deno: '🦕', Bun: '🥯', Express: '🚂', Rails: '🛤️', Laravel: '🟥', Spring: '🌱', Django: '🟩', FastAPI: '⚡', Flutter: '💙', 'React Native': '📱', iOS: '📱', Android: '🤖', Unity: '🎮', Unreal: '🧰', AWS: '☁️', GCP: '☁️', Azure: '☁️', Docker: '🐳', Kubernetes: '☸️', Terraform: '🧱', Ansible: '📦', Git: '🔧', 'GitHub Actions': '🛠️', Figma: '🎨', Storybook: '📚', Jest: '🧪', Playwright: '🎭', Vitest: '🧪', Grafana: '📊', Prometheus: '🔥'
}
function slugSkill(name: string): string { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
function skillIcon(name: string): string {
  const slug = slugSkill(name)
  return `<img src="/icons/${slug}.svg" alt="${name}" class="w-4 h-4 mr-1 inline-block align-[-2px]" onerror="this.style.display='none'" />`
}
// Inline SVGs for lock icons (sourced from src/public, fill adapted to currentColor)
const LOCK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z"/></svg>'
const LOCK_OPEN_RIGHT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d="M240-160h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM240-160v-400 400Zm0 80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h280v-80q0-83 58.5-141.5T720-920q83 0 141.5 58.5T920-720h-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80h120q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Z"/></svg>'
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

function themeOption(id: 'dark' | 'warm' | 'sakura', title: string, desc: string, scopeClass: string): string {
  return `
  <button type=\"button\" data-theme=\"${id}\" class=\"theme-option relative text-left rounded-lg ring-2 ring-neutral-600 bg-neutral-900/40 hover:ring-emerald-600 transition-colors\">\n    <div class=\"absolute right-2 top-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-700 text-white opacity-0\" data-check>選択中</div>\n    <div class=\"p-3 ${scopeClass}\" ${scopeClass === 'th-sakura' ? 'data-demo' : ''}>\n      <div class=\"h-5 rounded bg-neutral-900/80 ring-2 ring-neutral-600\"></div>\n      <div class=\"mt-2 flex gap-2\">\n        <div class=\"w-8 rounded bg-neutral-900/50 ring-2 ring-neutral-600 h-20\"></div>\n        <div class=\"flex-1 space-y-2\">\n          <div class=\"gh-card p-2\"><div class=\"h-3 w-1/3 rounded bg-blue-400/30\"></div><div class=\"mt-2 h-2 w-2/3 rounded bg-gray-400/30\"></div></div>\n          <div class=\"gh-card p-2\"><div class=\"h-3 w-1/4 rounded bg-emerald-400/30\"></div><div class=\"mt-2 h-2 w-1/2 rounded bg-gray-400/30\"></div></div>\n        </div>\n      </div>\n    </div>\n    <div class=\"mt-3 px-3 pb-3\">\n      <div class=\"text-[15px] font-medium text-gray-100\">${title}</div>\n      <div class=\"text-[12px] text-gray-400\">${desc}</div>\n    </div>\n  </button>`
}
function openAccountModal(root: HTMLElement): void {
  const me = (root as any)._me as { name?: string; email?: string; github_id?: number } | undefined
  const avatarUrl = me?.github_id ? `https://avatars.githubusercontent.com/u/${me.github_id}?s=128` : ''
  const overlay = document.createElement('div')
  overlay.id = 'accountOverlay'
  overlay.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] grid place-items-center'
  overlay.innerHTML = `
    <div class="relative w-[min(960px,92vw)] overflow-hidden rounded-xl bg-neutral-800 ring-2 ring-neutral-600 shadow-2xl text-gray-100 pop-modal modal-fixed">
      <div class="flex items-center h-12 px-5 border-b border-neutral-600">
        <h3 class="text-lg font-semibold">マイページ</h3>
        <button id="accountClose" class="ml-auto text-2xl text-neutral-300 hover:text-white">×</button>
      </div>
      <div class="flex h-[calc(86vh-3rem)]">
        <aside class="w-48 shrink-0 p-4 border-r border-neutral-600 space-y-2">
          <button data-tab="basic" class="tab-btn w-full text-left px-3 py-2 rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 text-gray-100">
            <span>基本情報</span>
          </button>
          <button data-tab="notify" class="tab-btn w-full text-left px-3 py-2 rounded-md hover:bg-neutral-800/40 ring-2 ring-transparent text-gray-100">
            <span>通知設定</span>
          </button>
          <button data-tab="theme" class="tab-btn w-full text-left px-3 py-2 rounded-md hover:bg-neutral-800/40 ring-2 ring-transparent text-gray-100">
            <span>着せ替え</span>
          </button>
        </aside>
        <section class="flex-1 p-6 space-y-6 overflow-y-auto">
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
                <button id="ntf-toggle" type="button" class="toggle bg-emerald-600 relative inline-flex h-6 w-10 items-center rounded-full transition-colors">
                  <span class="knob inline-block h-5 w-5 transform rounded-full bg-white transition-transform translate-x-5"></span>
                </button>
              </div>
              <div class="mt-2 flex items-center gap-4 text-gray-200">
                <input id="ntf-start" type="time" value="06:30" class="w-32 rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-1.5 text-gray-100" />
                <span class="text-gray-400">〜</span>
              <input id="ntf-end" type="time" value="20:30" class="w-32 rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-1.5 text-gray-100" />
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
        b.classList.toggle('ring-2', active)
        b.classList.toggle('ring-neutral-600', active)
      })
    })
  })
  // Theme option interactions
  const initTheme = getTheme()
  const mark = (cur: 'dark' | 'warm') => {
    overlay.querySelectorAll('.theme-option')?.forEach((opt) => {
      const id = (opt as HTMLElement).getAttribute('data-theme')
      const sel = id === cur
      opt.classList.toggle('ring-emerald-600', sel)
      opt.classList.toggle('ring-neutral-600', !sel)
      const badge = opt.querySelector('[data-check]') as HTMLElement | null
      if (badge) badge.classList.toggle('opacity-100', sel)
      if (badge) badge.classList.toggle('opacity-0', !sel)
    })
  }
  try { mark(initTheme) } catch {}
  overlay.querySelectorAll('.theme-option')?.forEach((el) => {
    el.addEventListener('click', () => {
      const id = (el as HTMLElement).getAttribute('data-theme') as 'dark' | 'warm'
      setTheme(id)
      mark(id)
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
  document.body.appendChild(overlay); (function () { const c = +(document.body.getAttribute('data-lock') || '0'); if (c === 0) { document.body.style.overflow = 'hidden' } document.body.setAttribute('data-lock', String(c + 1)) })()
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

// ---- Open projects top tabs (browser-like) ----
type OpenProjTab = { id: number; title: string; fullName?: string }
function projTabsKey(): string { return 'open-project-tabs' }
function getOpenProjTabs(): OpenProjTab[] {
  try { return JSON.parse(localStorage.getItem(projTabsKey()) || '[]') as OpenProjTab[] } catch { return [] }
}
function saveOpenProjTabs(list: OpenProjTab[]): void {
  localStorage.setItem(projTabsKey(), JSON.stringify(list.slice(0, 20)))
}
function removeOpenProjTab(id: number): OpenProjTab[] {
  const list = getOpenProjTabs()
  const next = list.filter((t) => t.id !== id)
  saveOpenProjTabs(next)
  return next
}

// Lightweight in-app navigation stack for project tabs (session-scoped)
type ProjNav = { stack: number[]; cursor: number }
function projNavKey(): string { return 'proj-nav' }
function getProjNav(): ProjNav {
  try { return JSON.parse(sessionStorage.getItem(projNavKey()) || '{"stack":[],"cursor":-1}') as ProjNav } catch { return { stack: [], cursor: -1 } }
}
function saveProjNav(n: ProjNav): void { sessionStorage.setItem(projNavKey(), JSON.stringify(n)) }
function navVisit(pid: number): void {
  const nav = getProjNav()
  // drop forward entries if any
  if (nav.cursor >= 0 && nav.cursor < nav.stack.length - 1) nav.stack = nav.stack.slice(0, nav.cursor + 1)
  if (nav.stack[nav.cursor] !== pid) { nav.stack.push(pid); nav.cursor = nav.stack.length - 1 }
  saveProjNav(nav)
}
function navCanBack(): boolean { const nav = getProjNav(); return nav.cursor > 0 }
function navCanFwd(): boolean { const nav = getProjNav(); return nav.cursor >= 0 && nav.cursor < nav.stack.length - 1 }
function navStepBack(): number | null { const nav = getProjNav(); if (nav.cursor > 0) { nav.cursor -= 1; saveProjNav(nav); return nav.stack[nav.cursor] } return null }
function navStepFwd(): number | null { const nav = getProjNav(); if (nav.cursor < nav.stack.length - 1) { nav.cursor += 1; saveProjNav(nav); return nav.stack[nav.cursor] } return null }
// nav mode to suppress visit on back/forward
function setNavMode(mode: 'back' | 'forward' | 'push' | ''): void { sessionStorage.setItem('proj-nav-mode', mode) }
function consumeNavMode(): 'back' | 'forward' | 'push' | '' { const m = (sessionStorage.getItem('proj-nav-mode') as any) || ''; sessionStorage.removeItem('proj-nav-mode'); return m }
function ensureProjectOpenTab(p: OpenProjTab): void {
  const list = getOpenProjTabs()
  const i = list.findIndex((x) => x.id === p.id)
  if (i >= 0) {
    // update title/fullName if changed
    const cur = list[i]
    if (p.title && p.title !== cur.title) cur.title = p.title
    if (p.fullName && p.fullName !== cur.fullName) cur.fullName = p.fullName
    saveOpenProjTabs(list)
  } else {
    list.push({ id: p.id, title: p.title || `#${p.id}`, fullName: p.fullName })
    saveOpenProjTabs(list)
  }
}
function renderProjectTabsBar(root: HTMLElement, activeId: number): void {
  const host = root.querySelector('#projTabsBar .tabs-wrap') as HTMLElement | null
  if (!host) return
  const list = getOpenProjTabs()
  const html = list.map((t) => {
    const active = t.id === activeId
    const title = t.title
    const base = 'tab-proj h-10 pl-4 pr-2 text-sm whitespace-nowrap flex items-center gap-2 border-l border-r gh-border'
    const cls = active
      ? `${base} text-gray-100`
      : `${base} bg-neutral-700/70 text-gray-200 hover:text-gray-100`
    const style = active ? 'style="background-color: var(--gh-canvas);"' : ''
    return `<button class="${cls}" ${style} data-pid="${t.id}" role="tab" aria-selected="${active ? 'true' : 'false'}" draggable="true">
      <span class="tab-title truncate">${title}</span>
      <span class="tab-close ml-1 text-gray-400 hover:text-gray-200 px-1" title="閉じる">×</span>
    </button>`
  }).join('')
  const backCls = navCanBack() ? 'text-gray-100 hover:text-white' : 'text-gray-500'
  const fwdCls = navCanFwd() ? 'text-gray-100 hover:text-white' : 'text-gray-500'
  const navHtml = `<span class=\"nav-ctrl self-stretch flex items-center gap-1 pl-0.5 pr-1.5\">\n    <button id=\"navBack\" class=\"inline-flex items-center justify-center w-7 h-7 leading-none ${backCls}\" title=\"戻る\">＜</button>\n    <button id=\"navFwd\" class=\"inline-flex items-center justify-center w-7 h-7 leading-none ${fwdCls}\" title=\"進む\">＞</button>\n  </span>`
  const addHtml = `<button id=\"projTabAddInBar\" class=\"tab-add h-10 px-2 text-xl text-gray-400 hover:text-gray-100 border-l gh-border\" title=\"プロジェクトを開く/追加\">＋</button>`
  host.innerHTML = navHtml + html + addHtml
  // Delegated clicks
  // Rebind delegated handler (avoid stacking)
  const prev = (host as any)._tabsHandler as ((e: Event) => void) | undefined
  if (prev) host.removeEventListener('click', prev)
  const handler = (e: Event) => {
    const close = (e.target as HTMLElement).closest('.tab-close') as HTMLElement | null
    const tab = (e.target as HTMLElement).closest('.tab-proj') as HTMLElement | null
    if (!tab) return
    const pidStr = tab.getAttribute('data-pid') || ''
    if (!pidStr) return
    const pid = Number(pidStr)
    if (close) {
      // close tab
      const list = getOpenProjTabs()
      const idx = list.findIndex((t) => t.id === pid)
      const nextList = removeOpenProjTab(pid)
      if (pid === activeId) {
        // decide where to go
        const cand = nextList[idx] || nextList[idx - 1]
        if (cand) { try { navVisit(cand.id) } catch { }; window.location.hash = `#/project/detail?id=${encodeURIComponent(String(cand.id))}` }
        else window.location.hash = '#/project'
        return
      }
      // re-render bar keeping current active
      renderProjectTabsBar(root, activeId)
      return
    }
    // navigate to tab
    if (pid !== activeId) {
      try { navVisit(pid) } catch { }
      window.location.hash = `#/project/detail?id=${encodeURIComponent(String(pid))}`
    }
  }
  host.addEventListener('click', handler)
    ; (host as any)._tabsHandler = handler

  // Drag & drop reorder for project tabs
  // Remove old handlers if exist
  const prevStart = (host as any)._tabsDnDStart as ((e: DragEvent) => void) | undefined
  const prevOver = (host as any)._tabsDnDOver as ((e: DragEvent) => void) | undefined
  const prevDrop = (host as any)._tabsDnDDrop as ((e: DragEvent) => void) | undefined
  const prevEnd = (host as any)._tabsDnDEnd as ((e: DragEvent) => void) | undefined
  if (prevStart) host.removeEventListener('dragstart', prevStart as any)
  if (prevOver) host.removeEventListener('dragover', prevOver as any)
  if (prevDrop) host.removeEventListener('drop', prevDrop as any)
  if (prevEnd) host.removeEventListener('dragend', prevEnd as any)

  let draggingEl: HTMLElement | null = null
  let dropMarkEl: HTMLElement | null = null
  let dropMarkSide: 'left' | 'right' | null = null
  const clearDropMark = () => {
    if (dropMarkEl) dropMarkEl.style.boxShadow = ''
    dropMarkEl = null
    dropMarkSide = null
  }
  const persistOrder = () => {
    // Build next order by DOM
    const order = Array.from(host.querySelectorAll('.tab-proj'))
      .map((el) => Number((el as HTMLElement).getAttribute('data-pid') || ''))
      .filter((n) => !isNaN(n))
    if (order.length === 0) return
    const cur = getOpenProjTabs()
    const map = new Map(cur.map((t) => [t.id, t]))
    const next: OpenProjTab[] = []
    order.forEach((id) => { const it = map.get(id); if (it) next.push(it) })
    // Append any missing (safety)
    cur.forEach((t) => { if (!next.find((x) => x.id === t.id)) next.push(t) })
    saveOpenProjTabs(next)
  }
  const onStart = (e: DragEvent) => {
    const target = (e.target as HTMLElement) || null
    const tab = target?.closest && target.closest('.tab-proj') as HTMLElement | null
    if (!tab) { e.preventDefault(); return }
    // Ignore when started from close button
    if ((e.target as HTMLElement).closest('.tab-close')) { e.preventDefault(); return }
    draggingEl = tab
    try { e.dataTransfer?.setData('text/plain', String(tab.getAttribute('data-pid') || '')); e.dataTransfer!.effectAllowed = 'move' } catch { }
    tab.classList.add('opacity-60')
    // Hide original element shortly after drag image snapshot is taken
    setTimeout(() => { if (draggingEl === tab) tab.style.display = 'none' }, 0)
  }
  const onOver = (e: DragEvent) => {
    if (!draggingEl) return
    e.preventDefault()
    const target = (e.target as HTMLElement)?.closest('.tab-proj') as HTMLElement | null
    if (!target || target === draggingEl) return
    const rect = target.getBoundingClientRect()
    const before = e.clientX < rect.left + rect.width / 2
    // Show blue indicator on insertion edge
    const side: 'left' | 'right' = before ? 'left' : 'right'
    if (dropMarkEl !== target || dropMarkSide !== side) {
      clearDropMark()
      const color = 'rgba(56,139,253,0.95)'
      target.style.boxShadow = side === 'left' ? `inset 2px 0 0 0 ${color}` : `inset -2px 0 0 0 ${color}`
      dropMarkEl = target
      dropMarkSide = side
    }
    if (before) host.insertBefore(draggingEl, target)
    else host.insertBefore(draggingEl, target.nextSibling)
  }
  const clearDrag = () => {
    if (draggingEl) {
      draggingEl.classList.remove('opacity-60')
      draggingEl.style.display = ''
    }
    clearDropMark()
    draggingEl = null
  }
  const onDrop = (_e: DragEvent) => { if (!draggingEl) return; clearDrag(); persistOrder() }
  const onEnd = (_e: DragEvent) => { if (!draggingEl) return; clearDrag(); persistOrder() }
  host.addEventListener('dragstart', onStart)
  host.addEventListener('dragover', onOver)
  host.addEventListener('drop', onDrop)
  host.addEventListener('dragend', onEnd)
    ; (host as any)._tabsDnDStart = onStart
    ; (host as any)._tabsDnDOver = onOver
    ; (host as any)._tabsDnDDrop = onDrop
    ; (host as any)._tabsDnDEnd = onEnd
  // plus button: inside bar (and hide legacy one outside)
  const addBtnLegacy = root.querySelector('#projTabAdd') as HTMLElement | null
  if (addBtnLegacy) (addBtnLegacy as HTMLElement).style.display = 'none'
  const addBtn = root.querySelector('#projTabAddInBar') as HTMLElement | null
  addBtn?.addEventListener('click', (e) => openProjectTabPicker(root, e.currentTarget as HTMLElement))
  // nav controls (use in-app stack)
  const backEl = root.querySelector('#navBack') as HTMLElement | null
  const fwdEl = root.querySelector('#navFwd') as HTMLElement | null
  const updateNavColors = () => {
    const be = root.querySelector('#navBack') as HTMLElement | null
    const fe = root.querySelector('#navFwd') as HTMLElement | null
    if (be) {
      be.classList.toggle('text-gray-100', navCanBack())
      be.classList.toggle('hover:text-white', navCanBack())
      be.classList.toggle('text-gray-500', !navCanBack())
    }
    if (fe) {
      fe.classList.toggle('text-gray-100', navCanFwd())
      fe.classList.toggle('hover:text-white', navCanFwd())
      fe.classList.toggle('text-gray-500', !navCanFwd())
    }
  }
  backEl?.addEventListener('click', (e) => {
    e.preventDefault()
    setNavMode('back')
    const id = navStepBack()
    if (id != null) window.location.hash = `#/project/detail?id=${encodeURIComponent(String(id))}`
    else updateNavColors()
  })
  fwdEl?.addEventListener('click', (e) => {
    e.preventDefault()
    setNavMode('forward')
    const id = navStepFwd()
    if (id != null) window.location.hash = `#/project/detail?id=${encodeURIComponent(String(id))}`
    else updateNavColors()
  })

  // Align tabbar padding with current rail width (persisted)
  try {
    const saved = parseInt(localStorage.getItem('pj-rail-width') || '0', 10)
    if (!isNaN(saved) && saved > 0) {
      host.style.paddingLeft = `${saved + 8}px`
      const leftPad = root.querySelector('#tabsLeftPad') as HTMLElement | null
      if (leftPad) leftPad.style.width = `${saved}px`
    }
  } catch { }
}

function openProjectTabPicker(root: HTMLElement, anchor: HTMLElement): void {
  // Close if already open
  document.getElementById('projTabPicker')?.remove()
  const rect = anchor.getBoundingClientRect()
  const pop = document.createElement('div')
  pop.id = 'projTabPicker'
  pop.className = 'fixed z-[85] w-[min(560px,96vw)] rounded-lg bg-neutral-900 ring-2 ring-neutral-600 shadow-2xl'
  pop.style.top = `${rect.bottom + 8}px`
  pop.style.right = '12px'
  pop.innerHTML = `
    <div class="p-3">
      <div class="text-sm text-gray-300 mb-2">プロジェクトを開く / 追加</div>
      <div class="flex gap-2">
        <input id="ptp-search" type="text" class="flex-1 rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-2 text-gray-100" placeholder="検索（名前）」 />
        <button id="ptp-new" class="rounded-md bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-2 text-sm">新規</button>
      </div>
      <div id="ptp-list" class="mt-3 max-h-72 overflow-auto divide-y divide-neutral-700 text-sm"></div>
    </div>
  `
  const close = (ev?: MouseEvent) => { if (ev && pop.contains(ev.target as Node)) return; pop.remove(); document.removeEventListener('click', close) }
  setTimeout(() => document.addEventListener('click', close), 0)
  document.body.appendChild(pop)
  const listEl = pop.querySelector('#ptp-list') as HTMLElement
  const load = async () => {
    try {
      const arr = await apiFetch<Array<{ id: number; name: string; github_meta?: { full_name?: string } | null }>>('/projects')
      const items = arr.map((p) => {
        const title = p.github_meta?.full_name || p.name || `#${p.id}`
        return `<button class=\"w-full text-left px-3 py-2 hover:bg-neutral-800/60\" data-id=\"${p.id}\">${title}</button>`
      }).join('')
      listEl.innerHTML = items || '<div class="px-3 py-2 text-gray-400">見つかりません</div>'
    } catch {
      listEl.innerHTML = '<div class="px-3 py-2 text-gray-400">読み込みに失敗しました</div>'
    }
  }
  load()
  // filter
  const input = pop.querySelector('#ptp-search') as HTMLInputElement | null
  input?.addEventListener('input', () => {
    const q = (input.value || '').toLowerCase()
    listEl.querySelectorAll('button[data-id]')?.forEach((b) => {
      const t = (b as HTMLElement).textContent || ''
        ; (b as HTMLElement).classList.toggle('hidden', !t.toLowerCase().includes(q))
    })
  })
  // open new
  pop.querySelector('#ptp-new')?.addEventListener('click', () => { window.location.hash = '#/project'; pop.remove() })
  // open selected
  listEl.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button[data-id]') as HTMLElement | null
    if (!b) return
    const id = b.getAttribute('data-id') || ''
    if (!id) return
    try { navVisit(Number(id)) } catch { }
    window.location.hash = `#/project/detail?id=${encodeURIComponent(id)}`
    pop.remove()
  })
}

function parseHashQuery(): Record<string, string> {
  const [, query = ''] = window.location.hash.split('?')
  const params = new URLSearchParams(query)
  const out: Record<string, string> = {}
  params.forEach((v, k) => (out[k] = v))
  return out
}

export async function renderProjectDetail(container: HTMLElement): Promise<void> {
  const { id } = parseHashQuery()
  // ID validation: ensure it's a numeric string
  if (!id || !/^\d+$/.test(id)) {
    renderNotFound(container)
    return
  }

  let project: Project | null = null
  let me: { id: number; name: string; github_id?: number } | null = null

  // Use prefetched data if available
  const pref = consumePrefetchedProject(Number(id))
  if (pref?.project) {
    project = pref.project as Project
    me = (pref.me as any) || null
  } else {
    try {
      project = await apiFetch<Project>(`/projects/${id}`)
      // Fetch user info concurrently, but don't fail the entire page if it fails
      try {
        me = await apiFetch<{ id: number; name: string; github_id?: number }>(`/me`)
      } catch {
        // ignore
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        renderNotFound(container)
      } else {
        renderDummyDetail(container, id)
      }
      return
    }
  }

  const fullName = project.github_meta?.full_name || project.link_repo || ''
  const owner = fullName.includes('/') ? fullName.split('/')[0] : me?.name || 'User'
  const repoName = fullName.includes('/') ? fullName.split('/')[1] : project.name

  // Render the full layout once with all available data
  container.innerHTML = detailLayout({ id: project.id, name: project.name, fullName, owner, repo: repoName })
  if (fullName) (container as HTMLElement).setAttribute('data-repo-full', fullName)

  // Store user data if fetched
  if (me) {
    (container as any)._me = me
  }

  // --- Start of post-render setup ---

  // Record visit unless this render was triggered by back/forward
  try { const mode = consumeNavMode(); if (mode !== 'back' && mode !== 'forward') navVisit(project.id) } catch { }
  // Ensure this project is in the top project-tabs and render the bar
  try { ensureProjectOpenTab({ id: project.id, title: project.name, fullName }) } catch { }
  try { renderProjectTabsBar(container, project.id) } catch { }

  setupTabs(container, String(project.id))
  applyCoreTabs(container, String(project.id))

  // DnD (Summary widgets)
  enableDragAndDrop(container)

  // Kanban board
  renderKanban(container, String(project.id))
  // After rendering base UI, refresh dynamic widgets (task summary, links, etc.)
  try { refreshDynamicWidgets(container, String(project.id)) } catch { }
  // Load saved custom tabs
  loadCustomTabs(container, String(project.id))
  // Apply saved tab order (core + custom)
  try { applySavedTabOrder(container, String(project.id)) } catch { }
  // Enable DnD for tabs
  try { enableTabDnD(container, String(project.id)) } catch { }
  // Enable tab drag & drop reordering for custom tabs
  try { enableTabDnD(container, String(project.id)) } catch { }

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
  } catch { }

  // Account settings link
  container.querySelector('#accountSettingsLink')?.addEventListener('click', () => openAccountModal(container))

  // Load collaborators avatars
  loadCollaborators(container, project.id)

  // Bind add collaborator popover
  const addBtn = container.querySelector('#addCollabLink') as HTMLElement | null
  addBtn?.addEventListener('click', () => openMemberInviteModal(container, String(project.id)))

  // Left rail collapse toggle (sticky rail remains fixed)
  const rail = container.querySelector('#leftRail') as HTMLElement | null
  const railToggle = container.querySelector('#railToggle') as HTMLButtonElement | null
  const railToggleTop = container.querySelector('#railToggleTop') as HTMLButtonElement | null
  const railKey = `pj-rail-collapsed`
  const railWKey = `pj-rail-width`
  const setToggleIcon = () => {
    const ensure = (btn: HTMLButtonElement | null) => {
      if (!btn) return
      const ic = btn.querySelector('.material-symbols-outlined') as HTMLElement | null
      if (ic) ic.textContent = 'view_sidebar'
      else btn.innerHTML = '<span class="material-symbols-outlined text-[20px] leading-none">view_sidebar</span>'
    }
    ensure(railToggle as HTMLButtonElement | null)
    ensure(railToggleTop)
  }
  const applyRail = (collapsed: boolean) => {
    if (!rail) return
    rail.classList.toggle('hidden', collapsed)
    setToggleIcon()
  }
  applyRail(localStorage.getItem(railKey) === '1')
  const onToggle = () => {
    const isCollapsed = rail?.classList.contains('hidden') || false
    const next = !isCollapsed
    applyRail(next)
    localStorage.setItem(railKey, next ? '1' : '0')
  }
  railToggle?.addEventListener('click', onToggle)
  railToggleTop?.addEventListener('click', onToggle)

  // Resize (drag) support for left rail with min/max and persistence
  const tabsLeftPad = container.querySelector('#tabsLeftPad') as HTMLElement | null
  const tabsWrap = container.querySelector('#projTabsBar .tabs-wrap') as HTMLElement | null
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
  const RAIL_MIN = 220, RAIL_MAX = 520
  const applyRailWidth = (px: number) => {
    if (!rail) return
    const w = clamp(Math.round(px), RAIL_MIN, RAIL_MAX)
    rail.style.width = `${w}px`
    if (tabsLeftPad) tabsLeftPad.style.width = `${w}px`
    if (tabsWrap) tabsWrap.style.paddingLeft = `${w + 8}px`
    try { localStorage.setItem(railWKey, String(w)) } catch { }
  }
  // initial width from storage
  try { const saved = parseInt(localStorage.getItem(railWKey) || '0', 10); if (!isNaN(saved) && saved > 0) applyRailWidth(saved) } catch { }
  const resizer = container.querySelector('#railResizer') as HTMLElement | null
  if (resizer && rail) {
    resizer.addEventListener('mousedown', (ev) => {
      ev.preventDefault()
      const startX = ev.clientX
      const startW = rail.getBoundingClientRect().width
      const onMove = (e: MouseEvent) => { const dx = e.clientX - startX; applyRailWidth(startW + dx) }
      const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    })
  }

  // Back / Forward controls are bound inside renderProjectTabsBar per render

  // Tab lock interactions (left rail)
  const bar = container.querySelector('#tabBar') as HTMLElement | null
  bar?.addEventListener('click', (e) => {
    const lock = (e.target as HTMLElement).closest('.tab-lock') as HTMLElement | null
    if (!lock) return
    const tabId = lock.getAttribute('data-for') || ''
    if (!tabId) return
    const scoped = tabId === 'summary' ? String(project.id) : (tabId.includes(':') ? tabId : `${project.id}:${tabId}`)
    // toggle
    const on = !(localStorage.getItem(`wg-edit-${scoped}`) === '1')
    localStorage.setItem(`wg-edit-${scoped}`, on ? '1' : '0')
    lock.innerHTML = on ? LOCK_OPEN_RIGHT_SVG : LOCK_SVG
    lock.setAttribute('aria-pressed', on ? 'true' : 'false')
    // If the panel exists now, apply immediately
    const panel = container.querySelector(`section[data-tab="${tabId}"]`) as HTMLElement | null
    const grid = panel?.querySelector('#widgetGrid') as HTMLElement | null
    if (grid && (grid as any)._setEdit) { (grid as any)._setEdit(on) }
  })
  // Initialize built-in tab lock icons
  try {
    const sumBtn = bar?.querySelector('.tab-lock[data-for="summary"]') as HTMLElement | null
    if (sumBtn) {
      const on = localStorage.getItem(`wg-edit-${project.id}`) === '1'
      sumBtn.innerHTML = on ? LOCK_OPEN_RIGHT_SVG : LOCK_SVG
      sumBtn.setAttribute('aria-pressed', on ? 'true' : 'false')
    }
  } catch { }

  // Load data for widgets from GitHub proxy (independent fallbacks)
  if (fullName) {
    // Overview (repo meta)
    try {
      const repo = await apiFetch<any>(`/github/repo?full_name=${encodeURIComponent(fullName)}`)
      hydrateOverview(container, repo)
    } catch { }
    // Top committers
    try {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      const commits = await apiFetch<any[]>(`/github/commits?full_name=${encodeURIComponent(fullName)}&since=${encodeURIComponent(since)}&per_page=100`)
      hydrateCommittersFromCommits(container, commits)
    } catch {
      try {
        const contr = await apiFetch<any[]>(`/github/contributors?full_name=${encodeURIComponent(fullName)}`)
        hydrateCommittersFromContributors(container, contr)
      } catch { }
    }
    // README text (do not depend on repo call)
    try {
      const token = localStorage.getItem('apiToken')
      const res = await fetch(`/api/github/readme?full_name=${encodeURIComponent(fullName)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const readmeText = res.ok ? await res.text() : 'README not found'
      hydrateReadme(container, readmeText)
    } catch { }
    // Contributions heatmap (use caching to avoid heavy calls)
    try {
      await hydrateContribHeatmap(container, fullName)
    } catch { }
  }

  // Update avatar image if user was fetched
  if (me?.github_id) {
    const accImg = container.querySelector('#accountTopImg') as HTMLImageElement | null
    const url = `https://avatars.githubusercontent.com/u/${me.github_id}?s=96`
    if (accImg) { accImg.src = url; accImg.classList.remove('hidden') }
  }
  try { hideRouteLoading() } catch {}
}

// ---------- Widgets helpers ----------

function widgetShell(id: string, title: string, body: string): string {
  // タイトルは非表示。S/M/L操作は廃止し、角からのリサイズへ移行。
  // 枠線の代わりに、背景＋シャドウで“盛り上がり”を表現。
  return `
    <div class="widget group relative gh-card p-3 md:col-span-6 flex flex-col overflow-hidden" draggable="false" data-widget="${id}">
      <div class="wg-content relative min-h-0 flex-1 overflow-auto">${body}</div>
      <!-- Edit-only controls: move handle, delete button, resize handles (sides + corners) -->
      <div class="wg-move hidden absolute z-20 top-1 left-1 w-7 h-7 grid place-items-center cursor-grab active:cursor-grabbing select-none">
        <img src="/src/public/drag_indicator_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.svg" alt="drag" class="w-5 h-5 opacity-80" draggable="false"/>
      </div>
      <button class="w-del hidden absolute z-20 top-1 right-1 w-7 h-7 grid place-items-center text-rose-300 hover:text-rose-400 text-xl md:text-2xl leading-none">×</button>
      <!-- sides -->
      <div class="wg-rz hidden absolute z-20 top-1/2 -translate-y-1/2 right-0 w-2 h-8 cursor-e-resize" data-rz="e"></div>
      <div class="wg-rz hidden absolute z-20 left-0 top-1/2 -translate-y-1/2 w-2 h-8 cursor-w-resize" data-rz="w"></div>
      <div class="wg-rz hidden absolute z-20 bottom-0 left-1/2 -translate-x-1/2 h-2 w-8 cursor-s-resize" data-rz="s"></div>
      <div class="wg-rz hidden absolute z-20 top-0 left-1/2 -translate-x-1/2 h-2 w-8 cursor-n-resize" data-rz="n"></div>
      <!-- corners: no visible square -->
      <div class="wg-rz hidden absolute z-20 bottom-0 right-0 w-3.5 h-3.5 cursor-se-resize" data-rz="se"></div>
      <div class="wg-rz hidden absolute z-20 top-0 right-0 w-3.5 h-3.5 cursor-ne-resize" data-rz="ne"></div>
      <div class="wg-rz hidden absolute z-20 bottom-0 left-0 w-3.5 h-3.5 cursor-sw-resize" data-rz="sw"></div>
      <div class="wg-rz hidden absolute z-20 top-0 left-0 w-3.5 h-3.5 cursor-nw-resize" data-rz="nw"></div>
    </div>
  `
}

function addWidgetCard(): string {
  // Always stay at the bottom and take full width on desktop so it doesn't get in the way
  return `<button id="addWidget" class="order-last md:col-span-12 rounded-xl bg-neutral-800/50 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_6px_18px_rgba(0,0,0,0.3)] grid place-items-center text-gray-400 h-24 md:h-28 hover:bg-neutral-800/60">ウィジェット追加<br/><span class="text-2xl md:text-3xl">＋</span></button>`
}

function contributionWidget(): string {
  // Heatmap container; size adapts to widget (full height/width)
  return `
    <div class="contrib-body h-full overflow-x-auto overflow-y-hidden">
      <div class="contrib-grid inline-grid"></div>
    </div>
  `
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
  // 内側の枠線も撤去し、読みやすいプレーンな背景に
  return `<div class="h-full overflow-auto rounded bg-neutral-900/30 p-4 text-gray-200 whitespace-pre-wrap">Loading README...</div>`
}

function hydrateOverview(root: HTMLElement, repo: any): void {
  const widget = root.querySelector('[data-widget="overview"]') as HTMLElement | null
  if (!widget) return
  const body = widget.querySelector('.wg-content') as HTMLElement | null
  if (!body) return
  body.innerHTML = `
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
  `
  try {
    const cols = parseInt((widget.getAttribute('data-cols') || '8'), 10)
    const rows = parseInt((widget.getAttribute('data-rows') || '2'), 10)
    const area = Math.max(1, cols * rows)
    const scale = Math.max(0.9, Math.min(1.4, Math.sqrt(area / 16)))
    densifyGeneric(widget, scale)
  } catch { }
}

function committersRender(root: HTMLElement, stats: Array<{ login: string; avatar_url?: string; count: number }>): void {
  let wrap = root.querySelector('[data-widget="committers"] .h-60') as HTMLElement | null
  if (!wrap) wrap = root.querySelector('[data-widget="committers"] .wg-content') as HTMLElement | null
  if (!wrap) return
  // Ensure the container follows the widget height (do not keep fixed 15rem)
  if (wrap.classList.contains('h-60')) {
    wrap.classList.remove('h-60')
      ; (wrap as HTMLElement).style.height = '100%'
  }
  const top = stats.slice(0, 6)
  const max = Math.max(1, ...top.map((s) => s.count))
  const cols = Math.max(3, top.length)
  const h = Math.max(0, Math.round(wrap.getBoundingClientRect().height || 0))
  // Adaptive sizing for tiny heights
  const avatarSize = h <= 72 ? 20 : h <= 110 ? 24 : 32
  const labelSpace = 12 // approx label height
  const reserve = Math.min(Math.max(avatarSize + 12, 28), Math.max(28, Math.round(h * 0.55))) + labelSpace
  const gapClass = h <= 110 ? 'gap-2' : 'gap-4'
  wrap.innerHTML = `
    <div class="relative w-full h-full rounded-md" style="background-color: var(--gh-canvas-subtle); border: 1px solid var(--gh-border); border-radius: var(--radius-card, 12px);">
      <div class="absolute inset-0 grid" style="grid-template-rows: repeat(4, 1fr)">
        ${[0, 1, 2, 3].map(() => '<div class=\"border-t border-dotted\" style=\"border-color: var(--gh-border);\"></div>').join('')}
      </div>
      <div class="absolute inset-0 flex items-end ${gapClass} justify-evenly px-2 md:px-4">
        ${top
          .map(
            (s) => `
          <div class=\"flex flex-col items-center h-full\" style=\"width:${Math.floor(100 / cols)}%\">
            <div class=\"w-5 md:w-8\" style=\"height: calc(100% - ${reserve}px); display: flex; align-items: flex-end;\">
              <div class=\"w-full rounded\" style=\"background-color: rgb(var(--color-emerald-600)); height:${Math.round((100 * s.count) / max)}%\"></div>
            </div>
            <img src=\"${s.avatar_url || ''}\" class=\"mt-1 md:mt-2 rounded-full object-cover\" style=\"width:${avatarSize}px; height:${avatarSize}px; border: 2px solid var(--gh-border);\"/>
            <div class=\"mt-1 text-[10px] md:text-xs truncate max-w-[72px]\" style=\"color: var(--gh-muted);\">${s.login}</div>
          </div>`
          )
          .join('')}
      </div>
    </div>`
  try {
    const widget = root.querySelector('[data-widget="committers"]') as HTMLElement | null
    if (widget) {
      const cols = parseInt((widget.getAttribute('data-cols') || '8'), 10)
      const rows = parseInt((widget.getAttribute('data-rows') || '2'), 10)
      const area = Math.max(1, cols * rows)
      const scale = Math.max(0.9, Math.min(1.4, Math.sqrt(area / 16)))
      densifyCommitters(widget, scale)
    }
  } catch { }
}

function hydrateCommittersFromContributors(root: HTMLElement, list: any[]): void {
  const stats = (list || []).map(c => ({ login: c.login || '', avatar_url: c.avatar_url || '', count: c.contributions || 0 }))
  committersRender(root, stats)
}

function hydrateCommittersFromCommits(root: HTMLElement, commits: any[]): void {
  const map = new Map<string, { login: string; avatar_url?: string; count: number }>()
    (commits || []).forEach(c => {
      const author = (c.author && c.author.login) || (c.commit && c.commit.author && c.commit.author.name) || ''
      if (!author) return
      const avatar = c.author && c.author.avatar_url
      const cur = map.get(author) || { login: author, avatar_url: avatar, count: 0 }
      cur.count += 1
      if (!cur.avatar_url && avatar) cur.avatar_url = avatar
      map.set(author, cur)
    })
  const stats = Array.from(map.values()).sort((a, b) => b.count - a.count)
  committersRender(root, stats)
}

function hydrateReadme(root: HTMLElement, text: string): void {
  const el = root.querySelector('[data-widget="readme"] .whitespace-pre-wrap') as HTMLElement | null
  if (!el) return
  el.innerHTML = mdRenderToHtml(text || 'README not found')
  try {
    const w = el.closest('.widget') as HTMLElement | null
    if (w) {
      const cols = parseInt((w.getAttribute('data-cols') || '8'), 10)
      const rows = parseInt((w.getAttribute('data-rows') || '2'), 10)
      const area = Math.max(1, cols * rows)
      const scale = Math.max(0.9, Math.min(1.4, Math.sqrt(area / 16)))
      densifyReadme(w, scale)
    }
  } catch { }
}

// ------- Contributions heatmap (GitHub-like) -------
type ContribCache = { at: number; start: string; days: Record<string, number> }

function contribCacheKey(full: string): string { return `pj-contrib-cache-v1-${full}` }
function contribGetCache(full: string): ContribCache | null {
  try {
    const raw = localStorage.getItem(contribCacheKey(full))
    if (!raw) return null
    const obj = JSON.parse(raw) as ContribCache
    return obj || null
  } catch { return null }
}
function contribSetCache(full: string, data: ContribCache): void {
  try { localStorage.setItem(contribCacheKey(full), JSON.stringify(data)) } catch { }
}

function formatDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildContribRangeFrom(start: Date, end: Date): { start: Date; end: Date; days: string[]; weeks: number } {
  const s = new Date(start)
  const e = new Date(end)
  s.setUTCHours(0, 0, 0, 0)
  e.setUTCHours(0, 0, 0, 0)
  // align start to previous Sunday
  const dow = s.getUTCDay()
  s.setUTCDate(s.getUTCDate() - dow)
  const days: string[] = []
  const cur = new Date(s)
  while (cur <= e) {
    days.push(formatDate(cur))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  const weeks = Math.ceil(days.length / 7)
  return { start: s, end: e, days, weeks }
}

async function fetchCommitsPaged(full: string, sinceIso: string): Promise<any[]> {
  const per = 100
  const items: any[] = []
  // Attempt to fetch up to 20 pages to cover active repos
  for (let page = 1; page <= 20; page += 1) {
    let url = `/github/commits?full_name=${encodeURIComponent(full)}&since=${encodeURIComponent(sinceIso)}&per_page=${per}&page=${page}`
    try {
      const chunk = await apiFetch<any[]>(url)
      if (!Array.isArray(chunk) || chunk.length === 0) break
      items.push(...chunk)
      if (chunk.length < per) break
      // Optional: stop early if oldest commit in chunk older than since
      const last = chunk[chunk.length - 1]
      const dt = (last?.commit?.author?.date || last?.commit?.committer?.date || '') as string
      if (dt && new Date(dt).getTime() < new Date(sinceIso).getTime()) break
    } catch {
      break
    }
  }
  return items
}

async function ensureContribData(full: string): Promise<ContribCache> {
  const ttl = 6 * 60 * 60 * 1000 // 6 hours
  const now = Date.now()
  const cached = contribGetCache(full)
  const range = buildContribRange()
  if (cached && (now - cached.at) < ttl) {
    // Reuse cached within TTL
    return cached
  }
  // Fetch from GitHub commits API (fetch broadly; capped by paging)
  const since = '1970-01-01T00:00:00.000Z'
  const commits = await fetchCommitsPaged(full, since)
  const days: Record<string, number> = {}
  commits.forEach((c) => {
    const ts = (c?.commit?.author?.date || c?.commit?.committer?.date || '') as string
    if (!ts) return
    // Prefer YYYY-MM-DD from ISO string head to avoid TZ drift
    const m = ts.match(/^(\d{4}-\d{2}-\d{2})/)
    const key = m ? m[1] : formatDate(new Date(ts))
    if (!days[key]) days[key] = 0
    days[key] += 1
  })
  // cache start from earliest day we observed
  const keys = Object.keys(days)
  const earliest = keys.length ? keys.sort()[0] : formatDate(range.start)
  const data: ContribCache = { at: now, start: earliest, days }
  contribSetCache(full, data)
  return data
}

function renderContribHeatmap(root: HTMLElement, full: string, cache: ContribCache): void {
  // Build dynamic range from earliest commit to today
  const end = new Date(); end.setUTCHours(0, 0, 0, 0)
  const start = cache.start ? new Date(cache.start + 'T00:00:00Z') : new Date(end.getTime() - 364 * 24 * 60 * 60 * 1000)
  const range = buildContribRangeFrom(start, end)
  let days = range.days
  // Determine levels by max
  let max = 0
  days.forEach((d) => { max = Math.max(max, cache.days[d] || 0) })
  const toLevel = (n: number): number => {
    if (n <= 0) return 0
    if (max <= 4) return Math.min(4, n) // low activity repos
    const ratio = n / max
    const s = Math.sqrt(ratio) // emphasize low counts
    if (s < 0.25) return 1
    if (s < 0.5) return 2
    if (s < 0.75) return 3
    return 4
  }
  // Use CSS-variable driven colors so palette adapts to theme live
  // Define 5 levels via --heat-0..4 (RGB tuples) in theme tokens
  let weeks = range.weeks

  const nodes = root.querySelectorAll('.contrib-body .contrib-grid') as NodeListOf<HTMLElement>
  nodes.forEach((grid) => {
    // Compute cell size to fill widget height naturally; width can scroll
    const wrap = grid.closest('.contrib-body') as HTMLElement | null
    const rect = (wrap || grid).getBoundingClientRect()
    const gap = 2
    // Decide dynamic rows/cell to minimize leftover height and keep natural cell size
    const minRows = 6, maxRows = 24, minCell = 7
    let bestRows = 7
    let bestCell = 0
    let bestLeft = Number.POSITIVE_INFINITY
    for (let r = minRows; r <= maxRows; r++) {
      const c = Math.floor((rect.height - (r - 1) * gap) / r)
      if (!isFinite(c) || c < minCell) continue
      const total = r * c + (r - 1) * gap
      const left = Math.max(0, rect.height - total)
      const better = (left < bestLeft) || (left === bestLeft && c > bestCell)
      if (better) { bestRows = r; bestCell = c; bestLeft = left }
    }
    if (bestCell <= 0) {
      // layout not settled; retry next frame
      try {
        const body = (wrap || grid.parentElement) as HTMLElement | null
        if (body) {
          const cnt = parseInt(body.getAttribute('data-contrib-retry') || '0', 10)
          if (cnt < 3) {
            body.setAttribute('data-contrib-retry', String(cnt + 1))
            requestAnimationFrame(() => { const cache2 = contribGetCache(full); if (cache2) renderContribHeatmap(root, full, cache2) })
            return
          } else { body.removeAttribute('data-contrib-retry') }
        }
      } catch { }
      bestRows = 7
      bestCell = Math.max(minCell, Math.floor((rect.height - (bestRows - 1) * gap) / bestRows))
    }
    const ROWS = bestRows
    const cell = bestCell
    // Use full range (from first commit to today); do NOT pad earlier than first commit
    const usedDays = days.slice()
    weeks = Math.max(1, Math.ceil(usedDays.length / ROWS))

    grid.style.gridTemplateColumns = `repeat(${weeks}, ${cell}px)`
    grid.style.gridTemplateRows = `repeat(${ROWS}, ${cell}px)`
    grid.style.gridAutoFlow = 'column'
    grid.style.gap = `${gap}px`
    grid.innerHTML = usedDays.map((d) => {
      const n = cache.days[d] || 0
      const lv = toLevel(n)
      return `<div class="rounded-sm" style="width:${cell}px; height:${cell}px; background-color: rgb(var(--heat-${lv}));" title="${d}: ${n} commits" aria-label="${d}: ${n} commits"></div>`
    }).join('')
    // Scroll to show the most recent weeks by default (right edge)
    try {
      const body = wrap || (grid.parentElement as HTMLElement | null)
      if (body) body.scrollLeft = Math.max(0, grid.scrollWidth - body.clientWidth)
    } catch { }
  })
}

async function hydrateContribHeatmap(root: HTMLElement, full: string): Promise<void> {
  try {
    const data = await ensureContribData(full)
    renderContribHeatmap(root, full, data)
    // Observe size changes to keep grid fitted to widget
    try {
      const bodies = root.querySelectorAll('.contrib-body') as NodeListOf<HTMLElement>
      bodies.forEach((b) => {
        if ((b as any)._contribRO) return
        if ('ResizeObserver' in window) {
          const ro = new (window as any).ResizeObserver(() => {
            const cache = contribGetCache(full); if (cache) renderContribHeatmap(root, full, cache)
          })
          ro.observe(b)
            ; (b as any)._contribRO = ro
        }
      })
    } catch { }
  } catch { }
}

function refreshContribLayout(root: HTMLElement): void {
  const full = (root.getAttribute('data-repo-full') || (document.querySelector('[data-repo-full]') as HTMLElement | null)?.getAttribute('data-repo-full') || '')
  if (!full) return
  const cache = contribGetCache(full)
  if (!cache) return
  renderContribHeatmap(root, full, cache)
}

function enableDragAndDrop(root: HTMLElement): void {
  const grid = root.querySelector('#widgetGrid') as HTMLElement | null
  if (!grid) return
  const pid = grid.getAttribute('data-pid') || '0'
  // Remove deprecated widgets from saved meta and DOM (overview, milestones)
  try {
    const meta = getWidgetMeta(pid)
    let changed = false
    Object.entries(meta).forEach(([id, m]) => {
      const t = (m as any)?.type
      if (t === 'overview' || t === 'milestones') {
        delete (meta as any)[id]
        changed = true
        const node = grid.querySelector(`[data-widget="${id}"]`)
        if (node) node.remove()
      }
    })
    if (changed) setWidgetMeta(pid, meta)
  } catch { }
  let dragEl: HTMLElement | null = null
  let bgMenuEl: HTMLElement | null = null
  let dragAllowed = false
  let hoverEl: HTMLElement | null = null
  let ghostEl: HTMLElement | null = null
  let ghost = { left: 0, top: 0, cols: 0, rows: 0 }

  const getMetrics = () => {
    const styles = getComputedStyle(grid)
    const gapX = parseFloat((styles.columnGap || '0').toString()) || 0
    const gapY = parseFloat((styles.rowGap || '0').toString()) || 0
    const unitCols = 12
    const gridRect = grid.getBoundingClientRect()
    const colW = Math.max(1, (gridRect.width - (unitCols - 1) * gapX) / unitCols)
    const rowH = parseFloat((styles.gridAutoRows || '24').toString()) || 24
    return { gapX, gapY, gridRect, colW, rowH, unitCols }
  }

  const ensureGhost = () => {
    if (ghostEl) return ghostEl
    const el = document.createElement('div')
    el.id = 'wg-ghost'
    el.style.position = 'fixed'
    el.style.pointerEvents = 'none'
    el.style.zIndex = '71'
    el.style.border = '2px dashed rgba(251,191,36,1)' // amber-400
    el.style.background = 'rgba(251,191,36,0.08)'
    el.style.borderRadius = '10px'
    el.style.display = 'none'
    document.body.appendChild(el)
    ghostEl = el
    return el
  }

  const hideGhost = () => { if (ghostEl) ghostEl.style.display = 'none' }

  const getWidgetDims = (w: HTMLElement) => {
    const id = w.getAttribute('data-widget') || ''
    const meta = getWidgetMeta(pid)
    const cur = meta[id] || {}
    const size = (cur.size || 'md') as 'sm' | 'md' | 'lg'
    const cols = Math.max(1, Math.min(12, (cur as any).cols ?? (size === 'sm' ? 4 : size === 'md' ? 8 : 12)))
    const h = (cur.h || 'md') as 'sm' | 'md' | 'lg'
    const rows = Math.max(1, Math.min(12, (cur as any).rows ?? (h === 'sm' ? 1 : h === 'md' ? 2 : 3)))
    return { cols, rows }
  }

  const updateGhostAtPoint = (clientX: number, clientY: number) => {
    const g = ensureGhost()
    const { gapX, gapY, gridRect, colW, rowH, unitCols } = getMetrics()
    const src = dragEl ? getWidgetDims(dragEl) : { cols: 4, rows: 2 }
    // Snap to grid
    const col = Math.max(0, Math.min(unitCols - 1, Math.floor((clientX - gridRect.left) / (colW + gapX))))
    const row = Math.max(0, Math.floor((clientY - gridRect.top) / (rowH + gapY)))

    const curLeft = gridRect.left + col * (colW + gapX)
    const top = gridRect.top + row * (rowH + gapY)
    const ghostHeightPx = src.rows * rowH + (src.rows - 1) * gapY
    // Find nearest right neighbor overlapping vertically to estimate available width
    let neighborLeft = gridRect.right
    grid.querySelectorAll('.widget').forEach((n) => {
      const el = n as HTMLElement
      if (el === dragEl) return
      const r = el.getBoundingClientRect()
      const verticalOverlap = !(r.bottom <= top || r.top >= top + ghostHeightPx)
      if (verticalOverlap && r.left > curLeft) neighborLeft = Math.min(neighborLeft, r.left)
    })
    // Available pixels to the right edge or neighbor (do not subtract gap here)
    const availablePx = Math.max(colW, neighborLeft - curLeft)
    const maxColsFit = Math.max(1, Math.min(src.cols, Math.floor((availablePx + gapX) / (colW + gapX))))
    const cols = Math.max(1, Math.min(unitCols - col, maxColsFit))
    const rows = src.rows // keep rows as-is for now

    const left = curLeft
    const width = cols * colW + (cols - 1) * gapX
    const height = rows * rowH + (rows - 1) * gapY
    g.style.left = `${Math.round(left)}px`
    g.style.top = `${Math.round(top)}px`
    g.style.width = `${Math.round(width)}px`
    g.style.height = `${Math.round(height)}px`
    g.style.display = 'block'
    ghost = { left, top, cols, rows }
  }

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
    } catch { }
  }

  const isEdit = () => grid.getAttribute('data-edit') === '1'
  // (removed) reorderByVisual: revert to natural DOM order
  // Allow drag only when started from the move handle
  document.addEventListener('mouseup', () => { dragAllowed = false })
  grid.addEventListener('mousedown', (e) => {
    if (!isEdit()) return
    const onHandle = (e.target as HTMLElement).closest('.wg-move') as HTMLElement | null
    dragAllowed = !!onHandle
    if (onHandle) {
      const w = onHandle.closest('.widget') as HTMLElement | null
      if (w) w.setAttribute('draggable', 'true')
    }
  })

  grid.addEventListener('dragstart', (e) => {
    if (!isEdit()) { (e as DragEvent).preventDefault(); return }
    if (!dragAllowed) { (e as DragEvent).preventDefault(); return }
    const t = (e.target as HTMLElement).closest('.widget') as HTMLElement | null
    if (!t) return
    dragEl = t
    const dt = (e as DragEvent).dataTransfer
    if (dt) { try { dt.setData('text/plain', 'widget'); dt.effectAllowed = 'move' } catch { } }
    // Keep layout by hiding visually (not removing flow)
    setTimeout(() => { t.style.visibility = 'hidden' }, 0)
    // Move add button out of the way while dragging
    const add = grid.querySelector('#addWidget') as HTMLElement | null
    if (add) { add.setAttribute('data-prev-display', add.style.display || ''); add.style.display = 'none' }
  })
  grid.addEventListener('dragover', (e) => {
    if (!isEdit()) return
    e.preventDefault()
    try { const dt = (e as DragEvent).dataTransfer; if (dt) dt.dropEffect = 'move' } catch { }
    const t = e.target as HTMLElement
    const widget = t.closest('.widget') as HTMLElement | null
    if (!dragEl) return
    // Update ghost to show target area even on empty space
    updateGhostAtPoint((e as DragEvent).clientX, (e as DragEvent).clientY)
    // also remember widget under cursor for potential swap drop
    hoverEl = (widget && widget !== dragEl) ? widget : null
  })
  grid.addEventListener('dragenter', (e) => { if (isEdit()) e.preventDefault() })
  grid.addEventListener('drop', (e) => {
    if (!isEdit()) return
    e.preventDefault()
    if (dragEl) {
      dragEl.style.visibility = ''
      // Swap positions only when dropping onto another widget
      if (hoverEl && hoverEl !== dragEl) {
        const a = dragEl
        const b = hoverEl
        const parent = a.parentNode as HTMLElement
        if (parent && b.parentNode === parent) {
          const aNext = a.nextSibling
          const bNext = b.nextSibling
          if (aNext === b) {
            parent.insertBefore(b, a)
          } else if (bNext === a) {
            parent.insertBefore(a, b)
          } else {
            if (bNext) parent.insertBefore(a, bNext); else parent.appendChild(a)
            if (aNext) parent.insertBefore(b, aNext); else parent.appendChild(b)
          }
        }
      } else {
        // Drop on empty space: insert near cursor position and auto-adjust width
        const { cols, rows } = ghost
        const id = dragEl.getAttribute('data-widget') || ''
        const meta2 = getWidgetMeta(pid)
        const m = meta2[id] || {}
          ; (m as any).cols = cols
          ; (m as any).rows = rows
        meta2[id] = m as any
        setWidgetMeta(pid, meta2)
        applyWidgetSizes(root, pid)
        // Insert before first widget visually below the cursor; else append
        const y = (e as DragEvent).clientY
        let target: Element | null = null
        const items = Array.from(grid.querySelectorAll('.widget')).filter(n => n !== dragEl)
          .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left)
        for (const n of items) { const r = (n as HTMLElement).getBoundingClientRect(); if (r.top > y) { target = n; break } }
        if (target) grid.insertBefore(dragEl, target)
        else grid.appendChild(dragEl)
        save()
      }
      hideGhost()
      applyWidgetSizes(root, pid)
      const add = grid.querySelector('#addWidget') as HTMLElement | null
      if (add) { const prev = add.getAttribute('data-prev-display') || ''; add.style.display = prev; add.removeAttribute('data-prev-display') }
      hoverEl = null
    }
    dragEl = null
    dragAllowed = false
  })
  grid.addEventListener('dragend', () => {
    if (dragEl) dragEl.style.visibility = ''
    hideGhost()
    hoverEl = null
    const add = grid.querySelector('#addWidget') as HTMLElement | null
    if (add) { const prev = add.getAttribute('data-prev-display') || ''; add.style.display = prev; add.removeAttribute('data-prev-display') }
    dragEl = null
    dragAllowed = false
  })

  // Context menu: background color picker (edit mode only)
  const closeBgMenu = () => { bgMenuEl?.remove(); bgMenuEl = null }
  const openBgMenu = (x: number, y: number, widget: HTMLElement) => {
    closeBgMenu()
    const menu = document.createElement('div')
    menu.className = 'fixed rounded-md ring-2 ring-neutral-600 bg-neutral-900 shadow-lg p-2 text-xs text-gray-200'
    menu.style.left = `${Math.max(8, Math.min(window.innerWidth - 180, x))}px`
    menu.style.top = `${Math.max(8, Math.min(window.innerHeight - 200, y))}px`
    menu.style.zIndex = '70'
    const opts: Array<{ label: string; val: string }> = [
      { label: 'デフォルト', val: '' },
      { label: 'ダーク(控えめ)', val: 'rgba(23,23,23,0.50)' },
      { label: 'エメラルド', val: 'rgba(16,185,129,0.18)' },
      { label: 'ブルー', val: 'rgba(56,189,248,0.18)' },
      { label: 'ローズ', val: 'rgba(244,63,94,0.18)' },
      { label: 'アンバー', val: 'rgba(245,158,11,0.18)' },
    ]
    menu.innerHTML = `<div class="mb-1 text-[11px] text-gray-400 px-1">背景色を選択</div>` +
      opts.map(o => `
        <button class=\"w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-neutral-800/60\" data-bg=\"${o.val}\">
          <span class=\"inline-block w-4 h-4 rounded ring-2 ring-neutral-600\" style=\"background:${o.val || 'transparent'}\"></span>
          <span>${o.label}</span>
        </button>
      `).join('')
    document.body.appendChild(menu)
    bgMenuEl = menu
    const id = widget.getAttribute('data-widget') || ''
    menu.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-bg]') as HTMLElement | null
      if (!btn) return
      const bg = btn.getAttribute('data-bg') || ''
      // persist
      const meta = getWidgetMeta(pid)
      meta[id] = { ...(meta[id] || {}), bg }
      setWidgetMeta(pid, meta)
      applyWidgetSizes(root, pid)
      closeBgMenu()
    })
  }
  grid.addEventListener('contextmenu', (e) => {
    if (!isEdit()) return
    const widget = (e.target as HTMLElement).closest('.widget') as HTMLElement | null
    if (!widget) return
    e.preventDefault()
    openBgMenu((e as MouseEvent).clientX, (e as MouseEvent).clientY, widget)
  })
  // Close menu on outside click / escape / scroll / navigation
  if (!(grid as any)._bgMenuBound) {
    (grid as any)._bgMenuBound = true
    document.addEventListener('click', (e) => {
      if (!bgMenuEl) return
      const t = e.target as Node
      if (bgMenuEl && !bgMenuEl.contains(t)) closeBgMenu()
    })
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBgMenu() })
    document.addEventListener('scroll', () => closeBgMenu(), true)
    window.addEventListener('hashchange', closeBgMenu)
    window.addEventListener('popstate', closeBgMenu)
    window.addEventListener('beforeunload', closeBgMenu)
  }

  // Edit mode toggle
  const setEdit = (on: boolean) => {
    grid.setAttribute('data-edit', on ? '1' : '0')
    grid.querySelectorAll('.widget').forEach((w) => (w as HTMLElement).setAttribute('draggable', on ? 'true' : 'false'))
    const btn = root.querySelector('#wgEditToggle') as HTMLElement | null
    if (btn) btn.textContent = on ? '完了' : '編集'
    if (!on) closeBgMenu()
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
      // ドラッグを示すカーソルはハンドル側にのみ付与
      el.classList.toggle('border', on)
      el.classList.toggle('border-dashed', on)
      el.classList.toggle('border-amber-500/40', on)
      const delBtn = el.querySelector('.w-del') as HTMLElement | null
      const resHandles = el.querySelectorAll('.wg-rz') as NodeListOf<HTMLElement>
      const move = el.querySelector('.wg-move') as HTMLElement | null
      if (delBtn) delBtn.classList.toggle('hidden', !on)
      resHandles.forEach(h => h.classList.toggle('hidden', !on))
      if (move) move.classList.toggle('hidden', !on)
    })
    // Toggle elements that are explicitly edit-only
    grid.querySelectorAll('.edit-only').forEach((el) => (el as HTMLElement).classList.toggle('hidden', !on))
    // no reorder on toggle (reverted)
    // Sync markdown widgets' editor/preview visibility to edit state
    try { setTimeout(() => { try { (syncMdWidgets as any)(on) } catch { } }, 0) } catch { }
    // Rerender link cards to reflect mode (controls vs preview default)
    try { setTimeout(() => { try { refreshDynamicWidgets(root, pid) } catch { } }, 0) } catch { }
  }
  const savedEdit = localStorage.getItem(`wg-edit-${pid}`) === '1'
  setEdit(!!savedEdit)
    ; (grid as any)._setEdit = (on: boolean) => setEdit(on)

  // Initialize: ensure all meta-defined widgets exist, then apply saved order, then sizes
  ensureWidgets(root, pid)
  load()
  applyWidgetSizes(root, pid)

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
        ; (grid as HTMLElement).style.gridAutoRows = `${Math.round(base / 2)}px`
    } catch { }
  }
  adjustGridRowSize()
    ; (function attachResize() {
      try {
        if ((grid as any)._rowSizerAttached) return
          ; (grid as any)._rowSizerAttached = true
        if ('ResizeObserver' in window) {
          const ro = new (window as any).ResizeObserver(() => adjustGridRowSize())
          ro.observe(grid)
            ; (grid as any)._ro = ro
        } else {
          window.addEventListener('resize', adjustGridRowSize)
        }
      } catch { }
    })()

  // Add widget button
  grid.querySelector('#addWidget')?.addEventListener('click', () => openWidgetPickerModal(root, pid))

  // Resize: edges and corners (handles with .wg-rz [data-rz])
  // Helper: detect resize direction from pointer proximity to widget edges
  const EDGE_TOL = 8
  const edgeDirAtPoint = (w: HTMLElement, x: number, y: number): ('e' | 'w' | 'n' | 's' | 'se' | 'ne' | 'sw' | 'nw' | null) => {
    const r = w.getBoundingClientRect()
    const nearL = (x - r.left) <= EDGE_TOL
    const nearR = (r.right - x) <= EDGE_TOL
    const nearT = (y - r.top) <= EDGE_TOL
    const nearB = (r.bottom - y) <= EDGE_TOL
    const horiz = nearL ? 'w' : (nearR ? 'e' : '')
    const vert = nearT ? 'n' : (nearB ? 's' : '')
    if (horiz && vert) return (vert + horiz) as any
    if (horiz) return horiz as any
    if (vert) return vert as any
    return null
  }
  // Hover cursor feedback for edges (do not override move handle cursor)
  grid.addEventListener('mousemove', (e) => {
    if (!isEdit()) return
    const target = (e.target as HTMLElement)
    if (target.closest('.wg-move')) return
    const widget = target.closest('.widget') as HTMLElement | null
    if (!widget) return
    const dir = edgeDirAtPoint(widget, (e as MouseEvent).clientX, (e as MouseEvent).clientY)
    const toCursor: Record<string, string> = { e: 'e-resize', w: 'w-resize', n: 'n-resize', s: 's-resize', se: 'se-resize', ne: 'ne-resize', sw: 'sw-resize', nw: 'nw-resize' }
    widget.style.cursor = dir ? (toCursor[dir] || '') : ''
  })
  grid.addEventListener('mouseleave', () => { const els = grid.querySelectorAll('.widget') as NodeListOf<HTMLElement>; els.forEach(el => (el.style.cursor = '')) })

  grid.addEventListener('mousedown', (e) => {
    let handle = (e.target as HTMLElement).closest('.wg-rz') as HTMLElement | null
    if (grid.getAttribute('data-edit') !== '1') return
    let widget = handle?.closest('.widget') as HTMLElement | null
    if (!widget) widget = (e.target as HTMLElement).closest('.widget') as HTMLElement | null
    if (!widget) return
    // If user grabbed the move handle, do not treat as resize
    if ((e.target as HTMLElement).closest('.wg-move')) return
    // no-op (reverted reorder)

    const id = widget.getAttribute('data-widget') || ''
    const meta = getWidgetMeta(pid)
    const cur = meta[id] || {}
    const curSize = (cur.size || 'md') as 'sm' | 'md' | 'lg'
    let startCols = (cur as any).cols ?? (curSize === 'sm' ? 4 : curSize === 'md' ? 8 : 12)
    const curH = (cur.h || 'md') as 'sm' | 'md' | 'lg'
    let startRows = (cur as any).rows ?? (curH === 'sm' ? 1 : curH === 'md' ? 2 : 3)
    let startPb = Math.max(0, Math.floor(((cur as any).pb) || 0))
    startCols = Math.max(1, Math.min(12, startCols))
    startRows = Math.max(1, Math.min(12, startRows))

    const startX = (e as MouseEvent).clientX
    const startY = (e as MouseEvent).clientY

    const styles = getComputedStyle(grid)
    const gapX = parseFloat((styles.columnGap || '0').toString()) || 0
    const unitCols = 12
    const gridRect = grid.getBoundingClientRect()
    const colW = Math.max(1, (gridRect.width - (unitCols - 1) * gapX) / unitCols)
    const rowH = parseFloat((styles.gridAutoRows || '24').toString()) || 24

    let lastCols = startCols
    let lastRows = startRows
    let dir = 'se' as 'e' | 's' | 'w' | 'n' | 'se' | 'ne' | 'sw' | 'nw'
    if (handle) {
      dir = (handle.getAttribute('data-rz') || 'se') as any
    } else {
      const guess = edgeDirAtPoint(widget, (e as MouseEvent).clientX, (e as MouseEvent).clientY)
      if (!guess) return
      dir = guess
    }
    // Begin resize only now; prevent default after deciding to resize
    e.preventDefault(); e.stopPropagation()

    // Linked neighbor (horizontal adjacent) for 'e' (right edge) or 'w' (left edge)
    let linkNeighbor: HTMLElement | null = null
    let linkStartCols = 0
    let linkStartRows = 0
    let linkTotalCols = 0
    if (dir === 'e' || dir === 'w') {
      const myRect = widget.getBoundingClientRect()
      const widgets = Array.from(grid.querySelectorAll('.widget')) as HTMLElement[]
      const tol = gapX + 2
      if (dir === 'e') {
        // find neighbor on right that vertically overlaps and is flush to my right within tolerance
        let best: { el: HTMLElement; dx: number } | null = null
        widgets.forEach((el) => {
          if (el === widget) return
          const r = el.getBoundingClientRect()
          const vertical = !(r.bottom <= myRect.top || r.top >= myRect.bottom)
          const dx = Math.abs(r.left - myRect.right)
          if (vertical && r.left >= myRect.right - tol && dx <= tol) {
            if (!best || dx < best.dx) best = { el, dx }
          }
        })
        if (best) linkNeighbor = best.el
      } else if (dir === 'w') {
        // find neighbor on left flush to my left
        let best: { el: HTMLElement; dx: number } | null = null
        widgets.forEach((el) => {
          if (el === widget) return
          const r = el.getBoundingClientRect()
          const vertical = !(r.bottom <= myRect.top || r.top >= myRect.bottom)
          const dx = Math.abs(myRect.left - r.right)
          if (vertical && r.right <= myRect.left + tol && dx <= tol) {
            if (!best || dx < best.dx) best = { el, dx }
          }
        })
        if (best) linkNeighbor = best.el
      }
      if (linkNeighbor) {
        const nid = linkNeighbor.getAttribute('data-widget') || ''
        const nmeta = getWidgetMeta(pid)
        const ncur = nmeta[nid] || {}
        const nsize = (ncur.size || 'md') as 'sm' | 'md' | 'lg'
        linkStartCols = Math.max(1, Math.min(12, (ncur as any).cols ?? (nsize === 'sm' ? 4 : nsize === 'md' ? 8 : 12)))
        linkStartRows = Math.max(1, Math.min(12, (ncur as any).rows ?? ((ncur.h || 'md') === 'sm' ? 1 : (ncur.h || 'md') === 'md' ? 2 : 3)))
        linkTotalCols = startCols + linkStartCols
      }
    }

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      const addColsRaw = Math.round(dx / (colW + (gapX / unitCols)))
      const addRowsRaw = Math.round(dy / rowH)
      let addCols = 0, addRows = 0
      switch (dir) {
        case 'e': addCols = addColsRaw; break
        case 'w': addCols = -addColsRaw; break // 左端をドラッグ: 左へ動かすと幅が増える
        case 's': addRows = addRowsRaw; break
        case 'n': addRows = -addRowsRaw; break
        case 'se': addCols = addColsRaw; addRows = addRowsRaw; break
        case 'ne': addCols = addColsRaw; addRows = -addRowsRaw; break
        case 'sw': addCols = -addColsRaw; addRows = addRowsRaw; break
        case 'nw': addCols = -addColsRaw; addRows = -addRowsRaw; break
      }
      let nextCols = Math.max(1, Math.min(12, startCols + addCols))
      const nextRows = Math.max(1, Math.min(12, startRows + addRows))
      if (linkNeighbor) {
        // keep total constant; adjust neighbor inversely
        const minMy = 1
        const minNei = 1
        nextCols = Math.max(minMy, Math.min(linkTotalCols - minNei, nextCols))
        const neiCols = Math.max(minNei, linkTotalCols - nextCols)
        linkNeighbor.style.gridColumn = `span ${neiCols} / span ${neiCols}`
        linkNeighbor.style.gridRow = `span ${linkStartRows} / span ${linkStartRows}`
      }
      if (nextCols !== lastCols) { widget.style.gridColumn = `span ${nextCols} / span ${nextCols}`; lastCols = nextCols }
      if (nextRows !== lastRows) { widget.style.gridRow = `span ${nextRows} / span ${nextRows}`; lastRows = nextRows }

      // Live pad update to keep lower rows from flowing up when shrinking height
      try {
        const livePadRows = 0
        const sel = `[data-pad-for="${id}"]`
        const pads = Array.from(grid.querySelectorAll(sel)) as HTMLElement[]
        let pad = pads[0] || null
        if (pads.length > 1) { pads.slice(1).forEach(n => n.remove()) }
        if (livePadRows > 0) {
          if (!pad) {
            pad = document.createElement('div')
            pad.className = 'wg-pad'
            pad.setAttribute('data-pad-for', id)
            if (widget.nextSibling) grid.insertBefore(pad, widget.nextSibling)
            else grid.appendChild(pad)
          }
          pad.style.gridColumn = 'span 12 / span 12'
          pad.style.gridRow = `span ${livePadRows} / span ${livePadRows}`
          pad.style.visibility = 'hidden'
          pad.style.pointerEvents = 'none'
          pad.style.margin = '0'
          pad.style.padding = '0'
        } else if (pad) {
          pad.remove()
        }
      } catch { }
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      try { widget.style.cursor = '' } catch { }
      const meta2 = getWidgetMeta(pid)
      const m = meta2[id] || {}
        ; (m as any).cols = lastCols
        ; (m as any).rows = lastRows
      // no persistent pad bookkeeping (reverted)
      meta2[id] = m as any
      if (linkNeighbor) {
        const nid = linkNeighbor.getAttribute('data-widget') || ''
        const nm = meta2[nid] || {}
        const neiCols = parseInt((linkNeighbor.style.gridColumn || '').match(/span\s+(\d+)/)?.[1] || String(linkStartCols), 10)
          ; (nm as any).cols = Math.max(1, Math.min(12, isNaN(neiCols) ? linkStartCols : neiCols))
          ; (nm as any).rows = linkStartRows
        meta2[nid] = nm as any
      }
      setWidgetMeta(pid, meta2)
      applyWidgetSizes(root, pid)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  })

  // Auto-fit width on double-click of right edge handle
  grid.addEventListener('dblclick', (e) => {
    if (!isEdit()) return
    const handle = (e.target as HTMLElement).closest('.wg-rz[data-rz="e"]') as HTMLElement | null
    if (!handle) return
    const widget = handle.closest('.widget') as HTMLElement | null
    if (!widget) return
    e.preventDefault(); e.stopPropagation()

    const { gapX, gridRect, colW, unitCols, rowH } = getMetrics() as any
    const rect = widget.getBoundingClientRect()
    // Estimate start column from current left
    const startCol = Math.max(0, Math.min(unitCols - 1, Math.floor((rect.left - gridRect.left) / (colW + gapX))))
    // Find nearest right neighbor overlapping vertically
    let neighborLeft = gridRect.right
    grid.querySelectorAll('.widget').forEach((n) => {
      const el = n as HTMLElement
      if (el === widget) return
      const r = el.getBoundingClientRect()
      const verticalOverlap = !(r.bottom <= rect.top || r.top >= rect.bottom)
      if (verticalOverlap && r.left > rect.left) neighborLeft = Math.min(neighborLeft, r.left)
    })
    const capacityPx = Math.max(colW, neighborLeft - rect.left)
    const capacityCols = Math.max(1, Math.min(unitCols - startCol, Math.floor((capacityPx + gapX) / (colW + gapX))))

    // Current columns from meta (fallback if missing)
    const id = widget.getAttribute('data-widget') || ''
    const meta = getWidgetMeta(pid)
    const cur = meta[id] || {}
    const fallbackSize = (cur.size || 'md') as 'sm' | 'md' | 'lg'
    const curCols = Math.max(1, Math.min(unitCols, (cur as any).cols ?? (fallbackSize === 'sm' ? 4 : fallbackSize === 'md' ? 8 : 12)))
    const rows = Math.max(1, Math.min(12, (cur as any).rows ?? ((cur.h || 'md') === 'sm' ? 1 : (cur.h || 'md') === 'md' ? 2 : 3)))

    const nextCols = capacityCols
    if (nextCols === curCols) return
      ; (cur as any).cols = nextCols
      ; (cur as any).rows = rows
    meta[id] = cur as any
    setWidgetMeta(pid, meta)
    applyWidgetSizes(root, pid)
  })

  // Size change controls
  grid.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.w-size') as HTMLElement | null
    const hbtn = (e.target as HTMLElement).closest('.w-h') as HTMLElement | null
    if (!btn && !hbtn) return
    const widget = (btn || hbtn)!.closest('.widget') as HTMLElement | null
    if (!widget) return
    const id = widget.getAttribute('data-widget') || ''
    if (btn) {
      const size = btn.getAttribute('data-size') as 'sm' | 'md' | 'lg'
      setWidgetSize(root, pid, id, size)
    } else if (hbtn) {
      const h = hbtn.getAttribute('data-h') as 'sm' | 'md' | 'lg'
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
  // Helper: sync markdown widget UI with edit/lock state
  const syncMdWidgets = (on: boolean) => {
    grid.querySelectorAll('.md-widget').forEach((wrap) => {
      const w = (wrap as HTMLElement).closest('.widget') as HTMLElement | null
      const id = w?.getAttribute('data-widget') || ''
      const editor = (wrap as HTMLElement).querySelector('.md-editor') as HTMLElement | null
      const preview = (wrap as HTMLElement).querySelector('.md-preview') as HTMLElement | null
      const ta = (wrap as HTMLElement).querySelector('.md-text') as HTMLTextAreaElement | null
      const status = (wrap as HTMLElement).querySelector('.md-status') as HTMLElement | null
      const map = mdGetMap(pid)
      const txt = map[id] || ''
      // 非編集モードでの「ロック中」などの文言は表示しない
      if (status) status.textContent = ''
      // load current content into proper view
      if (on) {
        if (ta) ta.value = txt
        if (editor) editor.classList.remove('hidden')
        if (preview) preview.classList.add('hidden')
      } else {
        if (preview) preview.innerHTML = mdRenderToHtml(txt || 'ここにMarkdownを書いてください')
        if (editor) editor.classList.add('hidden')
        if (preview) preview.classList.remove('hidden')
      }
      // Hide the inline edit trigger since global edit mode controls this
      const editBtn = (wrap as HTMLElement).querySelector('.md-edit') as HTMLElement | null
      if (editBtn) editBtn.classList.add('hidden')
      // apply density scaling for this widget
      try {
        const cols = parseInt((w?.getAttribute('data-cols') || '8'), 10)
        const rows = parseInt((w?.getAttribute('data-rows') || '2'), 10)
        const area = Math.max(1, cols * rows)
        const scale = Math.max(0.9, Math.min(1.4, Math.sqrt(area / 16)))
        densifyMarkdown(w as HTMLElement, scale)
      } catch { }
    })
  }
  grid.addEventListener('click', (e) => {
    // 旧UI（編集/保存/キャンセル）ボタンは廃止済み
    // Links: toggle add form
    const add = (e.target as HTMLElement).closest('.lnk-add') as HTMLElement | null
    if (add) {
      const w = getWid(add); if (!w) return
      const form = w.querySelector('.lnk-form') as HTMLElement | null
      if (form) {
        form.classList.toggle('hidden')
        // Reset inputs and errors when opening
        if (!form.classList.contains('hidden')) {
          const t = form.querySelector('.lnk-title') as HTMLInputElement | null
          const u = form.querySelector('.lnk-url') as HTMLInputElement | null
          const err = form.querySelector('.lnk-error') as HTMLElement | null
          if (t) t.value = ''
          if (u) u.value = ''
          if (err) { err.textContent = ''; err.classList.add('hidden') }
          ; (u as HTMLInputElement | null)?.focus()
        }
      }
      return
    }

    // Links: save new (single URL per widget)
    const save = (e.target as HTMLElement).closest('.lnk-save') as HTMLElement | null
    if (save) {
      const w = getWid(save); if (!w) return
      const form = w.querySelector('.lnk-form') as HTMLElement | null
      const titleEl = form?.querySelector('.lnk-title') as HTMLInputElement | null
      const urlEl = form?.querySelector('.lnk-url') as HTMLInputElement | null
      const err = form?.querySelector('.lnk-error') as HTMLElement | null
      const title = (titleEl?.value || '').trim()
      let url = (urlEl?.value || '').trim()
      // Auto-prefix scheme if missing
      if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`
      // basic URL validation
      const gridEl = w.closest('#widgetGrid') as HTMLElement | null
      const isEdit = gridEl?.getAttribute('data-edit') === '1'
      if (!url) {
        // In edit mode, empty URL clears the link
        mdSetLinks(pid, id, [])
        try { refreshDynamicWidgets(root, pid) } catch { }
        if (err) { err.textContent = ''; err.classList.add('hidden') }
        return
      }
      let ok = true
      try { new URL(url) } catch { ok = false }
      if (!ok) {
        if (err) { err.textContent = 'URLが正しくありません'; err.classList.remove('hidden') }
        return
      }
      const id = w.getAttribute('data-widget') || ''
      // Overwrite to keep exactly one link
      mdSetLinks(pid, id, [{ title, url }])
      try { refreshDynamicWidgets(root, pid) } catch { }
      // Keep the form visible in edit mode; hide only if not editing
      // const gridEl = w.closest('#widgetGrid') as HTMLElement | null
      // const isEdit = gridEl?.getAttribute('data-edit') === '1'
      if (!isEdit && form) form.classList.add('hidden')
      return
    }

    // Links: cancel form
    const cancel = (e.target as HTMLElement).closest('.lnk-cancel') as HTMLElement | null
    if (cancel) {
      const w = getWid(cancel); if (!w) return
      const form = w.querySelector('.lnk-form') as HTMLElement | null
      if (form) form.classList.add('hidden')
      return
    }

    // Calendar: toggle form
    const calAdd = (e.target as HTMLElement).closest('.cal-add') as HTMLElement | null
    if (calAdd) {
      const w = getWid(calAdd); if (!w) return
      const form = w.querySelector('.cal-form') as HTMLElement | null
      if (form) {
        form.classList.toggle('hidden')
        if (!form.classList.contains('hidden')) {
          const urlEl = form.querySelector('.cal-url') as HTMLInputElement | null
          const err = form.querySelector('.cal-error') as HTMLElement | null
          if (urlEl) urlEl.value = calGet(pid, w.getAttribute('data-widget') || '')
          if (err) { err.textContent = ''; err.classList.add('hidden') }
          urlEl?.focus()
        }
      }
      return
    }

    // Calendar: save
    const calSave = (e.target as HTMLElement).closest('.cal-save') as HTMLElement | null
    if (calSave) {
      const w = getWid(calSave); if (!w) return
      const id = w.getAttribute('data-widget') || ''
      const form = w.querySelector('.cal-form') as HTMLElement | null
      const urlEl = form?.querySelector('.cal-url') as HTMLInputElement | null
      const err = form?.querySelector('.cal-error') as HTMLElement | null
      let url = (urlEl?.value || '').trim()
      if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`
      // basic URL validation
      let ok = true
      try { if (url) new URL(url) } catch { ok = false }
      if (!ok) { if (err) { err.textContent = 'URLが正しくありません'; err.classList.remove('hidden') }; return }
      if (!url) { calSet(pid, id, ''); try { refreshDynamicWidgets(root, pid) } catch { }; return }
      calSet(pid, id, url)
      try { refreshDynamicWidgets(root, pid) } catch { }
      return
    }

    // Calendar: cancel
    const calCancel = (e.target as HTMLElement).closest('.cal-cancel') as HTMLElement | null
    if (calCancel) {
      const w = getWid(calCancel); if (!w) return
      const form = w.querySelector('.cal-form') as HTMLElement | null
      if (form) form.classList.add('hidden')
      return
    }

    // Links: delete (clear the single link)
    const delLink = (e.target as HTMLElement).closest('.lnk-del') as HTMLElement | null
    if (delLink) {
      const w = getWid(delLink); if (!w) return
      const id = w.getAttribute('data-widget') || ''
      mdSetLinks(pid, id, [])
      try { refreshDynamicWidgets(root, pid) } catch { }
      return
    }

    // Links: edit (prefill form and open)
    const editLink = (e.target as HTMLElement).closest('.lnk-edit') as HTMLElement | null
    if (editLink) {
      const w = getWid(editLink); if (!w) return
      const id = w.getAttribute('data-widget') || ''
      const list = mdGetLinks(pid, id)
      const cur = list && list[0]
      const form = w.querySelector('.lnk-form') as HTMLElement | null
      const titleEl = form?.querySelector('.lnk-title') as HTMLInputElement | null
      const urlEl = form?.querySelector('.lnk-url') as HTMLInputElement | null
      const err = form?.querySelector('.lnk-error') as HTMLElement | null
      if (titleEl) titleEl.value = (cur?.title || '')
      if (urlEl) urlEl.value = (cur?.url || '')
      if (err) { err.textContent = ''; err.classList.add('hidden') }
      if (form) form.classList.remove('hidden')
        ; (urlEl as HTMLInputElement | null)?.focus()
      return
    }

    // Links: toggle preview
    const toggle = (e.target as HTMLElement).closest('.lnk-toggle-preview') as HTMLElement | null
    if (toggle) {
      const card = toggle.closest('.lnk-card') as HTMLElement | null
      const pv = card?.querySelector('.lnk-preview') as HTMLElement | null
      if (pv) pv.classList.toggle('hidden')
      return
    }
  })

  // Initialize markdown previews from storage and sync to current mode
  const mdMap = mdGetMap(pid)
  grid.querySelectorAll('.md-widget').forEach((wrap) => {
    const w = (wrap as HTMLElement).closest('.widget') as HTMLElement | null
    const id = w?.getAttribute('data-widget') || ''
    const preview = (wrap as HTMLElement).querySelector('.md-preview') as HTMLElement | null
    const txt = mdMap[id] || ''
    if (preview) preview.innerHTML = mdRenderToHtml(txt || 'ここにMarkdownを書いてください')
  })
  // Apply visibility (editor vs preview) per edit state
  try { syncMdWidgets(grid.getAttribute('data-edit') === '1') } catch { }

  // Auto-save markdown on input while in edit mode (with lightweight debounce)
  const mdTimers = new WeakMap<any, number>()
  grid.addEventListener('input', (e) => {
    const ta = (e.target as HTMLElement).closest('.md-text') as HTMLTextAreaElement | null
    if (!ta) return
    if (!isEdit()) return
    const w = (ta.closest('.widget') as HTMLElement | null)
    if (!w) return
    const id = w.getAttribute('data-widget') || ''
    const wrap = w.querySelector('.md-widget') as HTMLElement | null
    const preview = wrap?.querySelector('.md-preview') as HTMLElement | null
    const val = ta.value || ''
    const prevTimer = mdTimers.get(ta as any)
    if (prevTimer) { try { clearTimeout(prevTimer) } catch { } }
    const t = window.setTimeout(() => {
      mdSet(pid, id, val)
      if (preview) preview.innerHTML = mdRenderToHtml(val || 'ここにMarkdownを書いてください')
      // re-apply density scaling after re-render
      try {
        const cols = parseInt((w.getAttribute('data-cols') || '8'), 10)
        const rows = parseInt((w.getAttribute('data-rows') || '2'), 10)
        const area = Math.max(1, cols * rows)
        const scale = Math.max(0.9, Math.min(1.4, Math.sqrt(area / 16)))
        densifyMarkdown(w, scale)
      } catch { }
    }, 250)
    mdTimers.set(ta as any, t as any)
  })

  // Render task summary
  refreshDynamicWidgets(root, pid)
}

type WidgetSize = 'sm' | 'md' | 'lg'

type WidgetHeight = 'sm' | 'md' | 'lg'
type WidgetMeta = { size: WidgetSize; h?: WidgetHeight; type?: string; bg?: string }

function getWidgetMeta(pid: string): Record<string, WidgetMeta> {
  try { return JSON.parse(localStorage.getItem(`pj-widgets-meta-${pid}`) || '{}') as Record<string, WidgetMeta> } catch { return {} }
}

function setWidgetMeta(pid: string, meta: Record<string, WidgetMeta>): void {
  localStorage.setItem(`pj-widgets-meta-${pid}`, JSON.stringify(meta))
}

function setWidgetSize(root: HTMLElement, pid: string, id: string, size: WidgetSize): void {
  const meta = getWidgetMeta(pid)
  meta[id] = { ...(meta[id] || {}), size }
  setWidgetMeta(pid, meta)
  applyWidgetSizes(root, pid)
}

function setWidgetHeight(root: HTMLElement, pid: string, id: string, h: WidgetHeight): void {
  const meta = getWidgetMeta(pid)
  meta[id] = { ...(meta[id] || {}), h }
  setWidgetMeta(pid, meta)
  applyWidgetSizes(root, pid)
}

function applyWidgetSizes(root: HTMLElement, pid: string): void {
  const meta = getWidgetMeta(pid)
  root.querySelectorAll('.widget').forEach((w) => {
    const el = w as HTMLElement
    const id = el.getAttribute('data-widget') || ''

    // 新しい柔軟なサイズ指定（cols/rows）。既存S/M/Lは後方互換として使用。
    const fallbackSize = (meta[id]?.size || 'md') as 'sm' | 'md' | 'lg'
    const fallbackCols = fallbackSize === 'sm' ? 4 : fallbackSize === 'md' ? 8 : 12
    const fallbackH = (meta[id]?.h || 'md') as 'sm' | 'md' | 'lg'
    const fallbackRows = fallbackH === 'sm' ? 1 : fallbackH === 'md' ? 2 : 3
    const cols = Math.max(1, Math.min(12, (meta[id] as any)?.cols ?? fallbackCols))
    const rows = Math.max(1, Math.min(12, (meta[id] as any)?.rows ?? fallbackRows))

    // Tailwindのcol-spanクラスは使わない（inline styleで指定）
    el.classList.remove('md:col-span-4', 'md:col-span-6', 'md:col-span-8', 'md:col-span-12')
    el.style.gridColumn = `span ${cols} / span ${cols}`
    el.style.gridRow = `span ${rows} / span ${rows}`
    // expose current size for content adaptation
    el.setAttribute('data-cols', String(cols))
    el.setAttribute('data-rows', String(rows))

    // 背景色の適用
    const bg = meta[id]?.bg || ''
    el.style.background = bg

    // パディング行（下に固定の空行を確保）: 1行=12セルの不可視パッドを挿入（前方の穴埋めを抑止）
    try {
      const grid = root.querySelector('#widgetGrid') as HTMLElement | null
      if (!grid) return
      // Revert: remove any padding placeholders for this widget
      const sel = `[data-pad-for="${id}"]`
      Array.from(grid.querySelectorAll(sel)).forEach(n => n.remove())
    } catch { }
  })
  try { applyContentDensity(root, pid) } catch { }
  try { refreshContribLayout(root) } catch { }
}

// Adjust widget content density (font size, paddings) to use space efficiently
function applyContentDensity(root: HTMLElement, pid: string): void {
  const meta = getWidgetMeta(pid)
  root.querySelectorAll('.widget').forEach((w) => {
    const el = w as HTMLElement
    const id = el.getAttribute('data-widget') || ''
    const m = meta[id] || ({} as any)
    const type = (m as any).type || ''
    const cols = parseInt(el.getAttribute('data-cols') || '8', 10)
    const rows = parseInt(el.getAttribute('data-rows') || '2', 10)
    const area = Math.max(1, cols * rows)
    const baseArea = 16 // md default (8x2)
    let scale = Math.sqrt(area / baseArea)
    scale = Math.max(0.9, Math.min(1.4, scale))
    // Apply per-type strategies
    if (type === 'markdown') {
      densifyMarkdown(el, scale)
    } else if (type === 'readme') {
      densifyReadme(el, scale)
    } else if (type === 'tasksum') {
      densifyTaskSummary(el, scale)
    } else if (type === 'overview' || type === 'links' || type === 'milestones' || type === 'team' || type === 'todo' || type === 'progress') {
      densifyGeneric(el, scale)
    } else if (type === 'committers') {
      // committers widget adapts by height; just scale label text a bit
      densifyCommitters(el, scale)
    }
  })
}

function densifyMarkdown(widgetEl: HTMLElement, scale: number): void {
  const wrap = widgetEl.querySelector('.md-widget') as HTMLElement | null
  if (!wrap) return
  const preview = wrap.querySelector('.md-preview') as HTMLElement | null
  const editor = wrap.querySelector('.md-editor') as HTMLElement | null
  const ta = wrap.querySelector('.md-text') as HTMLTextAreaElement | null
  const base = 13
  const fs = Math.round(Math.max(12, Math.min(18, base * scale)))
  if (preview) { preview.style.fontSize = `${fs}px`; preview.style.lineHeight = '1.6' }
  if (ta) { ta.style.fontSize = `${fs}px`; ta.style.lineHeight = '1.6' }
  if (editor) { const pad = Math.round(8 * scale + 4); editor.style.padding = `${pad}px` }
  if (preview) scaleMarkdownHeadings(preview, fs)
}

function scaleMarkdownHeadings(container: HTMLElement, basePx: number): void {
  const set = (sel: string, mult: number) => {
    container.querySelectorAll(sel).forEach((n) => {
      (n as HTMLElement).style.fontSize = `${Math.round(basePx * mult)}px`
        ; (n as HTMLElement).style.lineHeight = '1.4'
        ; (n as HTMLElement).style.marginTop = '0.6em'
    })
  }
  set('h1', 1.6); set('h2', 1.4); set('h3', 1.25); set('h4', 1.15); set('h5', 1.05); set('h6', 0.95)
  container.querySelectorAll('code').forEach((n) => { (n as HTMLElement).style.fontSize = `${Math.round(basePx * 0.95)}px` })
  container.querySelectorAll('pre code').forEach((n) => { (n as HTMLElement).style.fontSize = `${Math.round(basePx * 0.95)}px` })
}

function densifyReadme(widgetEl: HTMLElement, scale: number): void {
  const el = widgetEl.querySelector('.whitespace-pre-wrap') as HTMLElement | null
  if (!el) return
  const base = 14
  const fs = Math.round(Math.max(12, Math.min(18, base * scale)))
  el.style.fontSize = `${fs}px`
  el.style.lineHeight = '1.7'
  scaleMarkdownHeadings(el, fs)
}

function densifyGeneric(widgetEl: HTMLElement, scale: number): void {
  const content = widgetEl.querySelector('.wg-content') as HTMLElement | null
  if (!content) return
  const base = 14
  const fs = Math.round(Math.max(12, Math.min(18, base * scale)))
  content.style.fontSize = `${fs}px`
  // upgrade typical small text classes if present
  const map: Record<string, number> = { 'text-xs': 12, 'text-sm': 14, 'text-base': 16 }
  Object.entries(map).forEach(([cls, px]) => {
    content.querySelectorAll(`.${cls}`).forEach((n) => {
      (n as HTMLElement).style.fontSize = `${Math.round((px) * (fs / base))}px`
    })
  })
}

function densifyCommitters(widgetEl: HTMLElement, scale: number): void {
  const labels = widgetEl.querySelectorAll('.wg-content div[class*="text-"]') as NodeListOf<HTMLElement>
  const base = 12
  const fs = Math.round(Math.max(10, Math.min(16, base * scale)))
  labels.forEach((n) => { n.style.fontSize = `${fs}px` })
}

function densifyTaskSummary(widgetEl: HTMLElement, scale: number): void {
  const content = widgetEl.querySelector('.wg-content') as HTMLElement | null
  const body = widgetEl.querySelector('.tasksum-body') as HTMLElement | null
  if (!body) return
  try { body.classList.add('h-full') } catch { }
  if (content) content.style.overflow = 'hidden'
  const grid = widgetEl.querySelector('.ts-grid') as HTMLElement | null
  const areaEl = (grid || body || content || widgetEl) as HTMLElement
  const rect = areaEl.getBoundingClientRect()
  const h = Math.max(1, rect.height || areaEl.clientHeight || 0)
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
  // Base sizes from available height; clamp to sensible bounds
  const labelPx = Math.round(clamp(h * 0.10, 12, 20))
  const countPx = Math.round(clamp(h * 0.32, 20, 56))
  const padPx = Math.round(clamp(h * 0.06, 8, 18))
  // Apply
  const labels = widgetEl.querySelectorAll('.tasksum-body .ts-label') as NodeListOf<HTMLElement>
  const counts = widgetEl.querySelectorAll('.tasksum-body .ts-count') as NodeListOf<HTMLElement>
  const stats = widgetEl.querySelectorAll('.tasksum-body .stat') as NodeListOf<HTMLElement>
  labels.forEach((n) => { n.style.fontSize = `${labelPx}px`; n.style.lineHeight = '1.2' })
  counts.forEach((n) => { n.style.fontSize = `${countPx}px`; n.style.lineHeight = '1.1' })
  stats.forEach((n) => { n.style.padding = `${padPx}px` })
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
      // Ensure edit-mode overlays match current state
      const on = grid.getAttribute('data-edit') === '1'
      const el = card as HTMLElement
      const delBtn = el.querySelector('.w-del') as HTMLElement | null
      const resHandles = el.querySelectorAll('.wg-rz') as NodeListOf<HTMLElement>
      const move = el.querySelector('.wg-move') as HTMLElement | null
      if (delBtn) delBtn.classList.toggle('hidden', !on)
      resHandles.forEach(h => h.classList.toggle('hidden', !on))
      if (move) move.classList.toggle('hidden', !on)
        // toggle edit-only elements within the new card
        ; (card as HTMLElement).querySelectorAll('.edit-only').forEach((el) => (el as HTMLElement).classList.toggle('hidden', !on))
      el.classList.toggle('border', on)
      el.classList.toggle('border-dashed', on)
      el.classList.toggle('border-amber-500/40', on)
    }
  })
}

function openWidgetPickerModal(root: HTMLElement, pid: string): void {
  const overlay = document.createElement('div')
  overlay.className = 'fixed inset-0 z-[66] bg-black/60 backdrop-blur-[1px] grid place-items-center fade-overlay'
  overlay.innerHTML = `
    <div class="relative w-[min(1200px,96vw)] overflow-hidden rounded-xl bg-neutral-900 ring-2 ring-neutral-600 shadow-2xl text-gray-100 pop-modal modal-fixed">
      <header class="h-12 flex items-center px-5 border-b border-neutral-600">
        <h3 class="text-lg font-semibold">ウィジェット一覧</h3>
        <button id="wp-close" class="ml-auto text-2xl text-neutral-300 hover:text-white">×</button>
      </header>
      <div class="flex h-[calc(86vh-3rem)]">
        <aside class="w-56 shrink-0 p-4 border-r border-neutral-600 space-y-2">
          <button class="wp-cat w-full text-left px-3 py-2 rounded bg-neutral-800/70 ring-2 ring-neutral-600 text-sm" data-cat="all">すべて</button>
          <button class="wp-cat w-full text-left px-3 py-2 rounded hover:bg-neutral-800/40 text-sm" data-cat="github">GitHub</button>
          <button class="wp-cat w-full text-left px-3 py-2 rounded hover:bg-neutral-800/40 text-sm" data-cat="text">テキスト</button>
          <button class="wp-cat w-full text-left px-3 py-2 rounded hover:bg-neutral-800/40 text-sm" data-cat="manage">管理</button>
        </aside>
        <section class="flex-1 p-8 overflow-y-auto h-full">
          <div id="wp-grid" class="grid grid-cols-3 lg:grid-cols-4 auto-rows-min gap-x-12 gap-y-10 min-h-[28rem]">
            ${widgetCard('readme', 'README表示')}
            ${widgetCard('contrib', 'コントリビューショングラフ')}
            ${widgetCard('committers', 'ユーザーコミットグラフ')}
            ${widgetCard('markdown', 'Markdownブロック')}
            ${widgetCard('tasksum', 'タスクサマリー')}
            ${widgetCard('links', 'クイックリンク')}
            ${widgetCard('calendar', 'カレンダー')}
            ${widgetCard('flow', 'ミニフロー')}
            ${widgetCard('clock', '時計')}
          </div>
        </section>
      </div>
    </div>
  `
  const close = () => { overlay.remove(); const c = +(document.body.getAttribute('data-lock') || '0'); const n = Math.max(0, c - 1); if (n === 0) { document.body.style.overflow = ''; } document.body.setAttribute('data-lock', String(n)) }
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
    if (['readme', 'contrib', 'committers'].includes(t)) return 'github'
    if (['markdown'].includes(t)) return 'text'
    if (['tasksum', 'links', 'calendar', 'clock', 'flow'].includes(t)) return 'manage'
    return 'other'
  }
  const applyCat = (cat: string) => {
    gridEl?.querySelectorAll('[data-widget-type]')?.forEach((n) => {
      const t = (n as HTMLElement).getAttribute('data-widget-type') || ''
        ; (n as HTMLElement).style.display = (cat === 'all' || getCat(t) === cat) ? '' : 'none'
    })
    cats.forEach((b) => {
      const on = (b as HTMLElement).getAttribute('data-cat') === cat
      b.classList.toggle('bg-neutral-800/70', on)
      b.classList.toggle('ring-2', on)
      b.classList.toggle('ring-neutral-600', on)
    })
  }
  cats.forEach((b) => b.addEventListener('click', () => applyCat((b as HTMLElement).getAttribute('data-cat') || 'all')))
  applyCat('all')
  document.body.appendChild(overlay); (function () { const c = +(document.body.getAttribute('data-lock') || '0'); if (c === 0) { document.body.style.overflow = 'hidden' } document.body.setAttribute('data-lock', String(c + 1)) })()
}

function widgetCard(type: string, title: string): string {
  return `
    <button type="button" data-widget-type="${type}" class="group block rounded-xl overflow-hidden ring-2 ring-neutral-600 hover:ring-emerald-600 transition pop-card btn-press">
      <div class="h-40 md:h-44 bg-neutral-800/80 grid place-items-center text-gray-300 relative px-2">
        ${widgetThumb(type)}
      </div>
      <div class="px-2 py-2 text-center text-sm font-medium">${title}</div>
    </button>
  `
}

function widgetThumb(type: string): string {
  // All class names are explicit to be kept by Tailwind JIT
  if (type === 'contrib') {
    const palette = ['bg-neutral-800', 'bg-emerald-900', 'bg-emerald-800', 'bg-emerald-700', 'bg-emerald-600']
    const cells = Array.from({ length: 210 }).map((_, i) => {
      const c = palette[i % palette.length]
      return `<div class="w-2 h-2 ${c} rounded-sm"></div>`
    }).join('')
    return `<div class="w-full h-24 overflow-hidden"><div class="grid grid-cols-12 gap-1">${cells}</div></div>`
  }
  if (type === 'overview') return `<div class="w-full h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded p-2"><div class="h-2 bg-neutral-700 rounded mb-2"><div class="h-2 bg-emerald-500 rounded w-2/3"></div></div><div class="h-2 bg-neutral-700 rounded w-1/2"></div></div>`
  if (type === 'committers') {
    const bars = ['h-6', 'h-10', 'h-14', 'h-8', 'h-5']
      .map((h) => `<div class="w-4 md:w-5 ${h} bg-emerald-500 rounded"></div>`)
      .join('')
    return `<div class="w-full h-24 flex items-end gap-1 px-2">${bars}</div>`
  }
  if (type === 'readme') return `<div class="w-full h-24 bg-neutral-900/60 ring-2 ring-neutral-600 rounded p-2 text-xs text-gray-300"># README\n- Getting Started\n- Usage</div>`
  if (type === 'markdown') return `<div class="w-full h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded p-2 text-xs text-gray-400">## Markdown\n- リスト\n- **強調**</div>`
  if (type === 'tasksum') return `<div class="w-full h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded p-2 grid grid-cols-3 gap-2 text-[10px] text-gray-300"><div class="rounded bg-neutral-800/60 p-1 text-center">TODO<br/><span class="text-emerald-400">5</span></div><div class="rounded bg-neutral-800/60 p-1 text-center">DOING<br/><span class="text-emerald-400">3</span></div><div class="rounded bg-neutral-800/60 p-1 text-center">DONE<br/><span class="text-emerald-400">8</span></div></div>`
  if (type === 'milestones') return `<div class="w-full h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded p-2 text-xs text-gray-400"><div>v1.0 リリース</div><div class="text-gray-500">2025-01-31</div></div>`
  if (type === 'links') return `<div class="w-full h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded p-2 text-xs text-gray-400">- PR一覧\n- 仕様書</div>`
  if (type === 'calendar') return `<div class="w-full h-24 bg-neutral-900/60 ring-2 ring-neutral-600 rounded p-2 text-xs text-gray-300 grid place-items-center">Googleカレンダー<br/>(埋め込みURL)</div>`
  if (type === 'clock') return `<div class="w-full h-24 bg-neutral-900/60 ring-2 ring-neutral-600 rounded grid place-items-center"><div class="text-2xl font-mono text-gray-200">12:34</div></div>`
  if (type === 'progress') return `<div class="w-full h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded p-2"><div class="h-2 bg-neutral-800 rounded"><div class="h-2 bg-emerald-600 rounded w-1/2"></div></div><div class="text-[10px] text-gray-400 mt-1">50%</div></div>`
  if (type === 'team') return `<div class="w-full h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded p-2 text-xs text-gray-400">👥 メンバー</div>`
  if (type === 'todo') return `<div class="w-full h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded p-2 text-xs text-gray-400">- [ ] 項目</div>`
  return `<div class="text-gray-400">Widget</div>`
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
    // ensure edit-only overlays visibility matches current edit state
    const on = grid.getAttribute('data-edit') === '1'
    const delBtn = (el as HTMLElement).querySelector('.w-del') as HTMLElement | null
    const resHandles = (el as HTMLElement).querySelectorAll('.wg-rz') as NodeListOf<HTMLElement>
    const move = (el as HTMLElement).querySelector('.wg-move') as HTMLElement | null
    if (delBtn) delBtn.classList.toggle('hidden', !on)
    resHandles.forEach(h => h.classList.toggle('hidden', !on))
    if (move) move.classList.toggle('hidden', !on)
    // if in edit mode, immediately apply edit visuals and drag
    if (on) {
      const card = el as HTMLElement
      card.setAttribute('draggable', 'true')
      card.classList.add('border', 'border-dashed', 'border-amber-500/40')
    }
    // Toggle any edit-only bits in this widget to match current edit mode
    ; (el as HTMLElement).querySelectorAll('.edit-only').forEach((n) => (n as HTMLElement).classList.toggle('hidden', !on))
    // If this is a markdown widget, initialize its view and sync to edit state
    if (type === 'markdown') {
      const card = el as HTMLElement
      const wrap = card.querySelector('.md-widget') as HTMLElement | null
      const preview = wrap?.querySelector('.md-preview') as HTMLElement | null
      const ta = wrap?.querySelector('.md-text') as HTMLTextAreaElement | null
      const idAttr = (card.getAttribute('data-widget') || '')
      const map = mdGetMap(pid)
      const txt = map[idAttr] || ''
      if (preview) preview.innerHTML = mdRenderToHtml(txt || 'ここにMarkdownを書いてください')
      if (on) {
        if (ta) ta.value = txt
        const ed = wrap?.querySelector('.md-editor') as HTMLElement | null
        ed?.classList.remove('hidden')
        if (preview) preview.classList.add('hidden')
      }
      const editBtn = wrap?.querySelector('.md-edit') as HTMLElement | null
      if (editBtn) editBtn.classList.add('hidden')
      const status = wrap?.querySelector('.md-status') as HTMLElement | null
      if (status) status.textContent = ''
    }
    // If this is a contributions widget, hydrate from cache/network
    if (type === 'contrib') {
      const host = root as HTMLElement
      const full = host.getAttribute('data-repo-full') || (document.querySelector('[data-repo-full]') as HTMLElement | null)?.getAttribute('data-repo-full') || ''
      if (full) { try { hydrateContribHeatmap(host, full) } catch { } }
    }
  }
  // refresh dynamic contents after adding
  try { refreshDynamicWidgets(root, pid) } catch { }
  // persist order
  const order = Array.from(grid.querySelectorAll('.widget')).map((w) => (w as HTMLElement).getAttribute('data-widget'))
  localStorage.setItem(`pj-widgets-${pid}`, JSON.stringify(order))
  // persist meta (size default M and type)
  const meta = getWidgetMeta(pid)
  meta[id] = { size: 'md', h: 'md', type }
  setWidgetMeta(pid, meta)
  // apply sizes and density for newly added widget
  try { applyWidgetSizes(root, pid) } catch { }
}

// ---- Quick Links helpers ----
function escHtml(s: string): string {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
function linkDomain(u: string): string {
  try { return new URL(u).host } catch { return '' }
}
function faviconSrc(u: string): string {
  const d = linkDomain(u)
  if (!d) return ''
  return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent('https://' + d)}`
}
function youTubeId(u: string): string | null {
  try {
    const url = new URL(u)
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1) || null
    if (url.hostname.includes('youtube.com')) return url.searchParams.get('v')
    return null
  } catch { return null }
}
function vimeoId(u: string): string | null {
  try {
    const url = new URL(u)
    if (url.hostname.includes('vimeo.com')) {
      const seg = url.pathname.split('/').filter(Boolean)
      return seg[0] || null
    }
    return null
  } catch { return null }
}
function loomId(u: string): string | null {
  try {
    const url = new URL(u)
    if (url.hostname.includes('loom.com')) {
      const seg = url.pathname.split('/').filter(Boolean)
      const i = seg.indexOf('share')
      return (i >= 0 && seg[i + 1]) ? seg[i + 1] : (seg[0] || null)
    }
    return null
  } catch { return null }
}
function figmaEmbed(u: string): string | null {
  try { const url = new URL(u); if (url.hostname.includes('figma.com')) return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(u)}`; return null } catch { return null }
}
function googleDocEmbed(u: string): string | null {
  try {
    const url = new URL(u)
    if (url.hostname.includes('docs.google.com') || url.hostname.includes('drive.google.com')) {
      const qp = url.search ? `${url.search}&embedded=true` : '?embedded=true'
      return `${url.origin}${url.pathname}${qp}${url.hash}`
    }
    return null
  } catch { return null }
}
function renderGenericFrame(url: string, full: boolean): string {
  try { new URL(url) } catch { return '' }
  const containerCls = full ? 'h-full min-h-[220px] overflow-hidden bg-neutral-900' : 'h-56 overflow-hidden rounded-md ring-1 ring-neutral-600 bg-neutral-900'
  const iframeCls = full ? 'w-full h-full' : 'w-full h-full'
  const safe = escHtml(url)
  // Use sandbox for safety; we do not need to access the content
  return `
    <div class=\"${containerCls} relative\">
      <div class=\"lnk-fb absolute inset-0 grid place-items-center text-center p-4 text-[12px] text-gray-400\">
        <div>
          <div class=\"mb-1\">埋め込みを読み込めない場合があります</div>
          <a href=\"${safe}\" target=\"_blank\" class=\"text-sky-400 hover:text-sky-300\">新しいタブで開く ↗</a>
        </div>
      </div>
      <iframe class=\"${iframeCls}\" src=\"${safe}\" sandbox=\"allow-scripts allow-same-origin allow-forms allow-popups\" referrerpolicy=\"no-referrer\" onload=\"try{this.previousElementSibling?.classList.add('hidden')}catch(e){}\"></iframe>
    </div>
  `
}
function renderLinkPreview(url: string, full: boolean = false): string {
  // Known providers
  const yt = youTubeId(url)
  if (yt) return full
    ? `<div class=\"h-full min-h-[220px] overflow-hidden bg-black\"><iframe class=\"w-full h-full\" src=\"https://www.youtube.com/embed/${escHtml(yt)}\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen></iframe></div>`
    : `<div class=\"aspect-video overflow-hidden rounded-md ring-1 ring-neutral-600 bg-black\"><iframe class=\"w-full h-full\" src=\"https://www.youtube.com/embed/${escHtml(yt)}\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen></iframe></div>`
  const vm = vimeoId(url)
  if (vm) return full
    ? `<div class=\"h-full min-h-[220px] overflow-hidden bg-black\"><iframe class=\"w-full h-full\" src=\"https://player.vimeo.com/video/${escHtml(vm)}\" allow=\"autoplay; fullscreen; picture-in-picture\" allowfullscreen></iframe></div>`
    : `<div class=\"aspect-video overflow-hidden rounded-md ring-1 ring-neutral-600 bg-black\"><iframe class=\"w-full h-full\" src=\"https://player.vimeo.com/video/${escHtml(vm)}\" allow=\"autoplay; fullscreen; picture-in-picture\" allowfullscreen></iframe></div>`
  const lm = loomId(url)
  if (lm) return full
    ? `<div class=\"h-full min-h-[220px] overflow-hidden bg-black\"><iframe class=\"w-full h-full\" src=\"https://www.loom.com/embed/${escHtml(lm)}\" allowfullscreen></iframe></div>`
    : `<div class=\"aspect-video overflow-hidden rounded-md ring-1 ring-neutral-600 bg-black\"><iframe class=\"w-full h-full\" src=\"https://www.loom.com/embed/${escHtml(lm)}\" allowfullscreen></iframe></div>`
  const fg = figmaEmbed(url)
  if (fg) return full
    ? `<div class=\"h-full min-h-[220px] overflow-hidden bg-neutral-900\"><iframe class=\"w-full h-full\" src=\"${escHtml(fg)}\" allowfullscreen></iframe></div>`
    : `<div class=\"aspect-video overflow-hidden rounded-md ring-1 ring-neutral-600 bg-neutral-900\"><iframe class=\"w-full h-full\" src=\"${escHtml(fg)}\" allowfullscreen></iframe></div>`
  const gd = googleDocEmbed(url)
  if (gd) return full
    ? `<div class=\"h-full min-h-[220px] overflow-hidden bg-neutral-900\"><iframe class=\"w-full h-full\" src=\"${escHtml(gd)}\"></iframe></div>`
    : `<div class=\"h-56 overflow-hidden rounded-md ring-1 ring-neutral-600 bg-neutral-900\"><iframe class=\"w-full h-full\" src=\"${escHtml(gd)}\"></iframe></div>`
  // GitHub lightweight card
  try {
    const u = new URL(url)
    if (u.hostname.includes('github.com')) {
      const path = u.pathname.replace(/^\/+/, '')
      return `<div class=\"rounded-md bg-neutral-900 ring-1 ring-neutral-700 p-3 text-xs\">GitHub: <span class=\"text-gray-300\">${escHtml(path || '')}</span></div>`
    }
  } catch { }
  // Generic iframe attempt as best-effort
  const gen = renderGenericFrame(url, full)
  if (gen) return gen
  // Fallback text
  return `<div class=\"rounded-md bg-neutral-900 ring-1 ring-neutral-700 p-6 text-xs text-gray-400 grid place-items-center\">プレビュー未対応</div>`
}
// OpenGraph/Twitter Card unfurl (server-assisted)
type LinkMeta = { url?: string; title?: string; description?: string; image?: string; site_name?: string; favicon?: string }
const UNFURL_TTL = 24 * 60 * 60 * 1000
function unfurlKey(url: string): string { return `unfurl-v1-${encodeURIComponent(url)}` }
function unfurlLoad(url: string): { meta: LinkMeta; ts: number } | null {
  try { const raw = localStorage.getItem(unfurlKey(url)); return raw ? JSON.parse(raw) : null } catch { return null }
}
function unfurlSave(url: string, meta: LinkMeta): void {
  try { localStorage.setItem(unfurlKey(url), JSON.stringify({ meta, ts: Date.now() })) } catch { }
}
async function unfurlFetch(url: string): Promise<LinkMeta | null> {
  try {
    const token = localStorage.getItem('apiToken')
    const res = await fetch(`/api/unfurl?url=${encodeURIComponent(url)}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
    if (!res.ok) return null
    const meta = await res.json() as LinkMeta
    return meta
  } catch { return null }
}
function renderUnfurlSkeleton(hero: boolean): string {
  if (hero) {
    return `
      <div class=\"h-full flex flex-col\">
        <div class=\"flex-1 min-h-[220px] bg-neutral-800/60\"></div>
        <div class=\"p-4 border-t border-neutral-700/60 bg-neutral-900/60\">
          <div class=\"h-4 w-2/3 bg-neutral-800 rounded mb-2\"></div>
          <div class=\"h-3 w-4/5 bg-neutral-800 rounded\"></div>
        </div>
      </div>
    `
  }
  return `
    <div>
      <div class=\"h-40 bg-neutral-800/60\"></div>
      <div class=\"p-3\">
        <div class=\"h-4 w-3/4 bg-neutral-800 rounded mb-1\"></div>
        <div class=\"h-3 w-5/6 bg-neutral-800 rounded\"></div>
      </div>
    </div>
  `
}
function renderUnfurlCard(meta: LinkMeta, url: string, hero: boolean): string {
  const u = escHtml((meta.url || url))
  const title = escHtml(meta.title || '')
  const desc = escHtml(meta.description || '')
  const site = escHtml(meta.site_name || linkDomain(url))
  const img = meta.image ? escHtml(meta.image) : ''
  const favicon = meta.favicon ? escHtml(meta.favicon) : ''
  const media = img ? `<img src=\"${img}\" alt=\"\" class=\"w-full ${hero ? 'h-full min-h-[220px]' : 'h-40'} object-cover bg-neutral-800\" loading=\"lazy\"/>` : `<div class=\"${hero ? 'h-full min-h-[220px]' : 'h-40'} bg-neutral-800/60\"></div>`
  if (hero) {
    return `
      <a href=\"${u}\" target=\"_blank\" class=\"block h-full flex flex-col\">
        <div class=\"flex-1\">${media}</div>
        <div class=\"px-4 py-3 border-t border-neutral-700/60 bg-neutral-900/60\">
          <div class=\"text-[15px] text-gray-100 font-medium truncate\">${title || u}</div>
          <div class=\"text-[12px] text-gray-400 mt-0.5 line-clamp-2\">${desc}</div>
          <div class=\"text-[11px] text-gray-400 mt-1 flex items-center gap-2\">${favicon ? `<img src=\"${favicon}\" class=\"w-4 h-4\"/>` : ''}<span class=\"inline-block px-1.5 py-0.5 rounded bg-neutral-800/70 ring-1 ring-neutral-700\">${site}</span></div>
        </div>
      </a>
    `
  }
  return `
    <a href=\"${u}\" target=\"_blank\" class=\"block\">
      ${media}
      <div class=\"p-3\">
        <div class=\"text-[15px] text-gray-100 font-medium truncate\">${title || u}</div>
        <div class=\"text-[12px] text-gray-400 mt-0.5 line-clamp-2\">${desc}</div>
        <div class=\"text-[11px] text-gray-400 mt-1 flex items-center gap-2\">${favicon ? `<img src=\"${favicon}\" class=\"w-4 h-4\"/>` : ''}<span class=\"inline-block px-1.5 py-0.5 rounded bg-neutral-800/70 ring-1 ring-neutral-700\">${site}</span></div>
      </div>
    </a>
  `
}
function renderSimpleTile(url: string, hero: boolean): string {
  const domain = escHtml(linkDomain(url))
  const safeUrl = escHtml(url)
  const inner = `
    <div class=\"p-4 md:p-5\">
      <div class=\"text-[16px] md:text-[17px] font-medium text-gray-100 truncate\">${domain || safeUrl}</div>
      <div class=\"text-[12px] text-gray-400 mt-1 truncate\">${safeUrl}</div>
    </div>
  `
  if (hero) return `<a href=\"${safeUrl}\" target=\"_blank\" class=\"block h-full rounded-xl ring-1 ring-neutral-600 bg-gradient-to-br from-neutral-900 to-neutral-800 hover:ring-neutral-500 transition-colors\">${inner}</a>`
  return `<a href=\"${safeUrl}\" target=\"_blank\" class=\"block rounded-xl ring-1 ring-neutral-600 bg-gradient-to-br from-neutral-900 to-neutral-800 hover:ring-neutral-500 transition-colors\">${inner}</a>`
}
function renderLinkCardsUnfurl(list: QuickLink[], edit: boolean): string {
  if (!list || list.length === 0) return '<p class="text-gray-400">リンクはまだありません。</p>'
  const l = list[0]
  const single = !edit // in single-link model, view mode is always hero when alone
  const title = escHtml(l.title || '')
  const url = escHtml(l.url)
  const domain = escHtml(linkDomain(l.url))
  const fav = faviconSrc(l.url)
  if (!edit) {
    const hero = single
    return `
      <div class=\"lnk-card lnk-unfurl ${hero ? 'h-full' : ''} rounded-xl ring-1 ring-neutral-600 bg-neutral-900/50 overflow-hidden\" data-url=\"${url}\" data-hero=\"${hero ? '1' : '0'}\">\
        <div class=\"lnk-body ${hero ? 'h-full' : ''}\">${renderUnfurlSkeleton(hero)}</div>\
      </div>
    `
  }
  // Edit mode: simple header + delete action, unfurl body below
  return `
    <div class=\"lnk-card lnk-unfurl rounded-xl ring-1 ring-neutral-600 bg-neutral-900/50 overflow-hidden\" data-url=\"${url}\" data-hero=\"0\">\
      <div class=\"flex items-start gap-3 p-3 edit-only\">\
        <img src=\"${fav}\" alt=\"\" class=\"w-5 h-5 mt-0.5 opacity-90\" onerror=\"this.style.display='none'\" />\
        <div class=\"min-w-0 flex-1\">\
          <div class=\"text-[15px] text-sky-400 font-medium truncate\">${title || url}</div>\
          <div class=\"text-[11px] text-gray-400 mt-0.5\"><span class=\"inline-block px-1.5 py-0.5 rounded bg-neutral-800/70 ring-1 ring-neutral-700\">${domain}</span></div>\
        </div>\
        <div class=\"edit-only flex items-center gap-2\">\
          <button class=\"lnk-edit text-xs px-2 py-0.5 rounded ring-2 ring-neutral-600 hover:bg-neutral-800\">変更</button>\
          <button class=\"lnk-del text-xs px-2 py-0.5 rounded ring-2 ring-rose-800 text-rose-200 hover:bg-rose-900/50\">削除</button>\
        </div>\
      </div>\
      <div class=\"lnk-body\">${renderUnfurlSkeleton(false)}</div>\
    </div>
  `
}

async function hydrateLinkCards(widget: HTMLElement): Promise<void> {
  const cards = widget.querySelectorAll('.lnk-card.lnk-unfurl[data-url]') as NodeListOf<HTMLElement>
  const token = localStorage.getItem('apiToken')
  for (const card of Array.from(cards)) {
    try {
      if (card.getAttribute('data-hydrated') === '1') continue
      card.setAttribute('data-hydrated', '1')
      const url = (card.getAttribute('data-url') || '').trim()
      const hero = card.getAttribute('data-hero') === '1'
      const body = card.querySelector('.lnk-body') as HTMLElement | null
      if (!url || !body) continue
      // cache
      let cached = unfurlLoad(url)
      let meta: LinkMeta | null = null
      if (cached && (Date.now() - (cached.ts || 0)) < UNFURL_TTL) {
        meta = cached.meta
      } else {
        meta = await unfurlFetch(url)
        if (meta) unfurlSave(url, meta)
      }
      if (meta) {
        body.innerHTML = renderUnfurlCard(meta, url, hero)
      } else {
        body.innerHTML = renderSimpleTile(url, hero)
      }
    } catch { }
  }
}
function renderLinkCards(list: QuickLink[], edit: boolean): string {
  if (!list || list.length === 0) return '<p class="text-gray-400">リンクはまだありません。</p>'
  const single = !edit && list.length === 1
  return list.map((l, idx) => {
    const title = escHtml(l.title || '')
    const url = escHtml(l.url)
    const domain = escHtml(linkDomain(l.url))
    const fav = faviconSrc(l.url)
    if (!edit) {
      const body = renderLinkPreview(l.url, single)
      if (single) {
        // Full-bleed single card uses entire widget height
        return `
          <div class=\"lnk-card h-full flex flex-col rounded-xl ring-1 ring-neutral-600 bg-neutral-900/50 overflow-hidden\">
            <div class=\"flex-1 min-h-[200px]\">${body}</div>
            <div class=\"px-4 py-3 border-t border-neutral-700/60 bg-neutral-900/60 flex items-center gap-2\">
              <img src=\"${fav}\" alt=\"\" class=\"w-4 h-4 opacity-90\" onerror=\"this.style.display='none'\" />
              <div class=\"min-w-0 flex-1\">
                <a href=\"${url}\" target=\"_blank\" class=\"text-[15px] text-sky-400 hover:text-sky-300 font-medium truncate inline-block max-w-full\">${title || url}</a>
                <div class=\"text-[11px] text-gray-400\">${domain}</div>
              </div>
              <span class=\"text-gray-500\">↗</span>
            </div>
          </div>
        `
      }
      return `
        <div class=\"lnk-card rounded-xl ring-1 ring-neutral-600 bg-neutral-900/50 overflow-hidden\">
          ${body}
        </div>
      `
    }
    const actions = edit ? `
      <div class=\"lnk-actions edit-only flex items-center gap-1 shrink-0\">
        <button class=\"lnk-toggle-preview text-xs px-2 py-0.5 rounded ring-2 ring-neutral-600 hover:bg-neutral-800\">プレビュー</button>
        <button class=\"lnk-del text-xs px-2 py-0.5 rounded ring-2 ring-rose-800 text-rose-200 hover:bg-rose-900/50\" data-idx=\"${idx}\">削除</button>
      </div>` : ''
    const previewCls = edit ? 'lnk-preview hidden mt-3' : 'lnk-preview mt-3'
    return `
      <div class=\"lnk-card rounded-xl ring-1 ring-neutral-600 bg-neutral-900/50 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset] hover:ring-neutral-500 transition-colors\">
        <div class=\"flex items-start gap-3\">
          <img src=\"${fav}\" alt=\"\" class=\"w-5 h-5 mt-0.5 opacity-90\" onerror=\"this.style.display='none'\" />
          <div class=\"min-w-0 flex-1\">
            <a href=\"${url}\" target=\"_blank\" class=\"text-[15px] text-sky-400 hover:text-sky-300 font-medium truncate inline-block max-w-full\">${title || url}</a>
            <div class=\"text-[11px] text-gray-400 mt-0.5\"><span class=\"inline-block px-1.5 py-0.5 rounded bg-neutral-800/70 ring-1 ring-neutral-700\">${domain}</span></div>
          </div>
          ${actions}
        </div>
        <div class=\"${previewCls}\">${renderLinkPreview(l.url)}</div>
      </div>
    `
  }).join('')
}

function refreshDynamicWidgets(root: HTMLElement, pid: string): void {
  // Task summary
  const meta = getWidgetMeta(pid)
  Object.entries(meta).forEach(([id, m]) => {
    const w = root.querySelector(`[data-widget="${id}"]`) as HTMLElement | null
    if (!w) return
    if (m.type === 'flow') {
      const box = w.querySelector('.flow-body') as HTMLElement | null
      const canvas = w.querySelector('.flow-canvas') as HTMLElement | null
      const svg = w.querySelector('.flow-svg') as SVGSVGElement | null
      if (box && canvas && svg) {
        const gridEl = w.closest('#widgetGrid') as HTMLElement | null
        const edit = gridEl?.getAttribute('data-edit') === '1'
        const g = flowLoad(pid, id)
        // clear
        canvas.innerHTML = ''
        const setDefs = () => { svg.innerHTML = '<defs><marker id="arr" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#34d399"/></marker></defs>' }
        setDefs()

        // helpers
        const portSize = 8
        const createNodeEl = (n: FlowNode): HTMLElement => {
          const el = document.createElement('div')
          el.className = 'flow-node absolute rounded-lg ring-2 ring-neutral-600 bg-neutral-800/80 shadow-sm select-none'
          el.style.left = `${n.x}px`; el.style.top = `${n.y}px`; el.style.width = '160px'
          el.setAttribute('data-node', n.id)
          const headCls = n.kind === 'trigger' ? 'bg-emerald-700' : 'bg-sky-700'
          const title = n.label || (n.kind === 'trigger' ? (n.type === 'timer' ? 'Timer' : 'Manual Trigger') : (n.type === 'webhook' ? 'Webhook' : (n.type === 'github_issue' ? 'GitHub Issue' : 'Notify')))
          el.innerHTML = `
            <div class="fn-head ${headCls} text-white text-[11px] px-2 py-1 flex items-center justify-between cursor-move gap-1">
              <span class="truncate">${title}</span>
              <span class="flex items-center gap-1">
                ${n.kind === 'trigger' ? '<button class="fn-run text-white/90 hover:text-white" title="このトリガーを実行">▶</button>' : ''}
                ${edit ? '<button class="fn-gear text-white/90 hover:text-white" title="設定">⚙</button>' : ''}
                ${edit ? '<button class="fn-del text-white/90 hover:text-white" title="削除">×</button>' : ''}
              </span>
            </div>
            <div class="fn-body px-2 py-2 text-xs text-gray-300 min-h-[40px]"></div>
            <div class="fn-ports">
              ${n.kind !== 'trigger' ? `<div class=\"port-in absolute -top-1 left-1/2 -translate-x-1/2 rounded-full ring-2 ring-neutral-500\" style=\"width:${portSize}px;height:${portSize}px;background:#38bdf8\"></div>` : ''}
              <div class="port-out absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full ring-2 ring-neutral-500" style="width:${portSize}px; height:${portSize}px; background:#34d399"></div>
            </div>
          `
          // body content (type + basic cfg)
          const body = el.querySelector('.fn-body') as HTMLElement | null
          if (body) {
            const typeSel = edit ? `<select class=\"fn-type rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100\">${(n.kind==='trigger'?
              ['manual','timer'] : ['notify','webhook','github_issue']).map(t=>`<option value=\"${t}\" ${t===n.type?'selected':''}>${t}</option>`).join('')}</select>` : `<span class=\"text-gray-400\">${n.type}</span>`
            let cfgHtml = ''
            const cfg = n.cfg || {}
            if (n.kind === 'trigger') {
              if (n.type === 'timer') {
                const iv = Number(cfg.intervalSec || 60)
                cfgHtml = `<div class=\"mt-1\"><label class=\"text-gray-400\">間隔(s)</label> ${edit?`<input class=\"fn-iv ml-1 w-20 rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-0.5 text-gray-100\" type=\"number\" min=\"1\" value=\"${iv}\"/>`:`<span class=\"ml-1\">${iv}</span>`}</div>`
              }
            } else {
              if (n.type === 'notify') {
                const msg = String(cfg.message ?? '処理が完了しました')
                cfgHtml = `<div class=\"mt-1\"><label class=\"text-gray-400\">メッセージ</label> ${edit?`<input class=\"fn-msg ml-1 w-full rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-0.5 text-gray-100\" value=\"${msg.replace(/"/g,'&quot;')}\"/>`:`<span class=\"ml-1\">${msg}</span>`}</div>`
              } else if (n.type === 'webhook') {
                const url = String(cfg.url ?? '')
                const method = String(cfg.method ?? 'POST')
                const payload = String(cfg.payload ?? '{"hello":"world"}')
                cfgHtml = edit?`<div class=\"space-y-1\">
                  <div><label class=\"text-gray-400\">URL</label> <input class=\"fn-url ml-1 w-full rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-0.5 text-gray-100\" placeholder=\"https://...\" value=\"${url.replace(/"/g,'&quot;')}\"/></div>
                  <div><label class=\"text-gray-400\">Method</label> <select class=\"fn-method ml-1 rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-0.5 text-gray-100\"><option ${method==='POST'?'selected':''}>POST</option><option ${method==='GET'?'selected':''}>GET</option></select></div>
                  <div><label class=\"text-gray-400\">Payload</label><textarea class=\"fn-payload mt-1 w-full rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100\" rows=\"3\">${payload.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea></div>
                </div>`:`<div class=\"text-gray-400\">${method} ${url || '(未設定)'} </div>`
              } else if (n.type === 'github_issue') {
                const title = String(cfg.title ?? 'New task')
                const bodyTxt = String(cfg.body ?? 'Flowから作成')
                const status = String(cfg.status ?? 'todo')
                cfgHtml = edit?`<div class=\"space-y-1\">
                  <div><label class=\"text-gray-400\">タイトル</label> <input class=\"fn-gi-title ml-1 w-full rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-0.5 text-gray-100\" value=\"${title.replace(/"/g,'&quot;')}\"/></div>
                  <div><label class=\"text-gray-400\">本文</label><textarea class=\"fn-gi-body mt-1 w-full rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100\" rows=\"3\">${bodyTxt.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea></div>
                  <div><label class=\"text-gray-400\">ステータス</label> <select class=\"fn-gi-status ml-1 rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-0.5 text-gray-100\"><option ${status==='todo'?'selected':''} value=\"todo\">todo</option><option ${status==='doing'?'selected':''} value=\"doing\">doing</option><option ${status==='review'?'selected':''} value=\"review\">review</option><option ${status==='done'?'selected':''} value=\"done\">done</option></select></div>
                </div>`:`<div class=\"text-gray-400\">${title}</div>`
              }
            }
            body.innerHTML = `<div class=\"flex items-center gap-2\">${typeSel}${n.kind==='trigger' && n.type==='manual' && edit?'<span class=\"text-gray-400\">（クリックで実行）</span>':''}</div>${cfgHtml}`
          }
          return el
        }

        // render nodes
        g.nodes.forEach(n => {
          const el = createNodeEl(n)
          canvas.appendChild(el)
        })

        // draw edges
        const getCenter = (nodeId: string, which: 'in' | 'out'): { x: number; y: number } | null => {
          const nodeEl = canvas.querySelector(`[data-node="${nodeId}"]`) as HTMLElement | null
          if (!nodeEl) return null
          const r = nodeEl.getBoundingClientRect()
          const base = box.getBoundingClientRect()
          if (which === 'out') return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height }
          return { x: r.left - base.left + r.width / 2, y: r.top - base.top }
        }
        const mkPath = (a: {x:number;y:number}, b: {x:number;y:number}) => {
          const dx = (b.x - a.x) * 0.5
          const c1x = a.x; const c1y = a.y + Math.max(10, Math.abs(dx)) * 0.15
          const c2x = b.x; const c2y = b.y - Math.max(10, Math.abs(dx)) * 0.15
          return `M ${a.x} ${a.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${b.x} ${b.y}`
        }
        const renderEdges = () => {
          setDefs()
          g.edges.forEach(e => {
            const a = getCenter(e.from, 'out'); const b = getCenter(e.to, 'in')
            if (!a || !b) return
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
            p.setAttribute('d', mkPath(a, b)); p.setAttribute('stroke', '#34d399'); p.setAttribute('stroke-width', '2')
            p.setAttribute('fill', 'none'); p.setAttribute('marker-end', 'url(#arr)')
            svg.appendChild(p)
          })
        }
        renderEdges()

        // edit interactions
        const saveAndRefresh = () => { flowSave(pid, id, g); try { refreshDynamicWidgets(root, pid) } catch {} }
        const runFrom = async (startId: string) => {
          const logEl = w.querySelector('.flow-log') as HTMLElement | null
          const appendLog = (s: string) => { if (logEl) { const p = document.createElement('div'); p.textContent = `[${new Date().toLocaleTimeString()}] ${s}`; logEl.appendChild(p); logEl.scrollTop = logEl.scrollHeight } }
          const repo = (root as HTMLElement).getAttribute('data-repo-full') || ''
          const visit = async (nid: string, depth = 0, seen = new Set<string>()) => {
            if (depth > 64 || seen.has(nid)) return; seen.add(nid)
            const outs = g.edges.filter(e => e.from === nid)
            for (const e of outs) {
              const n = g.nodes.find(x => x.id === e.to); if (!n) continue
              if (n.kind === 'action') {
                try {
                  if (n.type === 'notify') {
                    const msg = String((n.cfg?.message) ?? '処理が完了しました')
                    appendLog(`通知: ${msg}`)
                  } else if (n.type === 'webhook') {
                    const url = String(n.cfg?.url || '')
                    const method = String(n.cfg?.method || 'POST').toUpperCase()
                    const payload = String(n.cfg?.payload || '{}')
                    if (!url) appendLog('Webhook URL未設定'); else {
                      try {
                        const init: RequestInit = { method }
                        if (method !== 'GET') { init.headers = { 'Content-Type': 'application/json' }; init.body = payload }
                        const res = await fetch(url, init)
                        appendLog(`Webhook ${res.ok ? 'OK' : 'NG'} (${res.status})`)
                      } catch (er) { appendLog('Webhook エラー') }
                    }
                  } else if (n.type === 'github_issue') {
                    if (!repo) { appendLog('GitHub未連携のためIssue作成不可'); }
                    const title = String(n.cfg?.title || 'New task')
                    const body = String(n.cfg?.body || '')
                    const status = String(n.cfg?.status || 'todo') as 'todo'|'doing'|'review'|'done'
                    try {
                      await apiFetch(`/projects/${pid}/issues`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body, status, labels: [] }) })
                      appendLog('GitHub Issueを作成しました')
                    } catch { appendLog('GitHub Issue作成に失敗しました') }
                  }
                } catch (er) { appendLog('アクション実行でエラー') }
              }
              await visit(n.id, depth + 1, seen)
            }
          }
          await visit(startId)
        }
        if (edit) {
          // drag nodes
          canvas.querySelectorAll('.flow-node').forEach((nEl) => {
            const el = nEl as HTMLElement
            const head = el.querySelector('.fn-head') as HTMLElement | null
            const idN = el.getAttribute('data-node') || ''
            head?.addEventListener('mousedown', (ev) => {
              ev.preventDefault()
              const n = g.nodes.find(x => x.id === idN); if (!n) return
              const base = box.getBoundingClientRect(); const r = el.getBoundingClientRect()
              const offX = (ev as MouseEvent).clientX - r.left; const offY = (ev as MouseEvent).clientY - r.top
              const onMove = (e: MouseEvent) => {
                n.x = Math.max(0, Math.min(base.width - r.width, e.clientX - base.left - offX))
                n.y = Math.max(0, Math.min(base.height - r.height, e.clientY - base.top - offY))
                el.style.left = `${n.x}px`; el.style.top = `${n.y}px`
                // redraw edges live
                renderEdges()
              }
              const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); saveAndRefresh() }
              window.addEventListener('mousemove', onMove)
              window.addEventListener('mouseup', onUp)
            })
            const del = el.querySelector('.fn-del') as HTMLElement | null
            del?.addEventListener('click', () => {
              const idx = g.nodes.findIndex(x => x.id === idN); if (idx >= 0) g.nodes.splice(idx, 1)
              g.edges = g.edges.filter(e => e.from !== idN && e.to !== idN)
              saveAndRefresh()
            })
            const gear = el.querySelector('.fn-gear') as HTMLElement | null
            gear?.addEventListener('click', () => {
              // Toggle node type on select change and save cfg inputs
              const node = g.nodes.find(x => x.id === idN); if (!node) return
              const typeSel = el.querySelector('.fn-type') as HTMLSelectElement | null
              typeSel?.addEventListener('change', () => {
                node.type = typeSel.value as any
                if (node.kind === 'trigger' && node.type === 'timer') { node.cfg = { ...(node.cfg||{}), intervalSec: Number(node.cfg?.intervalSec || 60) } }
                if (node.kind === 'action' && node.type === 'notify') { node.cfg = { ...(node.cfg||{}), message: String(node.cfg?.message || '処理が完了しました') } }
                if (node.kind === 'action' && node.type === 'webhook') { node.cfg = { ...(node.cfg||{}), url: String(node.cfg?.url || ''), method: String(node.cfg?.method || 'POST'), payload: String(node.cfg?.payload || '{"hello":"world"}') } }
                if (node.kind === 'action' && node.type === 'github_issue') { node.cfg = { ...(node.cfg||{}), title: String(node.cfg?.title || 'New task'), body: String(node.cfg?.body || ''), status: String(node.cfg?.status || 'todo') } }
                saveAndRefresh()
              })
              const iv = el.querySelector('.fn-iv') as HTMLInputElement | null
              iv?.addEventListener('change', () => { const n = g.nodes.find(x => x.id === idN); if (!n) return; n.cfg = { ...(n.cfg||{}), intervalSec: Math.max(1, Number(iv.value||'0')) }; saveAndRefresh() })
              const msg = el.querySelector('.fn-msg') as HTMLInputElement | null
              msg?.addEventListener('change', () => { const n = g.nodes.find(x => x.id === idN); if (!n) return; n.cfg = { ...(n.cfg||{}), message: msg.value }; flowSave(pid, id, g) })
              const url = el.querySelector('.fn-url') as HTMLInputElement | null
              const method = el.querySelector('.fn-method') as HTMLSelectElement | null
              const pl = el.querySelector('.fn-payload') as HTMLTextAreaElement | null
              url?.addEventListener('change', () => { const n = g.nodes.find(x => x.id === idN); if (!n) return; n.cfg = { ...(n.cfg||{}), url: url.value }; flowSave(pid, id, g) })
              method?.addEventListener('change', () => { const n = g.nodes.find(x => x.id === idN); if (!n) return; n.cfg = { ...(n.cfg||{}), method: method.value }; flowSave(pid, id, g) })
              pl?.addEventListener('change', () => { const n = g.nodes.find(x => x.id === idN); if (!n) return; n.cfg = { ...(n.cfg||{}), payload: pl.value }; flowSave(pid, id, g) })
              const giTitle = el.querySelector('.fn-gi-title') as HTMLInputElement | null
              const giBody = el.querySelector('.fn-gi-body') as HTMLTextAreaElement | null
              const giSt = el.querySelector('.fn-gi-status') as HTMLSelectElement | null
              giTitle?.addEventListener('change', () => { const n = g.nodes.find(x => x.id === idN); if (!n) return; n.cfg = { ...(n.cfg||{}), title: giTitle.value }; flowSave(pid, id, g) })
              giBody?.addEventListener('change', () => { const n = g.nodes.find(x => x.id === idN); if (!n) return; n.cfg = { ...(n.cfg||{}), body: giBody.value }; flowSave(pid, id, g) })
              giSt?.addEventListener('change', () => { const n = g.nodes.find(x => x.id === idN); if (!n) return; n.cfg = { ...(n.cfg||{}), status: giSt.value }; flowSave(pid, id, g) })
            })
            const runBtn = el.querySelector('.fn-run') as HTMLElement | null
            runBtn?.addEventListener('click', () => { runFrom(idN) })
          })
          // connect by clicking out then in
          let pending: string | null = null
          canvas.querySelectorAll('.flow-node .port-out').forEach((po) => {
            po.addEventListener('click', (e) => {
              const n = (po.closest('.flow-node') as HTMLElement | null)?.getAttribute('data-node') || ''
              pending = n
              e.stopPropagation()
            })
          })
          canvas.querySelectorAll('.flow-node .port-in').forEach((pi) => {
            pi.addEventListener('click', () => {
              if (!pending) return
              const to = (pi.closest('.flow-node') as HTMLElement | null)?.getAttribute('data-node') || ''
              if (!to || to === pending) { pending = null; return }
              const dst = g.nodes.find(x => x.id === to)
              const src = g.nodes.find(x => x.id === pending)
              if (!dst || !src || dst.kind === 'trigger') { pending = null; return }
              // prevent duplicate
              if (!g.edges.find(e => e.from === pending && e.to === to)) g.edges.push({ from: pending, to })
              pending = null; saveAndRefresh()
            })
          })
          // allow deleting edges by clicking them in edit mode
          svg.querySelectorAll('path').forEach((p, idx) => {
            (p as SVGPathElement).style.pointerEvents = 'auto'
            p.addEventListener('click', () => {
              g.edges.splice(idx, 1); saveAndRefresh()
            })
          })
          // palette actions
          const addTrigger = w.querySelector('.flow-add-tr') as HTMLElement | null
          const addAction = w.querySelector('.flow-add-ac') as HTMLElement | null
          const clearBtn = w.querySelector('.flow-clear') as HTMLElement | null
          addTrigger?.addEventListener('click', () => {
            g.nodes.push({ id: `n-${Date.now()}`, kind: 'trigger', type: 'manual', x: 24, y: 24, label: 'Manual Trigger' }); saveAndRefresh()
          })
          addAction?.addEventListener('click', () => {
            g.nodes.push({ id: `n-${Date.now()}`, kind: 'action', type: 'notify', x: 220, y: 140, label: 'Notify' }); saveAndRefresh()
          })
          clearBtn?.addEventListener('click', () => {
            g.nodes = []; g.edges = []; saveAndRefresh()
          })
        }
        // run (view or edit both allowed)
        const logEl = w.querySelector('.flow-log') as HTMLElement | null
        const runBtn = w.querySelector('.flow-run') as HTMLElement | null
        const appendLog = (s: string) => { if (logEl) { const p = document.createElement('div'); p.textContent = `[${new Date().toLocaleTimeString()}] ${s}`; logEl.appendChild(p); logEl.scrollTop = logEl.scrollHeight } }
        runBtn?.addEventListener('click', async () => {
          const triggers = g.nodes.filter(n => n.kind === 'trigger')
          if (triggers.length === 0) { appendLog('トリガーがありません'); return }
          for (const t of triggers) { appendLog(`トリガー: ${t.label || t.type}`); await runFrom(t.id) }
        })

        // Schedule timers in view mode
        const timerKey = `${pid}:${id}`
        if (!edit) {
          // clear existing timers for this widget
          const ex = flowTimers.get(timerKey)
          if (ex) { for (const tid of ex.values()) { try { clearInterval(tid) } catch {} } flowTimers.delete(timerKey) }
          const map = new Map<string, number>()
          for (const n of g.nodes) {
            if (n.kind === 'trigger' && n.type === 'timer') {
              const iv = Math.max(1, Number(n.cfg?.intervalSec || 60))
              const tid = window.setInterval(() => { runFrom(n.id) }, iv * 1000)
              map.set(n.id, tid as unknown as number)
            }
          }
          if (map.size > 0) flowTimers.set(timerKey, map)
        } else {
          // in edit mode, clear timers to avoid background runs
          const ex = flowTimers.get(timerKey)
          if (ex) { for (const tid of ex.values()) { try { clearInterval(tid) } catch {} } flowTimers.delete(timerKey) }
        }
      }
    }
    if (m.type === 'clock') {
      const box = w.querySelector('.clock-body') as HTMLElement | null
      if (box) {
        const key = `${pid}:${id}`
        const prev = clockTimers.get(key)
        if (prev) { try { clearInterval(prev) } catch {} clockTimers.delete(key) }
        const mode = clockGet(pid, id)
        let doFit: (() => void) | null = null
        const render = () => {
          const rect = box.getBoundingClientRect()
          const size = Math.max(50, Math.min(rect.width, rect.height))
          if (mode === 'digital') {
            // Initial DOM for digital; sizes will be calculated precisely below
            box.innerHTML = `<div class=\"clk-digital font-mono font-semibold\" style=\"line-height:1; letter-spacing:0px; white-space:nowrap;\"></div><div class=\"clk-date mt-2 text-gray-400\"></div>`
            // Prepare a hidden measure element to fit text within box
            let meas = box.querySelector('.clk-measure') as HTMLElement | null
            if (!meas) {
              meas = document.createElement('span')
              meas.className = 'clk-measure'
              meas.style.position = 'absolute'; meas.style.visibility = 'hidden'; meas.style.whiteSpace = 'nowrap'; meas.style.letterSpacing = '0px'
              meas.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
              meas.style.fontWeight = '600'
              meas.style.pointerEvents = 'none'; meas.style.opacity = '0';
              meas.textContent = '88:88'
              box.appendChild(meas)
            }
            doFit = () => {
              const bw = box.clientWidth - 16
              const bh = box.clientHeight - 16
              let lo = 8, hi = Math.max(12, Math.floor(size))
              // Binary search for the largest font-size that fits width and total height (time + spacing + date)
              for (let i = 0; i < 14; i++) {
                const mid = Math.floor((lo + hi) / 2)
                const dateFs = Math.max(12, Math.floor(mid * 0.33))
                meas!.style.fontSize = `${mid}px`
                const mw = meas!.offsetWidth
                const totalH = mid + 8 + dateFs
                if (mw <= bw && totalH <= bh) lo = mid; else hi = mid - 1
                if (hi < lo) break
              }
              const timeFs = lo
              const dateFs = Math.max(12, Math.floor(timeFs * 0.33))
              const t = box.querySelector('.clk-digital') as HTMLElement | null
              const d = box.querySelector('.clk-date') as HTMLElement | null
              if (t) t.style.fontSize = `${timeFs}px`
              if (d) d.style.fontSize = `${dateFs}px`
            }
            doFit()
          } else {
            const svgSize = Math.floor(size * 0.95)
            const nums = Array.from({ length: 12 }).map((_, i) => {
              const n = i + 1; const a = n * 30; const rad = a * Math.PI / 180; const rx = 50 + Math.sin(rad) * 36; const ry = 50 - Math.cos(rad) * 36; return `<text x=\"${rx.toFixed(1)}\" y=\"${(ry + 3).toFixed(1)}\" text-anchor=\"middle\" fill=\"var(--clk-major)\" font-size=\"8\">${n}</text>`
            }).join('')
            // Use CSS variables so it adapts to theme instantly
            box.innerHTML = `
              <div class=\"clk-analog\" style=\"--clk-face: var(--gh-canvas); --clk-border: var(--gh-border); --clk-major: var(--gh-contrast); --clk-minor: var(--gh-muted); --clk-sec: var(--gh-accent); color: var(--gh-contrast);\">
                <svg viewBox=\"0 0 100 100\" width=\"${svgSize}\" height=\"${svgSize}\">
                  <circle cx=\"50\" cy=\"50\" r=\"48\" fill=\"var(--clk-face)\" stroke=\"var(--clk-border)\" stroke-width=\"2\" />
                  ${Array.from({ length: 60 }).map((_, i) => {
                    const a = i * 6; const rad = a * Math.PI / 180; const r1 = i % 5 === 0 ? 41 : 44; const r2 = 46; const x1 = 50 + Math.sin(rad) * r1; const y1 = 50 - Math.cos(rad) * r1; const x2 = 50 + Math.sin(rad) * r2; const y2 = 50 - Math.cos(rad) * r2; const sw = i % 5 === 0 ? 2 : 1; const col = i % 5 === 0 ? 'var(--clk-minor)' : 'var(--clk-border)';
                    return `<line x1=\"${x1.toFixed(1)}\" y1=\"${y1.toFixed(1)}\" x2=\"${x2.toFixed(1)}\" y2=\"${y2.toFixed(1)}\" stroke=\"${col}\" stroke-width=\"${sw}\" />`
                  }).join('')}
                  ${nums}
                  <line id=\"clk-h\" x1=\"50\" y1=\"50\" x2=\"50\" y2=\"32\" stroke=\"var(--clk-major)\" stroke-width=\"3.5\" stroke-linecap=\"round\" />
                  <line id=\"clk-m\" x1=\"50\" y1=\"50\" x2=\"50\" y2=\"22\" stroke=\"var(--clk-minor)\" stroke-width=\"2.5\" stroke-linecap=\"round\" />
                  <line id=\"clk-s\" x1=\"50\" y1=\"50\" x2=\"50\" y2=\"18\" stroke=\"var(--clk-sec)\" stroke-width=\"1.5\" stroke-linecap=\"round\" />
                  <circle cx=\"50\" cy=\"50\" r=\"2.5\" fill=\"var(--clk-major)\" />
                </svg>
              </div>`
          }
        }
        render()
        const tick = () => {
          const now = new Date()
          if (mode === 'digital') {
            const hh = String(now.getHours()).padStart(2, '0')
            const mm = String(now.getMinutes()).padStart(2, '0')
            const d = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
            const t = box.querySelector('.clk-digital') as HTMLElement | null
            const dt = box.querySelector('.clk-date') as HTMLElement | null
            if (t) { t.textContent = `${hh}:${mm}` }
            if (dt) { dt.textContent = d }
            // Refit in case of size changes
            try { doFit && doFit() } catch {}
          } else {
            const s = now.getSeconds(); const m = now.getMinutes(); const h = now.getHours()%12 + m/60
            const aS = s * 6
            const aM = m * 6 + s * 0.1
            const aH = h * 30
            const hEl = box.querySelector('#clk-h') as SVGElement | null
            const mEl = box.querySelector('#clk-m') as SVGElement | null
            const sEl = box.querySelector('#clk-s') as SVGElement | null
            if (hEl) hEl.setAttribute('transform', `rotate(${aH},50,50)`)
            if (mEl) mEl.setAttribute('transform', `rotate(${aM},50,50)`)
            if (sEl) sEl.setAttribute('transform', `rotate(${aS},50,50)`)
          }
        }
        tick()
        const tid = window.setInterval(tick, 1000)
        clockTimers.set(key, tid as unknown as number)
        const sel = w.querySelector('.clk-mode') as HTMLSelectElement | null
        if (sel) {
          sel.value = mode
          sel.addEventListener('change', () => {
            const val = sel.value === 'analog' ? 'analog' : 'digital'
            clockSet(pid, id, val)
            try { refreshDynamicWidgets(root, pid) } catch {}
          })
        }
      }
    }
    if (m.type === 'tasksum') {
      const box = w.querySelector('.tasksum-body') as HTMLElement | null
      if (box) {
        const render = (counts: Record<string, number>) => {
          box.innerHTML = `
            <div class="ts-grid h-full grid grid-cols-2 md:grid-cols-4 grid-rows-2 md:grid-rows-1 gap-2 md:gap-3 place-items-stretch">
              ${[['todo', 'TODO'], ['doing', 'DOING'], ['review', 'REVIEW'], ['done', 'DONE']]
              .map(([k, label]) => `
                  <div class=\"stat h-full rounded ring-2 ring-neutral-600 bg-neutral-800/40 p-2 md:p-3 flex flex-col items-center justify-center\">\
                    <div class=\"ts-label text-center text-gray-300\">${label}</div>\
                    <div class=\"ts-count text-emerald-400 font-semibold mt-1\">${counts[k] || 0}</div>\
                  </div>
                `).join('')}
            </div>
          `
          try { densifyTaskSummary(w, 1) } catch { }
        }
        // Start with local tasks immediately
        const local = loadTasks(pid)
        const base = { todo: 0, doing: 0, review: 0, done: 0 } as Record<string, number>
        local.forEach(t => base[t.status] = (base[t.status] || 0) + 1)
        render(base)
        // If GitHub linked, merge issues just like Kanban and update
        const host = root as HTMLElement
        const full = host.getAttribute('data-repo-full') || (document.querySelector('[data-repo-full]') as HTMLElement | null)?.getAttribute('data-repo-full') || ''
        if (full) {
          ; (async () => {
            try {
              const issues = await apiFetch<any[]>(`/projects/${pid}/issues?state=all`)
              const ghTasks = (issues || []).map((it) => {
                const labels: string[] = (it as any).labels || []
                const lane = labels.find((l) => typeof l === 'string' && l.startsWith('kanban:'))?.split(':')[1] || (it.state === 'closed' ? 'done' : 'todo')
                const st = (lane === 'todo' || lane === 'doing' || lane === 'review' || lane === 'done') ? lane : (it.state === 'closed' ? 'done' : 'todo')
                return { id: `gh-${it.number}`, status: st as 'todo' | 'doing' | 'review' | 'done' }
              })
              const mergedCounts = { todo: 0, doing: 0, review: 0, done: 0 } as Record<string, number>
              // include GH
              ghTasks.forEach(t => mergedCounts[t.status] = (mergedCounts[t.status] || 0) + 1)
              // include local, excluding gh-* duplicates by id pattern
              local.filter(t => !String(t.id).startsWith('gh-')).forEach(t => mergedCounts[t.status] = (mergedCounts[t.status] || 0) + 1)
              render(mergedCounts)
            } catch { /* ignore fetch errors */ }
          })()
        }
      }
    }
    if (m.type === 'links') {
      const box = w.querySelector('.links-body') as HTMLElement | null
      if (box) {
        const links = mdGetLinks(pid, id)
        const gridEl = w.closest('#widgetGrid') as HTMLElement | null
        const edit = gridEl?.getAttribute('data-edit') === '1'
        const form = w.querySelector('.lnk-form') as HTMLElement | null
        const addBtn = w.querySelector('.lnk-add') as HTMLElement | null
        if (edit) {
          // Edit mode: show only the input area (hide preview area completely)
          box.innerHTML = ''
          box.classList.add('hidden')
          if (addBtn) addBtn.classList.add('hidden')
          if (form) {
            form.classList.remove('hidden')
            try { form.classList.remove('mt-2') } catch { }
            const titleEl = form.querySelector('.lnk-title') as HTMLInputElement | null
            const urlEl = form.querySelector('.lnk-url') as HTMLInputElement | null
            const err = form.querySelector('.lnk-error') as HTMLElement | null
            const cur = (links && links[0]) || null
            if (titleEl) titleEl.value = cur?.title || ''
            if (urlEl) urlEl.value = cur?.url || ''
            if (err) { err.textContent = ''; err.classList.add('hidden') }
          }
        } else {
          // View mode: render unfurl card, hide form
          box.classList.remove('hidden')
          box.innerHTML = renderLinkCardsUnfurl(links, false)
          try { hydrateLinkCards(w) } catch { }
          if (form) form.classList.add('hidden')
          if (addBtn) addBtn.classList.add('hidden') // view mode never shows add
        }
      }
    }
    if (m.type === 'calendar') {
      const box = w.querySelector('.cal-body') as HTMLElement | null
      if (box) {
        const url = calGet(pid, id)
        const gridEl = w.closest('#widgetGrid') as HTMLElement | null
        const edit = gridEl?.getAttribute('data-edit') === '1'
        const form = w.querySelector('.cal-form') as HTMLElement | null
        const addBtn = w.querySelector('.cal-add') as HTMLElement | null
        if (edit) {
          // Show form, hide preview
          if (box) { box.innerHTML = ''; box.classList.add('hidden') }
          if (addBtn) addBtn.classList.add('hidden')
          if (form) {
            form.classList.remove('hidden')
            const urlEl = form.querySelector('.cal-url') as HTMLInputElement | null
            const err = form.querySelector('.cal-error') as HTMLElement | null
            if (urlEl) urlEl.value = url || ''
            if (err) { err.textContent = ''; err.classList.add('hidden') }
          }
        } else {
          // View mode: render calendar
          if (box) { box.classList.remove('hidden'); box.innerHTML = url ? renderCalendarFrame(url) : `<div class=\"h-full grid place-items-center text-gray-400\">カレンダーが設定されていません</div>` }
          if (form) form.classList.add('hidden')
          if (addBtn) addBtn.classList.add('hidden')
        }
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

// ---- Calendar helpers ----
function calKey(pid: string, id: string): string { return `pj-cal-${pid}-${id}` }
function calGet(pid: string, id: string): string {
  try { return localStorage.getItem(calKey(pid, id)) || '' } catch { return '' }
}
function calSet(pid: string, id: string, url: string): void {
  try { if (url) localStorage.setItem(calKey(pid, id), url); else localStorage.removeItem(calKey(pid, id)) } catch { }
}
function renderCalendarFrame(url: string): string {
  let safe = url.trim()
  if (safe && !/^https?:\/\//i.test(safe)) safe = `https://${safe}`
  // Detect Google Calendar embed and apply a dark-mode workaround
  let isGcal = false
  try {
    const u = new URL(safe)
    isGcal = /(^|\.)calendar\.google\.com$/i.test(u.hostname) && u.pathname.includes('/calendar/')
    if (isGcal) {
      const theme = (document.documentElement.getAttribute('data-theme') || 'dark')
      // Set background color hint to match theme
      const bg = theme === 'warm' ? '#fff8ec' : '#121212'
      u.searchParams.set('bgcolor', bg)
      safe = u.toString()
    }
  } catch { /* ignore URL parse errors */ }

  // Use theme-driven filter for Google Calendar
  const iframeStyle = isGcal ? `filter: var(--cal-filter);` : ''
  // Best-effort embed; apply sandbox and referrer policy consistently
  return `<div class=\"h-full min-h-[220px] overflow-hidden bg-neutral-900\"><iframe class=\"w-full h-full\" style=\"${iframeStyle}\" src=\"${escHtml(safe)}\" sandbox=\"allow-scripts allow-same-origin allow-forms allow-popups\" referrerpolicy=\"no-referrer\"></iframe></div>`
}

// ---- Clock helpers ----
function clockKey(pid: string, id: string): string { return `pj-clock-${pid}-${id}` }
function clockGet(pid: string, id: string): 'digital' | 'analog' {
  try { const v = localStorage.getItem(clockKey(pid, id)) || 'digital'; return (v === 'analog' ? 'analog' : 'digital') } catch { return 'digital' }
}
function clockSet(pid: string, id: string, mode: 'digital' | 'analog'): void {
  try { localStorage.setItem(clockKey(pid, id), mode) } catch { }
}
const clockTimers = new Map<string, number>()

// ---- Flow helpers ----
type FlowNode = { id: string; kind: 'trigger' | 'action'; type: string; x: number; y: number; label?: string; cfg?: Record<string, any> }
type FlowEdge = { from: string; to: string }
type FlowGraph = { nodes: FlowNode[]; edges: FlowEdge[] }
function flowKey(pid: string, id: string): string { return `pj-flow-${pid}-${id}` }
function flowLoad(pid: string, id: string): FlowGraph {
  try { return JSON.parse(localStorage.getItem(flowKey(pid, id)) || '{"nodes":[],"edges":[]}') as FlowGraph } catch { return { nodes: [], edges: [] } }
}
function flowSave(pid: string, id: string, g: FlowGraph): void { try { localStorage.setItem(flowKey(pid, id), JSON.stringify(g)) } catch {} }
const flowTimers = new Map<string, Map<string, number>>()

function widgetTitle(type: string): string {
  switch (type) {
    case 'readme': return 'README'
    case 'overview': return 'Overview'
    case 'contrib': return 'Contributions'
    case 'markdown': return 'Markdown'
    case 'committers': return 'Top Committers'
    case 'calendar': return 'カレンダー'
    case 'flow': return 'ミニフロー'
    case 'clock': return '時計'
    default: return 'Widget'
  }
}

function buildWidgetBody(type: string): string {
  switch (type) {
    case 'readme': return readmeSkeleton()
    case 'overview': return overviewSkeleton()
    case 'contrib': return contributionWidget()
    case 'markdown': return markdownWidget()
    case 'tasksum': return `<div class=\"tasksum-body h-full text-sm text-gray-200\"></div>`
    case 'milestones': return `<ul class=\"text-sm text-gray-200 space-y-2\"><li>企画 <span class=\"text-gray-400\">(完了)</span></li><li>実装 <span class=\"text-gray-400\">(進行中)</span></li><li>リリース <span class=\"text-gray-400\">(未着手)</span></li></ul>`
    case 'links': return `
      <div class=\"links-body h-full flex flex-col gap-3 text-sm text-gray-200\"></div>
      <div class=\"mt-2 text-xs edit-only\">
        <button class=\"lnk-add rounded ring-2 ring-neutral-600 px-2 py-0.5 hover:bg-neutral-800\">リンク追加</button>
      </div>
      <div class=\"lnk-form mt-2 p-2 rounded bg-neutral-900/60 ring-2 ring-neutral-600 hidden edit-only\">
        <div class=\"grid grid-cols-1 md:grid-cols-6 gap-2 items-center\">
          <input class=\"lnk-title md:col-span-2 rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100\" placeholder=\"タイトル (任意)\" />
          <input class=\"lnk-url md:col-span-3 rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100\" placeholder=\"URL (https://...)\" />
          <div class=\"flex gap-2 justify-end md:col-span-6\">
            <button class=\"lnk-save whitespace-nowrap rounded bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1\">追加</button>
            <button class=\"lnk-cancel whitespace-nowrap rounded ring-2 ring-neutral-600 px-3 py-1 hover:bg-neutral-800\">キャンセル</button>
          </div>
        </div>
        <p class=\"lnk-error mt-1 text-red-400 text-xs hidden\"></p>
      </div>`
    case 'flow': return `
      <div class=\"flow-body relative h-full overflow-hidden rounded bg-neutral-900/30\">
        <svg class=\"flow-svg absolute inset-0 pointer-events-none\"></svg>
        <div class=\"flow-canvas absolute inset-0\"></div>
        <div class=\"flow-toolbar edit-only absolute top-1 left-1 flex items-center gap-2 bg-neutral-900/70 ring-1 ring-neutral-600 rounded px-2 py-1\">
          <button class=\"flow-add-tr rounded ring-2 ring-neutral-600 px-2 py-0.5 hover:bg-neutral-800\">トリガー追加</button>
          <button class=\"flow-add-ac rounded ring-2 ring-neutral-600 px-2 py-0.5 hover:bg-neutral-800\">アクション追加</button>
          <button class=\"flow-clear rounded ring-2 ring-rose-800 text-rose-200 px-2 py-0.5 hover:bg-rose-900/50\">全削除</button>
        </div>
        <div class=\"flow-runbar absolute top-1 right-1 flex items-center gap-2 bg-neutral-900/70 ring-1 ring-neutral-600 rounded px-2 py-1\">
          <button class=\"flow-run rounded bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1\">テスト実行</button>
        </div>
        <div class=\"flow-log absolute bottom-1 left-1 right-1 p-2 rounded bg-neutral-900/70 ring-1 ring-neutral-700 text-[11px] text-gray-300 max-h-24 overflow-auto\"></div>
      </div>`
    case 'calendar': return `
      <div class=\"cal-body h-full overflow-hidden\"></div>
      <div class=\"mt-2 text-xs edit-only\">
        <button class=\"cal-add rounded ring-2 ring-neutral-600 px-2 py-0.5 hover:bg-neutral-800\">カレンダーを設定</button>
      </div>
      <div class=\"cal-form mt-2 p-2 rounded bg-neutral-900/60 ring-2 ring-neutral-600 hidden edit-only\">
        <div class=\"grid grid-cols-1 md:grid-cols-6 gap-2 items-center\">
          <input class=\"cal-url md:col-span-5 rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100\" placeholder=\"埋め込みURL (https://calendar.google.com/calendar/embed?...)\" />
          <div class=\"flex gap-2 justify-end md:col-span-1\">
            <button class=\"cal-save whitespace-nowrap rounded bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1\">保存</button>
            <button class=\"cal-cancel whitespace-nowrap rounded ring-2 ring-neutral-600 px-3 py-1 hover:bg-neutral-800\">閉じる</button>
          </div>
        </div>
        <p class=\"cal-error mt-1 text-red-400 text-xs hidden\"></p>
        <p class=\"mt-2 text-[11px] text-gray-400\">Googleカレンダー右上の「︙」→「設定と共有」→「埋め込みコード」を使用してください。</p>
      </div>`
    case 'clock': return `
      <div class=\"clock-wrap relative h-full\">
        <div class=\"clock-body absolute inset-0 grid place-items-center text-gray-100\"></div>
        <div class=\"clk-toolbar edit-only absolute top-1 right-1 flex items-center gap-2 bg-neutral-900/70 ring-1 ring-neutral-600 rounded px-2 py-1\">
          <label class=\"text-xs text-gray-300\">表示</label>
          <select class=\"clk-mode rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100\">
            <option value=\"digital\">デジタル</option>
            <option value=\"analog\">アナログ</option>
          </select>
        </div>
      </div>`
    case 'progress': return `<div class=\"progress-body\"><div class=\"h-2 bg-neutral-800 rounded\"><div class=\"h-2 bg-emerald-600 rounded w-0\"></div></div><div class=\"text-xs text-gray-400 mt-1\">0%</div></div>`
    case 'team': return `<div class=\"team-body text-sm text-gray-200\"><p class=\"text-gray-400\">読み込み中...</p></div>`
    case 'todo': return `<div class=\"todo-body text-sm text-gray-200\"></div><div class=\"mt-2 text-xs\"><button class=\"todo-add rounded ring-2 ring-neutral-600 px-2 py-0.5 hover:bg-neutral-800\">項目追加</button></div>`
    case 'committers': return barSkeleton()
    default: return `<div class=\"h-40 grid place-items-center text-gray-400\">Mock</div>`
  }
}

// ------- Markdown widget -------
function markdownWidget(): string {
  return `
    <div class="md-widget h-full">
      <div class="md-preview whitespace-pre-wrap text-sm text-gray-200"></div>
      <div class="md-editor hidden absolute inset-0 z-10 p-2">
        <textarea class="md-text w-full h-full resize-none rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-gray-100 placeholder:text-gray-500" placeholder="ここにMarkdownを書いてください"></textarea>
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
  s = s.replace(/```([\s\S]*?)```/g, (m, p1) => `<pre class=\"rounded bg-neutral-900 ring-2 ring-neutral-600 p-3 overflow-auto\"><code>${p1}</code></pre>`)
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
    <div class="rounded-xl ring-2 ring-neutral-600 bg-neutral-900/50 p-4 text-gray-200">
      <div class="flex items-center gap-3 mb-3">
        <div class="text-sm text-gray-300">ノート</div>
        <button id="nt-save" class="ml-auto rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5">保存</button>
      </div>
      <div class="grid md:grid-cols-2 gap-4">
        <textarea id="nt-text" class="w-full h-72 rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-gray-100" placeholder="ここにMarkdownでノートを書けます"></textarea>
        <div id="nt-preview" class="h-72 overflow-auto rounded-md bg-neutral-900/40 ring-2 ring-neutral-600 p-3 text-gray-100 whitespace-pre-wrap"></div>
      </div>
    </div>
  `
  const key = `tab-notes-${pid}-${id}`
  const txt = panel.querySelector('#nt-text') as HTMLTextAreaElement
  const prev = panel.querySelector('#nt-preview') as HTMLElement
  try { txt.value = localStorage.getItem(key) || '' } catch { }
  const render = () => { prev.innerHTML = mdRenderToHtml(txt.value || '') }
  render()
  txt.addEventListener('input', render)
  panel.querySelector('#nt-save')?.addEventListener('click', () => { localStorage.setItem(key, txt.value || '') })
}

function buildDocsTab(panel: HTMLElement, pid: string, id: string): void {
  panel.innerHTML = `
    <div class="rounded-xl ring-2 ring-neutral-600 bg-neutral-900/50 p-0 text-gray-200 overflow-hidden">
      <div class="flex">
        <aside class="w-56 shrink-0 border-r border-neutral-600 p-3 space-y-2" id="dc-nav">
          <div class="flex items-center gap-2">
            <div class="text-sm text-gray-300">ページ</div>
            <button id="dc-add" class="ml-auto text-xs rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-0.5">追加</button>
          </div>
          <div id="dc-list" class="space-y-1"></div>
        </aside>
        <section class="flex-1 p-4">
          <input id="dc-title" class="w-full rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-gray-100 mb-2" placeholder="タイトル" />
          <textarea id="dc-body" class="w-full h-72 rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-gray-100" placeholder="Markdownで本文"></textarea>
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
    list.innerHTML = (state.pages || []).map(p => `<button data-id="${p.id}" class="w-full text-left px-2 py-1 rounded hover:bg-neutral-800/60 ${state.sel === p.id ? 'bg-neutral-800/60' : ''}">${p.title || 'Untitled'}</button>`).join('') || '<p class="text-xs text-gray-400">ページがありません。</p>'
    list.querySelectorAll('[data-id]')?.forEach((el) => el.addEventListener('click', () => { state.sel = (el as HTMLElement).getAttribute('data-id') || ''; save(state); loadPage() }))
  }
  const loadPage = () => {
    const p = state.pages.find(x => x.id === state.sel)
    title.value = p?.title || ''
    body.value = p?.body || ''
    renderList()
  }
  panel.querySelector('#dc-add')?.addEventListener('click', () => { const p: Page = { id: String(Date.now()), title: '新規ページ', body: '' }; state.pages.push(p); state.sel = p.id; save(state); renderList(); loadPage() })
  panel.querySelector('#dc-save')?.addEventListener('click', () => { const p = state.pages.find(x => x.id === state.sel); if (!p) return; p.title = title.value; p.body = body.value; save(state); renderList() })
  if (!state.pages.length) { state.pages = [{ id: String(Date.now()), title: 'はじめに', body: '' }]; state.sel = state.pages[0].id; save(state) }
  renderList(); loadPage()
}

function buildReportTab(panel: HTMLElement, pid: string): void {
  const tasks = K_loadTasks(pid)
  const counts = { todo: 0, doing: 0, review: 0, done: 0 } as Record<string, number>
  tasks.forEach(t => counts[t.status] = (counts[t.status] || 0) + 1)
  const today = new Date().toISOString().slice(0, 10)
  const overdue = tasks.filter(t => t.due && t.due < today && t.status !== 'done')
  panel.innerHTML = `
    <div class="rounded-xl ring-2 ring-neutral-600 bg-neutral-900/50 p-4 text-gray-200">
      <div class="text-sm text-gray-300 mb-2">タスクサマリー</div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        ${[['TODO', 'todo'], ['DOING', 'doing'], ['REVIEW', 'review'], ['DONE', 'done']].map(([label, k]) => `<div class=\"rounded ring-2 ring-neutral-600 bg-neutral-800/40 p-3 text-center\">${label}<div class=\"text-2xl text-emerald-400\">${counts[k] || 0}</div></div>`).join('')}
      </div>
      <div class="mt-4">
        <div class="text-sm text-gray-300 mb-1">期限切れ</div>
        ${overdue.length ? `<ul class=\"list-disc ml-6 space-y-1\">${overdue.map(t => `<li>${t.title} <span class=\\"text-xs text-rose-400\\">${t.due}</span></li>`).join('')}</ul>` : '<p class="text-gray-400 text-sm">ありません。</p>'}
      </div>
    </div>
  `
}

function buildRoadmapTab(panel: HTMLElement, pid: string, id: string): void {
  panel.innerHTML = `
    <div class="rounded-xl ring-2 ring-neutral-600 bg-neutral-900/50 p-4 text-gray-200">
      <div class="flex items-center gap-2 mb-3">
        <input id="rd-title" class="rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-sm" placeholder="項目名" />
        <input id="rd-date" type="date" class="rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-sm" />
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
    const data = load().sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    list.innerHTML = data.length ? data.map(i => `<div class=\"rounded ring-2 ring-neutral-600 bg-neutral-800/40 p-2 flex items-center\"><div class=\"text-sm\">${i.title}</div><div class=\"ml-auto text-xs text-gray-400\">${i.date || '-'}</div></div>`).join('') : '<p class=\"text-sm text-gray-400\">項目がありません。</p>'
  }
  panel.querySelector('#rd-add')?.addEventListener('click', () => {
    const t = (panel.querySelector('#rd-title') as HTMLInputElement).value.trim()
    const d = (panel.querySelector('#rd-date') as HTMLInputElement).value
    if (!t) return
    const cur = load(); cur.push({ title: t, date: d }); save(cur); render()
      ; (panel.querySelector('#rd-title') as HTMLInputElement).value = ''
      ; (panel.querySelector('#rd-date') as HTMLInputElement).value = ''
  })
  render()
}

function buildBurndownTab(panel: HTMLElement, pid: string): void {
  const days = 14
  const tasks = K_loadTasks(pid)
  const remaining = tasks.filter(t => t.status !== 'done').length
  const series = Array.from({ length: days }, (_, i) => remaining - Math.floor((remaining / days) * i))
  panel.innerHTML = `
    <div class="rounded-xl ring-2 ring-neutral-600 bg-neutral-900/50 p-4 text-gray-200">
      <div class="text-sm text-gray-300 mb-2">簡易バーンダウン（${days}日）</div>
      <div class="h-40 flex items-end gap-1">
        ${series.map(v => `<div class=\"w-4 bg-emerald-700\" style=\"height:${Math.max(4, v * 6)}px\"></div>`).join('')}
      </div>
      <p class="text-xs text-gray-400 mt-2">実データ連携は未実装。タスク残数ベースの簡易表示です。</p>
    </div>
  `
}

function buildTimelineTab(panel: HTMLElement, pid: string): void {
  const tasks = K_loadTasks(pid)
  const events: Array<{ at: string; text: string; title: string }> = []
  tasks.forEach(t => (t.history || []).forEach(h => events.push({ at: h.at, text: h.text, title: t.title })))
  events.sort((a, b) => (b.at || '').localeCompare(a.at || ''))
  panel.innerHTML = `
    <div class="rounded-xl ring-2 ring-neutral-600 bg-neutral-900/50 p-4 text-gray-200">
      <div class="text-sm text-gray-300 mb-2">最近のアクティビティ</div>
      ${events.length ? `<ul class=\"space-y-2\">${events.slice(0, 30).map(e => `<li class=\\"text-sm\\"><span class=\\"text-xs text-gray-400\\">${e.at}</span> - ${e.text} <span class=\\"text-xs text-gray-400\\">(${e.title})</span></li>`).join('')}</ul>` : '<p class="text-sm text-gray-400">記録がありません。</p>'}
    </div>
  `
}

// Build a widget-enabled tab panel with its own widget scope (pid:tabId)
function buildWidgetTab(panel: HTMLElement, pid: string, scope: string, defaults: string[]): void {
  panel.innerHTML = `
    <div class="space-y-3">
      <div class="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-12" id="widgetGrid" data-pid="${pid}:${scope}" style="grid-auto-rows: 3.5rem;">
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
    // Ensure widgets exist before applying sizes; ordering is handled by enableDragAndDrop's initializer
    ensureWidgets(panel, scoped)
    applyWidgetSizes(panel, scoped)
  }
}

function detailLayout(ctx: { id: number; name: string; fullName: string; owner: string; repo: string }): string {
  return `
    <div class="min-h-screen gh-canvas text-gray-100">
      <!-- Browser-like project tabs (full width) -->
      <div id="projTabsBar" class="sticky top-0 z-[80] bg-neutral-700/80 backdrop-blur-[1px]">
        <div class="bar relative flex items-center px-2 h-10">
          <!-- Left control area aligned above the rail -->
          <div id="tabsLeftPad" class="absolute left-0 bottom-0 h-full w-[14rem] pl-3 flex items-end gap-2">
            <button id="railToggleTop" class="w-7 h-7 grid place-items-center text-gray-200 hover:text-white" title="サイドバー表示/非表示"><span class="material-symbols-outlined text-[20px] leading-none">view_sidebar</span></button>
            
            <!-- Vertical divider aligned with rail edge -->
            <div class="absolute right-0 top-0 h-full border-r border-neutral-600 pointer-events-none"></div>
          </div>
          <div class="tabs-wrap flex-1 flex items-end gap-0 overflow-x-auto pl-[calc(14rem+0.5rem)]" role="tablist"></div>
          <button id="projTabAdd" class="ml-2 text-xl text-gray-400 hover:text-gray-100 px-2" title="プロジェクトを開く/追加">＋</button>
          <!-- Right edge divider for browser tabs -->
          <div class="absolute right-0 top-0 h-full border-l border-neutral-600 pointer-events-none"></div>
        </div>
      </div>

      <!-- Main split: left sidebar (tabs/actions) / right content -->
      <div class="flex">
        <!-- Left rail: vertical tabs + collaborator add (sticky) -->
        <aside id="leftRail" class="relative w-56 shrink-0 p-4 border-r border-neutral-600 bg-neutral-700/80 sticky top-10 h-[calc(100vh-2.5rem)] flex flex-col">
          <div id="railResizer" class="absolute top-0 -right-1 w-2 h-full cursor-col-resize z-[5]"></div>
          <!-- Repo / Project breadcrumb at top of rail -->
          <div class="mb-5 pt-1">
            <div class="flex items-center gap-2 text-sm min-w-0 overflow-hidden">
              <a href="#/project" class="text-gray-300 hover:text-white truncate max-w-[5rem] flex-none" id="topPathUser" title="${ctx.owner}">${ctx.owner}</a>
              <span class="text-gray-500 flex-shrink-0">/</span>
              <span class="text-gray-300 truncate min-w-0 flex-1" id="topPathRepo" title="${ctx.repo}">${ctx.repo}</span>
            </div>
          </div>

          <div id="tabBar" class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 text-base pr-1">
            <span class="tab-row group relative flex w-full items-center gap-1.5 rounded-md hover:bg-neutral-600/60 pr-1 -mr-1 min-w-0">
              <button class="tab-btn flex-1 min-w-0 text-left px-3 py-2 rounded-t-md text-gray-100 text-[15px] truncate" data-tab="summary">概要</button>
              <button class="tab-menu opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-300 hover:text-gray-100" data-for="summary" title="メニュー">⋮</button>
              <button class="tab-lock opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-300 hover:text-gray-100" data-for="summary" title="ロック切替">${LOCK_SVG}</button>
            </span>
            <span class="tab-row group relative flex w-full items-center gap-1.5 rounded-md hover:bg-neutral-600/60 pr-1 -mr-1 min-w-0">
              <button class="tab-btn flex-1 min-w-0 text-left px-3 py-2 rounded-t-md text-gray-100 text-[15px] truncate" data-tab="board">カンバンボード</button>
              <button class="tab-menu opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-300 hover:text-gray-100" data-for="board" title="メニュー">⋮</button>
              <button class="tab-lock opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-300 hover:text-gray-100" data-for="board" title="ロック切替">${LOCK_SVG}</button>
            </span>
            <span class="tab-row group relative flex w-full items-center gap-1.5 rounded-md hover:bg-neutral-600/60 pr-1 -mr-1 min-w-0">
              <button class="tab-btn flex-1 min-w-0 text-left px-3 py-2 rounded-md text-gray-100 text-[15px] truncate" data-tab="new">+ 新規タブ</button>
              <span class="inline-block w-5"></span>
            </span>
          </div>
          <div id="railBottom" class="mt-auto pt-3">
            <div id="collabAvatars" class="flex items-center gap-2 mb-2"></div>
            <div class="tab-row group relative flex w-full items-center gap-1.5 rounded-md hover:bg-neutral-600/60 pr-1 -mr-1 mt-2">
              <button id="addCollabLink" class="tab-btn w-full text-left px-3 py-2 rounded-md text-gray-100 text-[15px]">メンバーを追加</button>
            </div>
            <div class="tab-row group relative flex w-full items-center gap-1.5 rounded-md hover:bg-neutral-600/60 pr-1 -mr-1">
              <button id="accountSettingsLink" class="tab-btn w-full text-left px-3 py-2 rounded-md text-gray-100 text-[15px]">ユーザー設定</button>
            </div>
          </div>
        </aside>

        <!-- Right content -->
        <div class="flex-1 min-w-0">
          <main class="p-8">
            <section class="space-y-3" id="tab-summary" data-tab="summary">
              <div class="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-12" id="widgetGrid" data-pid="${ctx.id}" style="grid-auto-rows: 3.5rem;">
                ${widgetShell('contrib', 'Contributions', contributionWidget())}
                ${widgetShell('committers', 'Top Committers', barSkeleton())}
                ${widgetShell('readme', 'README', readmeSkeleton())}
              </div>
            </section>

            <section class="mt-8 hidden" id="tab-board" data-tab="board">
              ${kanbanShell()}
            </section>
          </main>
        </div>
      </div>
    </div>
  `
}

function setupTabs(container: HTMLElement, pid: string): void {
  // Only bind real tabs inside #tabBar (exclude action buttons in #railBottom)
  container.querySelectorAll('#tabBar .tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = (btn as HTMLElement).getAttribute('data-tab')
      if (!name) return // guard for non-tab buttons
      if (name === 'new') {
        // open picker and create a tab on selection
        openTabPickerModal(container, {
          onSelect: (type: TabTemplate) => addCustomTab(container, pid, type),
        } as any)
        return
      }
      container.querySelectorAll('section[data-tab]')
        .forEach((sec) => (sec as HTMLElement).classList.toggle('hidden', sec.getAttribute('data-tab') !== name))
      container.querySelectorAll('#tabBar .tab-btn').forEach((b) => {
        // Active style: light gray background on full row; no orange borders
        b.classList.remove('border-emerald-500', 'ring-2', 'ring-neutral-600', 'bg-neutral-800/60', 'border-l-2', 'border-b-2', 'border-orange-500')
        const active = b === btn
        const wrap = (b as HTMLElement).closest('.tab-row') as HTMLElement | null
        if (wrap) {
          wrap.classList.toggle('bg-neutral-500/50', active)
        }
        b.classList.toggle('text-gray-100', active)
        b.classList.toggle('text-gray-400', !active)
      })
      if (name === 'board') renderKanban(container, pid)
      // Apply saved edit state for the activated tab's widget grid (if any)
      const panel = container.querySelector(`section[data-tab="${name}"]`) as HTMLElement | null
      const grid = panel?.querySelector('#widgetGrid') as HTMLElement | null
      if (grid && (grid as any)._setEdit) {
        const scoped = grid.getAttribute('data-pid') || ''
        const on = localStorage.getItem(`wg-edit-${scoped}`) === '1'
          ; (grid as any)._setEdit(on)
      }
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
  } catch { }
  return { summary: { title: '概要', visible: true }, board: { title: 'カンバンボード', visible: true } }
}
function saveCoreTabs(pid: string, v: CoreTabs): void { localStorage.setItem(coreKey(pid), JSON.stringify(v)) }

function applyCoreTabs(root: HTMLElement, pid: string): void {
  const bar = root.querySelector('#tabBar') as HTMLElement | null
  if (!bar) return
  const core = getCoreTabs(pid)
  const ensureWrap = (btn: HTMLElement, key: 'summary' | 'board') => {
    let wrap = btn.parentElement as HTMLElement
    if (!wrap || wrap.tagName.toLowerCase() !== 'span') {
      const span = document.createElement('span')
      span.className = 'tab-row group relative flex w-full rounded-md hover:bg-neutral-600/60 pr-1 -mr-1'
      btn.replaceWith(span)
      span.appendChild(btn)
      wrap = span
    } else {
      // ensure full-width wrapper for vertical rail
      wrap.classList.add('flex', 'w-full', 'rounded-md', 'hover:bg-neutral-600/60', 'pr-1', '-mr-1')
      wrap.classList.add('tab-row')
      wrap.classList.remove('inline-flex')
    }
    // Make core tabs draggable like custom tabs
    wrap.setAttribute('draggable', 'true')
    // ensure menu + lock buttons exist and are hover-revealed
    let menuBtn = wrap.querySelector('.tab-menu') as HTMLElement | null
    if (!menuBtn) {
      menuBtn = document.createElement('button')
      menuBtn.className = 'tab-menu opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-300 hover:text-gray-100'
      menuBtn.setAttribute('data-for', key)
      menuBtn.title = 'メニュー'
      menuBtn.textContent = '⋮'
      wrap.appendChild(menuBtn)
    }
    let lockBtn = wrap.querySelector(`.tab-lock[data-for="${key}"]`) as HTMLElement | null
    if (lockBtn) lockBtn.classList.add('opacity-0', 'group-hover:opacity-100', 'transition-opacity')
    // open context menu on menu click
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      openTabContextMenu(root, pid, { kind: 'core', id: key, btn })
    })
    // also support right-click as fallback
    btn.addEventListener('contextmenu', (e) => { e.preventDefault(); openTabContextMenu(root, pid, { kind: 'core', id: key, btn }) })
    // Double-click rename disabled (use context menu instead)
  }

  const sumBtn = bar.querySelector('[data-tab="summary"]') as HTMLElement | null
  const brdBtn = bar.querySelector('[data-tab="board"]') as HTMLElement | null
  if (sumBtn) {
    sumBtn.textContent = core.summary.title
    sumBtn.classList.toggle('hidden', !core.summary.visible)
    const wrap = sumBtn.closest('span') as HTMLElement | null
    if (wrap) wrap.classList.toggle('hidden', !core.summary.visible)
    ensureWrap(sumBtn, 'summary')
  }
  if (brdBtn) {
    brdBtn.textContent = core.board.title
    brdBtn.classList.toggle('hidden', !core.board.visible)
    const wrap = brdBtn.closest('span') as HTMLElement | null
    if (wrap) wrap.classList.toggle('hidden', !core.board.visible)
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
function openTabContextMenu(root: HTMLElement, pid: string, arg: { kind: 'core' | 'custom'; id: string; btn: HTMLElement; type?: TabTemplate }): void {
  const { kind, id, btn } = arg
  // Close any open rename popover
  document.getElementById('tabRenamePop')?.remove()
  // Close any existing tab context menu before opening a new one
  document.getElementById('tabCtxMenu')?.remove()
  const rect = btn.getBoundingClientRect()
  const menu = document.createElement('div')
  menu.id = 'tabCtxMenu'
  menu.className = 'fixed z-[80] w-36 rounded-md bg-neutral-900 ring-2 ring-neutral-600 shadow-xl text-sm text-gray-200'
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
    pop.className = 'fixed z-[81] w-[min(320px,92vw)] rounded-lg bg-neutral-900 ring-2 ring-neutral-600 shadow-xl p-2'
    pop.style.top = `${r.bottom + 8}px`
    pop.style.left = `${Math.max(12, Math.min(window.innerWidth - 340, r.left))}px`
    const currentTitle = kind === 'core' ? (getCoreTabs(pid)[id as 'summary' | 'board']?.title || '') : (btn.textContent || '')
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    pop.innerHTML = `
      <div class="flex items-center gap-2">
        <input id="tr-name" type="text" class="flex-1 min-w-0 rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1.5 text-gray-100" value="${esc(currentTitle)}" />
        <button id="tr-save" class="rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 whitespace-nowrap shrink-0">保存</button>
        <button id="tr-cancel" class="rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 text-gray-200 text-xs px-3 py-1.5 whitespace-nowrap shrink-0">取消</button>
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
        const k = id as 'summary' | 'board'
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
      const k = id as 'summary' | 'board'
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
  const newBtn = tabBar.querySelector('[data-tab="new"]') as HTMLElement | null
  // wrapper to host delete button
  const wrap = document.createElement('span')
  wrap.className = 'tab-row group relative flex w-full items-center gap-2 rounded-md hover:bg-neutral-600/60 pr-1 -mr-1'
  const btn = document.createElement('button')
  // Use symmetric spacing to keep label centered under the active underline
  btn.className = 'tab-btn w-full text-left px-3 py-2 rounded-md text-gray-100 text-[15px]'
  btn.setAttribute('data-tab', id)
  btn.textContent = preTitle || tabTitle(type)
  const lock = document.createElement('button')
  lock.className = 'tab-lock opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-300 hover:text-gray-100'
  lock.setAttribute('data-for', id)
  lock.title = 'ロック切替'
  // Inline SVG icon
  lock.innerHTML = LOCK_SVG
  // menu (three-dots) button
  const menu = document.createElement('button')
  menu.className = 'tab-menu opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-300 hover:text-gray-100'
  menu.setAttribute('data-for', id)
  menu.title = 'メニュー'
  menu.textContent = '⋮'
  // order: label then lock on right
  wrap.appendChild(btn)
  wrap.appendChild(menu)
  wrap.appendChild(lock)
  if (newBtn) {
    const refWrap = (newBtn.closest('span') as HTMLElement | null)
    if (refWrap && refWrap.parentElement === tabBar) tabBar.insertBefore(wrap, refWrap)
    else if (newBtn.parentElement === tabBar) tabBar.insertBefore(wrap, newBtn)
    else tabBar.appendChild(wrap)
  } else {
    tabBar.appendChild(wrap)
  }
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
    buildWidgetTab(panel, pid, id, ['markdown', 'links'])
    root.querySelector('main')?.appendChild(panel)
  } else if (type === 'report') {
    buildWidgetTab(panel, pid, id, ['tasksum'])
    root.querySelector('main')?.appendChild(panel)
  } else if (type === 'roadmap') {
    buildWidgetTab(panel, pid, id, [])
    root.querySelector('main')?.appendChild(panel)
  } else if (type === 'burndown') {
    buildWidgetTab(panel, pid, id, [])
    root.querySelector('main')?.appendChild(panel)
  } else if (type === 'timeline') {
    buildWidgetTab(panel, pid, id, [])
    root.querySelector('main')?.appendChild(panel)
  } else {
    panel.innerHTML = `<div class=\"rounded-xl ring-2 ring-neutral-600 bg-neutral-900/50 p-8 text-gray-300\">${tabTitle(type)}（プレースホルダー）</div>`
    root.querySelector('main')?.appendChild(panel)
  }

  btn.addEventListener('click', () => {
    root.querySelectorAll('section[data-tab]').forEach((sec) => (sec as HTMLElement).classList.toggle('hidden', sec.getAttribute('data-tab') !== id))
    root.querySelectorAll('#tabBar .tab-btn').forEach((b) => {
      // Active style: light gray background on full row; no orange borders
      b.classList.remove('border-emerald-500', 'ring-2', 'ring-neutral-600', 'bg-neutral-800/60', 'border-l-2', 'border-b-2', 'border-orange-500')
      const active = b === btn
      const wrap = (b as HTMLElement).closest('.tab-row') as HTMLElement | null
      if (wrap) wrap.classList.toggle('bg-neutral-500/50', active)
      b.classList.toggle('text-gray-100', active)
      b.classList.toggle('text-gray-400', !active)
    })
  })

  // Double-click rename disabled (use context menu instead)

  // context menu
  btn.addEventListener('contextmenu', (e) => { e.preventDefault(); openTabContextMenu(root, pid, { kind: 'custom', id, btn, type }) })
  // click three-dots to open menu
  menu.addEventListener('click', (e) => { e.stopPropagation(); openTabContextMenu(root, pid, { kind: 'custom', id, btn, type }) })

  if (persist) {
    const saved = JSON.parse(localStorage.getItem(`tabs-${pid}`) || '[]') as Array<{ id: string; type: TabTemplate; title?: string }>
    saved.push({ id, type, title: btn.textContent || tabTitle(type) })
    localStorage.setItem(`tabs-${pid}`, JSON.stringify(saved))
  }
  btn.click()

  // Initialize lock visual from saved state
  try {
    const scoped = `${pid}:${id}`
    const on = localStorage.getItem(`wg-edit-${scoped}`) === '1'
    lock.innerHTML = on ? LOCK_OPEN_RIGHT_SVG : LOCK_SVG
    lock.setAttribute('aria-pressed', on ? 'true' : 'false')
  } catch { }
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
  let dropMarkEl: HTMLElement | null = null
  const clearDropMark = () => { if (dropMarkEl) dropMarkEl.style.boxShadow = ''; dropMarkEl = null }

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
    // Vertical list: compare by Y position
    const before = (e as DragEvent).clientY < rect.top + rect.height / 2
    // visual indicator on insertion edge
    if (dropMarkEl !== t) { clearDropMark() }
    const color = 'rgba(56,139,253,0.95)'
    t.style.boxShadow = before ? `inset 0 2px 0 0 ${color}` : `inset 0 -2px 0 0 ${color}`
    dropMarkEl = t
    if (before) bar.insertBefore(dragEl, t)
    else bar.insertBefore(dragEl, t.nextSibling)
  })
  bar.addEventListener('drop', () => {
    if (!dragEl) return
    dragEl.classList.remove('opacity-60')
    clearDropMark()
    dragEl = null
    persistOrder()
  })
  bar.addEventListener('dragend', () => {
    if (!dragEl) return
    dragEl.classList.remove('opacity-60')
    clearDropMark()
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
      .map((u) => `<img title="${u.login}${u.status === 'pending' ? '（招待中）' : ''}" data-login="${u.login}" src="${u.avatar_url || ''}" class="w-9 h-9 rounded-full ring-2 ring-neutral-600 object-cover cursor-pointer"/>`)
      .join('')
    wrap.querySelectorAll('img[data-login]')?.forEach((el) => {
      el.addEventListener('click', (e) => openCollabMenu(root, projectId, e.currentTarget as HTMLElement))
    })
  } catch { }
}

function openCollaboratorPopover(root: HTMLElement, projectId: number, anchor: HTMLElement): void {
  // Close any existing popover
  root.querySelector('#collabPopover')?.remove()
  const rect = anchor.getBoundingClientRect()
  const pop = document.createElement('div')
  pop.id = 'collabPopover'
  pop.className = 'fixed z-[70] w-[min(420px,92vw)] rounded-lg bg-neutral-900 ring-2 ring-neutral-600 shadow-xl'
  // Provisional position; will correct after measuring size
  pop.style.top = `${rect.bottom + 8}px`
  pop.style.left = `${Math.max(12, rect.left)}px`
  pop.innerHTML = `
    <div class="p-3">
      <div class="text-sm text-gray-300 mb-2">GitHubユーザーを検索</div>
      <input id="collabSearch" type="text" class="w-full rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-2 text-gray-100" placeholder="ユーザー名で検索" />
      <div id="collabResults" class="mt-3 max-h-64 overflow-y-auto divide-y divide-neutral-600"></div>
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

    // Ensure popover stays within viewport (flip if necessary)
    ; (() => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const w = pop.offsetWidth
      const h = pop.offsetHeight || 220 // rough fallback before images load
      // Prefer aligning right edge of popover to anchor right
      let left = Math.min(vw - w - 12, Math.max(12, rect.right - w))
      // Default show below
      let top = rect.bottom + 8
      // If bottom overflows, flip above
      if (top + h > vh - 12) {
        top = Math.max(12, rect.top - h - 8)
      }
      // Final clamps
      left = Math.max(12, Math.min(left, vw - w - 12))
      top = Math.max(12, Math.min(top, vh - h - 12))
      pop.style.left = `${left}px`
      pop.style.top = `${top}px`
    })()
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

// Compact center modal for inviting members (search + role + message)
function openMemberInviteModal(root: HTMLElement, pid: string): void {
  root.querySelector('#inviteModal')?.remove()
  const overlay = document.createElement('div')
  overlay.id = 'inviteModal'
  overlay.className = 'fixed inset-0 z-[86] bg-black/60 backdrop-blur-[1px] grid place-items-center fade-overlay'
  overlay.innerHTML = `
    <div class="relative w-[min(520px,94vw)] rounded-xl bg-neutral-900 ring-2 ring-neutral-600 shadow-2xl text-gray-100 pop-modal">
      <div class="flex items-center h-12 px-5 border-b border-neutral-600">
        <div class="text-lg font-semibold">メンバーを追加</div>
        <button id="mi-close" class="ml-auto text-2xl text-neutral-300 hover:text-white">×</button>
      </div>
      <div class="p-5 space-y-5">
        <p class="text-sm text-gray-400">GitHubユーザー名で検索して招待します。</p>
        <div>
          <input id="mi-search" type="text" class="w-full rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-2 text-gray-100" placeholder="名前やユーザー名で検索" />
          <div id="mi-results" class="mt-2 max-h-56 overflow-y-auto divide-y divide-neutral-700"></div>
        </div>
        <div>
          <div class="text-sm text-gray-300 mb-2">ロールを選択</div>
          <select id="mi-role" class="w-full rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-gray-100">
            <option value="push" selected>メンバー（書き込み）</option>
            <option value="pull">閲覧のみ</option>
            <option value="maintain">メンテナ</option>
            <option value="admin">管理者</option>
            <option value="triage">トリアージ</option>
          </select>
        </div>
        <div>
          <div class="text-sm text-gray-300 mb-2">メッセージ</div>
          <textarea id="mi-msg" rows="3" class="w-full rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-gray-100 placeholder:text-gray-500" placeholder="招待にメモを追加する…（任意）"></textarea>
        </div>
        <div class="flex justify-end gap-3 pt-1">
          <button id="mi-cancel" class="text-sm text-gray-300 hover:text-white">キャンセル</button>
          <button id="mi-send" class="rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2">招待を送信</button>
        </div>
      </div>
    </div>
  `
  const close = () => { overlay.remove(); const c = +(document.body.getAttribute('data-lock') || '0'); const n = Math.max(0, c - 1); if (n === 0) { document.body.style.overflow = ''; } document.body.setAttribute('data-lock', String(n)) }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#mi-close')?.addEventListener('click', close)
  overlay.querySelector('#mi-cancel')?.addEventListener('click', close)
  document.body.appendChild(overlay); (function () { const c = +(document.body.getAttribute('data-lock') || '0'); if (c === 0) { document.body.style.overflow = 'hidden' } document.body.setAttribute('data-lock', String(c + 1)) })()

  const input = overlay.querySelector('#mi-search') as HTMLInputElement
  const results = overlay.querySelector('#mi-results') as HTMLElement
  let selected: string | null = null
  let t: any
  input.addEventListener('input', async () => {
    const q = input.value.trim()
    clearTimeout(t)
    if (!q) { results.innerHTML = ''; selected = null; return }
    t = setTimeout(async () => {
      try {
        const res = await apiFetch<any>(`/github/search/users?query=${encodeURIComponent(q)}`)
        const items: Array<{ login: string; avatar_url?: string }> = res.items || []
        results.innerHTML = items.map(u => `
          <button data-login="${u.login}" class="w-full text-left flex items-center gap-3 px-2 py-2 hover:bg-neutral-800/60 ${selected === u.login ? 'bg-neutral-800/60' : ''}">
            <img src="${u.avatar_url || ''}" class="w-7 h-7 rounded-full"/>
            <span class="text-sm text-gray-100">${u.login}</span>
          </button>`).join('') || '<div class="px-2 py-2 text-gray-400">見つかりません</div>'
        results.querySelectorAll('[data-login]')?.forEach((el) => {
          el.addEventListener('click', () => {
            selected = (el as HTMLElement).getAttribute('data-login') || null
            results.querySelectorAll('[data-login]')?.forEach(n => (n as HTMLElement).classList.remove('bg-neutral-800/60'))
              ; (el as HTMLElement).classList.add('bg-neutral-800/60')
          })
        })
      } catch {
        results.innerHTML = '<div class="px-2 py-2 text-gray-400">読み込みに失敗しました</div>'
      }
    }, 250)
  })

  overlay.querySelector('#mi-send')?.addEventListener('click', async () => {
    if (!selected) { input.focus(); return }
    const role = (overlay.querySelector('#mi-role') as HTMLSelectElement).value || 'push'
    try {
      await apiFetch(`/projects/${pid}/collaborators`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: selected, permission: role }) })
      await loadCollaborators(root, Number(pid))
      close()
    } catch {
      alert('招待に失敗しました')
    }
  })
}

function openCollabMenu(root: HTMLElement, projectId: number, anchor: HTMLElement): void {
  const login = anchor.getAttribute('data-login')!
  root.querySelector('#collabMenu')?.remove()
  const r = anchor.getBoundingClientRect()
  const pop = document.createElement('div')
  pop.id = 'collabMenu'
  pop.className = 'fixed z-[72] w-48 rounded-lg bg-neutral-900 ring-2 ring-neutral-600 shadow-xl'
  pop.style.top = `${r.bottom + 8}px`
  pop.style.left = `${Math.min(window.innerWidth - 200, Math.max(12, r.left - 24))}px`
  pop.innerHTML = `
    <div class="p-2">
      <div class="text-sm text-gray-300 mb-2">${login}</div>
      <div class="text-xs text-gray-400 mb-1">権限</div>
      <div class="grid grid-cols-3 gap-2 mb-2">
        ${['pull', 'push', 'admin'].map(p => `<button data-perm="${p}" class="perm-btn px-2 py-1 rounded bg-neutral-800/60 hover:bg-neutral-700/60 text-gray-200 text-xs">${p}</button>`).join('')}
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
    <div id="${id}" class="grid md:grid-cols-4 gap-4"></div>
  `
}

async function renderKanban(root: HTMLElement, pid: string, targetId = 'kb-board'): Promise<void> {
  const board = root.querySelector(`#${targetId}`) as HTMLElement | null
  if (!board) return
  // ローカル保存タスクとGitHub課題を統合表示
  const state: Task[] = loadTasks(pid)
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
    } catch { }
  }
  const merged = [...state, ...ghTasks]
  board.innerHTML = ['todo', 'doing', 'review', 'done']
    .map((st) => columnHtml(st as Status, merged.filter((t) => t.status === st)))
    .join('')

  // Add-task buttons per column (disable when not linked to GitHub)
  const addBtns = board.querySelectorAll('.kb-add') as NodeListOf<HTMLButtonElement>
  if (!repoFull) {
    addBtns.forEach((btn) => {
      btn.setAttribute('disabled', 'true')
      btn.classList.add('opacity-50', 'cursor-not-allowed')
      btn.setAttribute('title', 'GitHub未連携のため追加できません。設定からリポジトリをリンクしてください。')
    })
  } else {
    addBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        const st = (btn as HTMLElement).getAttribute('data-col') as Status
        openNewTaskModal(root, pid, st, targetId)
      })
    })
  }

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
      if (id && id.startsWith('gh-')) { const num = id.replace('gh-', ''); openTaskModalGh(root, pid, num) }
      else { openTaskModal(root, pid, id) }
    })
  })
  // Visual drop indicator for columns
  let colMarkEl: HTMLElement | null = null
  let colMarkEdge: 'top' | 'bottom' | null = null
  const clearColMark = () => {
    if (colMarkEl) colMarkEl.style.boxShadow = ''
    colMarkEl = null
    colMarkEdge = null
  }

  board.querySelectorAll('[data-col]')?.forEach((col) => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault()
      if (!dragging) return
      const el = col as HTMLElement
      const r = el.getBoundingClientRect()
      const top = (e as DragEvent).clientY < r.top + r.height / 2
      const side: 'top' | 'bottom' = top ? 'top' : 'bottom'
      if (colMarkEl !== el || colMarkEdge !== side) {
        clearColMark()
        const color = 'rgba(56,139,253,0.95)'
        el.style.boxShadow = top ? `inset 0 2px 0 0 ${color}` : `inset 0 -2px 0 0 ${color}`
        colMarkEl = el
        colMarkEdge = side
      }
    })
    col.addEventListener('dragleave', () => clearColMark())
    col.addEventListener('drop', async () => {
      if (!dragging) return
      const id = dragging.getAttribute('data-task') as string
      const target = (col as HTMLElement).getAttribute('data-col') as Status
      clearColMark()
      if (id.startsWith('gh-')) {
        // Update GitHub
        const num = id.replace('gh-', '')
        try {
          await apiFetch(`/projects/${pid}/issues/${num}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: target }) })
          if (target === 'done') {
            const login = dragging.getAttribute('data-assignee') || ''
            if (login) {
              await apiFetch(`/projects/${pid}/issues/assign-next`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login }) })
            }
          }
        } catch { }
      } else {
        const tasks = loadTasks(pid)
        const idx = tasks.findIndex((t) => t.id === id)
        if (idx >= 0) tasks[idx].status = target
        saveTasks(pid, tasks)
      }
      renderKanban(root, pid, targetId)
      try { refreshDynamicWidgets(root, pid) } catch { }
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

  // 追加UIは存在しないため、イベントは付与しない

  // Sync Task Summary widget with current board state
  try { refreshDynamicWidgets(root, pid) } catch { }
}

// (global delegated handler removed to avoid multiple popups)

function columnHtml(status: Status, tasks: Task[]): string {
  const def = STATUS_DEF[status]
  return `
    <section class="rounded-xl ring-2 ring-neutral-600 bg-neutral-900/60 overflow-hidden flex flex-col" data-col="${status}">
      <header class="px-3 py-2 ${def.color} text-white text-sm flex items-center">
        <span>${def.label}</span>
        <button class="ml-auto kb-add text-[11px] bg-white/10 hover:bg-white/20 rounded px-2 py-0.5" data-col="${status}">＋ 追加</button>
      </header>
      <div class="p-2 space-y-3 min-h-[300px]">
        ${tasks.map(taskCard).join('')}
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
    <div class="rounded-lg ring-2 ring-neutral-600 bg-neutral-800/80 p-3 cursor-grab shadow-sm" draggable="true" data-task="${t.id}">
      <div class="flex items-start justify-between">
        <div class="text-xs text-gray-400">${String(t.id).startsWith('gh-') ? '<span class=\\"text-white\\"></span> #' + String(t.id).slice(3) : '#' + t.id}</div>
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

// Minimal modal for GitHub-linked tasks
// (legacy minimal GH modal removed; replaced with openTaskModalGh in task-modal.ts)

// New Task modal (rich form)
function openNewTaskModal(root: HTMLElement, pid: string, status: Status, targetId?: string): void {
  const old = document.getElementById('newTaskOverlay')
  if (old) old.remove()
  const overlay = document.createElement('div')
  overlay.id = 'newTaskOverlay'
  overlay.className = 'fixed inset-0 z-[82] bg-black/60 grid place-items-center fade-overlay'
  overlay.innerHTML = `
    <div class="relative w-[min(980px,95vw)] overflow-hidden rounded-xl bg-neutral-900 ring-2 ring-neutral-600 text-gray-100 pop-modal modal-fixed flex flex-col">
      <div class="flex items-center h-12 px-6 border-b border-neutral-600 shrink-0">
        <div class="text-lg font-semibold">新しいタスクを追加</div>
        <button class="ml-auto text-2xl text-neutral-300 hover:text-white" id="nt-close">×</button>
      </div>
      <div class="flex-1 p-6 space-y-8 overflow-y-auto">
        <!-- Section 1: General -->
        <div class="flex items-start gap-3">
          <div class="w-6 h-6 rounded-full bg-neutral-800 ring-2 ring-neutral-600 grid place-items-center text-sm">1</div>
          <section class="flex-1 space-y-4">
            <h3 class="text-base font-medium">一般</h3>
            <div class="flex items-center gap-4">
              <div class="text-sm text-gray-400 w-24">担当者</div>
              <label class="flex items-center gap-2 text-sm text-gray-300"><input id="nt-auto" type="checkbox" class="accent-emerald-600" checked> 自動割り当て</label>
              <span class="text-gray-500">/</span>
              <select id="nt-assigneeSel" class="rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-2 text-gray-100">
                <option value="">（選択）</option>
              </select>
              <input id="nt-assignee" type="text" class="flex-1 rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-gray-100 placeholder:text-gray-500" placeholder="自由入力（任意）" />
            </div>
            <div class="flex items-center gap-4">
              <div class="text-sm text-gray-400 w-24">タスク名</div>
              <input id="nt-title" type="text" required class="flex-1 rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-gray-100 placeholder:text-gray-500" placeholder="タスク名" />
            </div>
            <p id="nt-err-title" class="text-rose-400 text-sm hidden">タスク名を入力してください。</p>
            <div>
              <div class="text-sm text-gray-400 mb-1">タスク説明</div>
              <textarea id="nt-desc" rows="5" class="w-full rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-gray-100 placeholder:text-gray-500" placeholder="説明（任意）"></textarea>
            </div>
          </section>
        </div>

        <!-- Section 2: Config -->
        <div class="flex items-start gap-3">
          <div class="w-6 h-6 rounded-full bg-neutral-800 ring-2 ring-neutral-600 grid place-items-center text-sm">2</div>
          <section class="flex-1 space-y-4">
            <h3 class="text-base font-medium">構成</h3>
            <div class="rounded-lg ring-2 ring-neutral-600 bg-neutral-900/40 p-4 space-y-3">
              <div class="text-sm text-gray-300">タスク種別を選択</div>
              <div class="flex justify-end"><select id="nt-type" class="rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-1.5 text-gray-100"><option value="feature">feature</option><option value="bug">bug</option><option value="chore">chore</option></select></div>
            </div>
            <div class="rounded-lg ring-2 ring-neutral-600 bg-neutral-900/40 p-4 space-y-3">
              <div class="text-sm text-gray-300">期日を選択</div>
              <div class="flex justify-end"><input id="nt-due" type="date" class="rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-1.5 text-gray-100"/></div>
            </div>
            <div class="rounded-lg ring-2 ring-neutral-600 bg-neutral-900/40 p-4 space-y-3">
              <div class="text-sm text-gray-300">タスク優先度を選択</div>
              <div class="flex justify-end"><select id="nt-priority" class="rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-1.5 text-gray-100"><option>自動設定</option><option>高</option><option selected>中</option><option>低</option></select></div>
            </div>
            <div class="rounded-lg ring-2 ring-neutral-600 bg-neutral-900/40 p-4 space-y-3">
              <div class="text-sm text-gray-300">スキル要件を選択</div>
              <div id="nt-skills" class="flex flex-wrap gap-2">${['Ruby', 'Python', 'Dart', 'Java', 'JavaScript', 'HTML', 'CSS'].map((s, i) => `<button class=\"nt-skill px-3 py-1.5 rounded-full text-sm ring-2 ${i === 0 ? 'bg-emerald-700 text-white ring-emerald-600' : 'bg-neutral-800/60 text-gray-200 ring-neutral-600'}\" data-skill=\"${s}\">${s}</button>`).join('')}</div>
              <p class="text-xs text-center text-gray-400">+ すべてみる</p>
            </div>
          </section>
        </div>
        <p id="nt-err-api" class="text-rose-400 text-sm hidden">GitHub にタスクを作成できませんでした。</p>
      </div>
      <div class="p-4 border-t border-neutral-600 bg-neutral-900/80 flex justify-end shrink-0">
        <button id="nt-submit" class="rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2">タスクを追加</button>
      </div>
    </div>`
  const close = () => overlay.remove()
    ; (overlay as any).onclick = (e: MouseEvent) => { if (e.target === overlay) close() }
  (overlay.querySelector('#nt-close') as HTMLElement | null)?.addEventListener('click', close)

  // Toggle skills selection
  overlay.querySelectorAll('.nt-skill').forEach((chip) => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('bg-emerald-700')
      chip.classList.toggle('text-white')
      chip.classList.toggle('ring-emerald-600')
      chip.classList.toggle('bg-neutral-800/60')
      chip.classList.toggle('text-gray-200')
      chip.classList.toggle('ring-neutral-600')
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

  (overlay.querySelector('#nt-submit') as HTMLElement | null)?.addEventListener('click', async () => {
    const title = (overlay.querySelector('#nt-title') as HTMLInputElement).value.trim()
    if (!title) { (overlay.querySelector('#nt-err-title') as HTMLElement).classList.remove('hidden'); return }
    const apiErr = overlay.querySelector('#nt-err-api') as HTMLElement | null
    if (apiErr) { apiErr.classList.add('hidden'); apiErr.textContent = 'GitHub にタスクを作成できませんでした。' }
    const due = (overlay.querySelector('#nt-due') as HTMLInputElement).value || undefined
    const pr = ((overlay.querySelector('#nt-priority') as HTMLSelectElement).value || '中') as Task['priority']
    const sel = assigneeSel?.value?.trim() || ''
    const asg = (auto && auto.checked) ? 'あなた' : (sel || (assignee?.value.trim() || 'Sh1ragami'))
    const desc = (overlay.querySelector('#nt-desc') as HTMLTextAreaElement).value.trim()
    const typeSel = (overlay.querySelector('#nt-type') as HTMLSelectElement | null)?.value || 'feature'
    const repoFull = (root as HTMLElement).getAttribute('data-repo-full') || ((document.querySelector('[data-repo-full]') as HTMLElement | null)?.getAttribute('data-repo-full') || '')
    if (!repoFull) {
      if (apiErr) { apiErr.textContent = 'このプロジェクトはGitHubに未連携のため、タスクを作成できません。設定からリポジトリをリンクしてください。'; apiErr.classList.remove('hidden') }
      return
    }
    try {
      const labels: string[] = []
      const typedAssignee = (assignee?.value?.trim() || '')
      const assignees = (auto && auto.checked) ? [] : (sel ? [sel] : (typedAssignee ? [typedAssignee] : []))
      const body = [desc || '']
        .concat(due ? [`\n\n期限: ${due}`] : [])
        .concat(pr && pr !== '自動設定' ? [`\n優先度: ${pr}`] : [])
        .join('')
      await apiFetch(`/projects/${pid}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, status, type: typeSel, assignees, labels })
      })
      close(); renderKanban(root, pid, targetId || 'kb-board'); try { refreshDynamicWidgets(root, pid) } catch { }
    } catch (e: any) {
      if (apiErr) { apiErr.classList.remove('hidden') }
      return
    }
  })
  document.body.appendChild(overlay)
}

function loadTasks(pid: string): Task[] {
  const raw = localStorage.getItem(`kb-${pid}`)
  if (raw) {
    try { return JSON.parse(raw) as Task[] } catch { }
  }
  // no default tasks; start empty when not linked to GitHub
  return []
}

function saveTasks(pid: string, tasks: Task[]): void {
  localStorage.setItem(`kb-${pid}`, JSON.stringify(tasks))
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
