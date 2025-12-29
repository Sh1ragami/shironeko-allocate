import { apiFetch, ApiError } from '../../utils/api'
import { openTaskModal, openTaskModalGh } from './task-modal'
import { renderNotFound } from '../not-found/not-found'
import { getTheme, setTheme } from '../../utils/theme'
import { hideRouteLoading, showRouteLoading, finishSeamless } from '../../utils/route-loading'
import { honeyHexEmptySvg, honeyHexFilledSvg } from '../../utils/honeycomb'
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
// Simple inline icons for account tabs
const ICON_USER = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="currentColor" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.87 0-7 3.13-7 7h14c0-3.87-3.13-7-7-7z"/></svg>'
// Slightly lighten a hex color by pct (0..1)
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
// Derive darker side and lighter highlight from a base rgba()/rgb() color
function deriveFacets(main: string): { side: string; hi: string } {
  const m = main.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\)$/)
  if (!m) return { side: main, hi: main }
  const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10)
  const a = m[4] != null ? Math.max(0, Math.min(1, parseFloat(m[4]))) : 1
  const clamp = (x: number) => Math.max(0, Math.min(255, Math.round(x)))
  const sr = clamp(r * 0.35), sg = clamp(g * 0.35), sb = clamp(b * 0.35)
  const sa = Math.max(0.65, Math.min(0.9, a + 0.30))
  const hr = clamp(r + (255 - r) * 0.12)
  const hg = clamp(g + (255 - g) * 0.12)
  const hb = clamp(b + (255 - b) * 0.12)
  const ha = Math.max(0.16, Math.min(0.3, a + 0.06))
  return { side: `rgba(${sr},${sg},${sb},${sa})`, hi: `rgba(${hr},${hg},${hb},${ha})` }
}
const ICON_BELL = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="currentColor" aria-hidden="true"><path d="M12 22a2 2 0 002-2h-4a2 2 0 002 2zm6-6v-5a6 6 0 00-4.5-5.82V4a1.5 1.5 0 10-3 0v1.18A6 6 0 006 11v5l-2 2v1h16v-1l-2-2z"/></svg>'
const ICON_PALETTE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 100 18h1a2 2 0 002-2 2 2 0 012-2h1a4 4 0 100-8h-1a1 1 0 01-1-1 4 4 0 00-4-4zm-5.5 8A1.5 1.5 0 118 9.5 1.5 1.5 0 016.5 11zm3 3A1.5 1.5 0 1111 12.5 1.5 1.5 0 019.5 14zm5-6A1.5 1.5 0 1116 6.5 1.5 1.5 0 0114.5 8zm2 4A1.5 1.5 0 1118 10.5 1.5 1.5 0 0116.5 12z"/></svg>'
const ICON_BRUSH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M7 14c-2.21 0-4 1.79-4 4a3 3 0 006 0h5l6-6-5-5-6 6v5H7Zm9.586-9.586 2 2L17 8l-2-2 1.586-1.586Z"/></svg>'
// Icons for profile menu items
const ICON_SKILLS = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M4 4h7v7H4V4Zm0 9h7v7H4v-7Zm9-9h7v7h-7V4Zm0 9h7v7h-7v-7Z"/></svg>'
const ICON_WISH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 21s-6.716-3.858-9.193-7.335C1.084 11.62 2.02 8.8 4.46 7.67 6.227 6.844 8.23 7.24 9.5 8.5L12 11l2.5-2.5c1.27-1.26 3.273-1.656 5.04-.83 2.44 1.13 3.376 3.95 1.653 5.995C18.716 17.142 12 21 12 21Z"/></svg>'
function skillsKey(uid?: number, kind: SkillGroup = 'owned'): string { return `acct-skills-${uid ?? 'guest'}-${kind}` }
function loadSkills(uid?: number, kind: SkillGroup = 'owned'): string[] {
  try { return JSON.parse(localStorage.getItem(skillsKey(uid, kind)) || '[]') as string[] } catch { return [] }
}
function saveSkills(uid: number | undefined, kind: SkillGroup, list: string[]): void {
  localStorage.setItem(skillsKey(uid, kind), JSON.stringify(Array.from(new Set(list))))
}

// ---- Server-backed widget state (DB) ----
// Stored per project under `/projects/:id/widget-state` as a flat key-value map
const WS_CACHE = new Map<string, Record<string, any>>()
async function wsLoadAll(pid: string): Promise<Record<string, any>> {
  try {
    const data = await apiFetch<Record<string, any>>(`/projects/${pid}/widget-state`)
    WS_CACHE.set(pid, data || {})
    return data || {}
  } catch {
    const empty: Record<string, any> = {}
    WS_CACHE.set(pid, empty)
    return empty
  }
}
function wsGet(pid: string, key: string): any | null {
  const m = WS_CACHE.get(pid)
  return m ? (m[key] ?? null) : null
}
async function wsSet(pid: string, key: string, value: any | null): Promise<void> {
  try {
    await apiFetch<Record<string, any>>(`/projects/${pid}/widget-state`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    })
    const cur = WS_CACHE.get(pid) || {}
    if (value === null) { try { delete cur[key] } catch {} }
    else cur[key] = value
    WS_CACHE.set(pid, cur)
  } catch { /* ignore to keep UI responsive */ }
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
  <button type=\"button\" data-theme=\"${id}\" class=\"theme-option relative text-left rounded-lg ring-2 ring-neutral-600 bg-neutral-900/40 hover:ring-emerald-600 transition-colors\">\n    <div class=\"absolute right-2 top-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-700 text-white opacity-0\" data-check>選択中</div>\n    <div class=\"p-3 ${scopeClass}\">\n      <div class=\"h-5 rounded bg-neutral-900/80 ring-2 ring-neutral-600\"></div>\n      <div class=\"mt-2 flex gap-2\">\n        <div class=\"w-8 rounded bg-neutral-900/50 ring-2 ring-neutral-600 h-20\"></div>\n        <div class=\"flex-1 space-y-2\">\n          <div class=\"gh-card p-2\"><div class=\"h-3 w-1/3 rounded bg-blue-400/30\"></div><div class=\"mt-2 h-2 w-2/3 rounded bg-gray-400/30\"></div></div>\n          <div class=\"gh-card p-2\"><div class=\"h-3 w-1/4 rounded bg-emerald-400/30\"></div><div class=\"mt-2 h-2 w-1/2 rounded bg-gray-400/30\"></div></div>\n        </div>\n      </div>\n    </div>\n    <div class=\"mt-3 px-3 pb-3\">\n      <div class=\"text-[15px] font-medium text-gray-100\">${title}</div>\n      <div class=\"text-[12px] text-gray-400\">${desc}</div>\n    </div>\n  </button>`
}
export function openAccountModal(root: HTMLElement): void {
  // Prevent multiple overlays
  if (document.getElementById('accountOverlay')) return
  const me = (root as any)._me as { name?: string; email?: string; github_id?: number } | undefined
  const avatarUrl = me?.github_id ? `https://avatars.githubusercontent.com/u/${me.github_id}?s=128` : ''
  const overlay = document.createElement('div')
  overlay.id = 'accountOverlay'
  overlay.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] grid justify-center items-start pt-16 sm:pt-20 px-4'
  overlay.innerHTML = `
    <div class="relative w-[min(960px,92vw)] overflow-visible rounded-xl bg-neutral-800 ring-2 ring-neutral-600 shadow-2xl text-gray-100 pop-modal modal-fixed">
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
      <div id="leftPaneModalBg" class="hidden absolute inset-y-0 left-0" style="width:40%; background: rgba(64,72,84,0.78); border-top-left-radius:12px; border-bottom-left-radius:12px;"></div>
      <div class="relative h-[78vh]">
        
        <section class="relative h-full p-6 overflow-y-auto">
          <div class="tab-panel relative" data-tab="basic">
            <div id="acctBasicHeader" class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-full overflow-hidden bg-neutral-700 ring-2 ring-neutral-600">
                ${avatarUrl ? `<img src="${avatarUrl}" class="w-full h-full object-cover"/>` : ''}
              </div>
              <div>
                <div class="text-sm text-gray-400">連携中のGitHubアカウント</div>
                <div class="text-base">${me?.name ?? 'ゲスト'}</div>
              </div>
              <button id="logoutBtn" class="ml-auto inline-flex items-center rounded-md bg-rose-700 hover:bg-rose-600 text-white text-sm font-medium px-3 py-1.5">ログアウト</button>
            </div>
            <!-- Profile big card -->
            <section id="profileStart" class="mt-6">
              <div class="text-sm text-gray-400 mb-2">プロフィール</div>
              <div class="grid place-items-center min-h-[60vh]">
                <div id="profileCard" role="button" class="block cursor-pointer rounded-2xl w-[min(90%,720px)] aspect-[16/9] overflow-hidden">
                  <div id="profileCardInner" class="w-full h-full"></div>
                </div>
              </div>
            </section>

            <!-- Profile editor view (hidden by default) -->
            <section id="profileEditor" class="hidden">
              <div class="relative flex items-stretch gap-6 h-[60vh]" style="height: calc(78vh - 48px)">
                <aside class="relative z-10 basis-[40%] shrink-0 px-3 h-full">
                  <div class="flex items-center justify-start mb-3">
                    <button id="profBack" type="button" class="inline-flex items-center gap-1 text-sm text-gray-200 hover:text-white">
                      <span>←</span><span>閉じる</span>
                    </button>
                  </div>
                  <div class="mx-auto w-full max-w-[560px]">
                    <!-- メニュー一覧 -->
                  <div id="profMenuWrap" class="space-y-3">
                    <button class="prof-menu-btn w-full h-12 inline-flex items-center rounded-lg ring-2 ring-neutral-600 bg-neutral-900/60 hover:bg-neutral-900 px-3 text-[18px] font-medium" data-item="owned">
                      <span class="relative mr-3 grid place-items-center w-12 h-12 bg-neutral-700/60 rounded-sm ring-1 ring-neutral-600 overflow-hidden">
                        <span class="absolute inset-y-0 left-0" style="width:16.66%; background-color: rgba(59,130,246,.7)"></span>
                        <span class="relative" style="color:#cde2ff">${ICON_SKILLS}</span>
                      </span>
                      <span>所持スキル</span>
                    </button>
                    <button class="prof-menu-btn w-full h-12 inline-flex items-center rounded-lg ring-2 ring-neutral-600 bg-neutral-900/60 hover:bg-neutral-900 px-3 text-[18px] font-medium" data-item="want">
                      <span class="relative mr-3 grid place-items-center w-12 h-12 bg-neutral-700/60 rounded-sm ring-1 ring-neutral-600 overflow-hidden">
                        <span class="absolute inset-y-0 left-0" style="width:16.66%; background-color: rgba(217,70,239,.7)"></span>
                        <span class="relative" style="color:#ffd6ff">${ICON_WISH}</span>
                      </span>
                      <span>希望スキル一覧</span>
                    </button>
                    <button class="prof-menu-btn w-full h-12 inline-flex items-center rounded-lg ring-2 ring-neutral-600 bg-neutral-900/60 hover:bg-neutral-900 px-3 text-[18px] font-medium" data-item="design">
                      <span class="relative mr-3 grid place-items-center w-12 h-12 bg-neutral-700/60 rounded-sm ring-1 ring-neutral-600 overflow-hidden">
                        <span class="absolute inset-y-0 left-0" style="width:16.66%; background-color: rgba(250,204,21,.7)"></span>
                        <span class="relative" style="color:#fff2b0">${ICON_BRUSH}</span>
                      </span>
                      <span>デザイン変更</span>
                    </button>
                  </div>

                    <!-- メニュー個別の選択欄 -->
                    <div id="menuEditWrap" class="hidden mt-1">
                      <div id="editTitle" class="hidden"></div>
                      <div id="menuEdit"></div>
                    </div>
                  </div>
                </aside>
                <section class="relative z-10 basis-[60%] shrink-0 grid place-items-center h-full">
                  <div id="cardPreview" class="rounded-2xl w-[min(90%,720px)] aspect-[16/9] overflow-hidden"></div>
                </section>
              </div>
            </section>
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
  // Tab activation logic (icon-only tabs + accent + floating label)
  const tabsRow = overlay.querySelector('#acctTabs') as HTMLElement | null
  const accent = overlay.querySelector('#acctAccent') as HTMLElement | null
  const label = overlay.querySelector('#acctTabLabel') as HTMLElement | null
  const labelText = overlay.querySelector('#acctTabLabelText') as HTMLElement | null
  let currentTabEl: HTMLElement | null = null
  // ---- Profile card + editor helpers ----
  type ProfileData = { name: string; owned: string[]; want: string[]; avatar?: string; theme?: string }
  const meId = (root as any)._me?.id as number | undefined
  const getProfile = (): ProfileData => ({
    name: me?.name || 'ゲスト',
    owned: loadSkills(meId, 'owned') || [],
    want: loadSkills(meId, 'want') || [],
    avatar: avatarUrl || '',
    theme: loadCardTheme(meId)
  })
  const CARD_THEMES: { id: string; name: string; a: string; b: string }[] = [
    { id: 'ocean', name: 'オーシャン', a: '#0ea5e9', b: '#1e3a8a' },
    { id: 'sunset', name: 'サンセット', a: '#f97316', b: '#ef4444' },
    { id: 'grape', name: 'グレープ', a: '#7c3aed', b: '#a855f7' },
    { id: 'forest', name: 'フォレスト', a: '#065f46', b: '#10b981' },
    { id: 'sakura', name: 'さくら', a: '#f472b6', b: '#fca5a5' },
    { id: 'steel', name: 'スティール', a: '#334155', b: '#0f172a' }
  ]
  function themeById(id?: string) { return CARD_THEMES.find(t => t.id === id) || CARD_THEMES[0] }
  function cardThemeKey(uid?: number) { return `acct-card-theme-${uid ?? 'guest'}` }
  function loadCardTheme(uid?: number): string { try { return localStorage.getItem(cardThemeKey(uid)) || 'ocean' } catch { return 'ocean' } }
  function saveCardTheme(uid: number | undefined, id: string) { localStorage.setItem(cardThemeKey(uid), id) }
  const chip = (s: string) => `<span class=\"inline-flex items-center px-2 py-0.5 rounded-full ring-1 ring-neutral-600 bg-neutral-800/70 text-gray-100 mr-1 mb-1\" style=\"font-size:var(--chip-fs,12px)\">${skillIcon(s)}${s}</span>`
  const renderCardPreview = (data: ProfileData): string => {
    const own = (data.owned || []).filter((s) => ALL_SKILLS.includes(s))
    const want = (data.want || []).filter((s) => ALL_SKILLS.includes(s))
    const th = themeById(data.theme)
    const bg = `linear-gradient(135deg, ${th.a} 0%, ${th.b} 100%)`
    return `
      <div class=\"gh-card-root w-full h-full rounded-xl overflow-hidden\" style=\"background:${bg}; font-size:var(--card-fs,14px)\"> 
        <div class=\"flex items-center gap-3 bg-neutral-900/40\" style=\"padding: var(--pad,16px)\">
          <div class=\"rounded-full overflow-hidden bg-neutral-700 ring-1 ring-neutral-600\" style=\"width:var(--avatar,48px); height:var(--avatar,48px)\">${data.avatar ? `<img src='${data.avatar}' class='w-full h-full object-cover'/>` : ''}</div>
          <div>
            <div class=\"font-semibold\" style=\"font-size:var(--name-fs,15px)\">${data.name}</div>
            <div class=\"text-gray-300/80\" style=\"font-size:var(--label-fs,12px)\">Profile Card</div>
          </div>
        </div>
        <div style=\"padding: var(--pad,16px)\">
          <div class=\"text-gray-200/80 mb-1\" style=\"font-size:var(--label-fs,12px)\">所有スキル</div>
          <div class=\"flex flex-wrap\">${own.length ? own.map(chip).join('') : '<span class="text-[12px] text-gray-500">未選択</span>'}</div>
          <div class=\"mt-3 text-gray-200/80 mb-1\" style=\"font-size:var(--label-fs,12px)\">希望スキル</div>
          <div class=\"flex flex-wrap\">${want.length ? want.map(chip).join('') : '<span class="text-[12px] text-gray-500">未選択</span>'}</div>
        </div>
      </div>`
  }
  const mountStartCard = () => {
    const box = overlay.querySelector('#profileCardInner') as HTMLElement | null
    if (box) box.innerHTML = renderCardPreview(getProfile())
    const prev = overlay.querySelector('#cardPreview') as HTMLElement | null
    if (prev) { prev.innerHTML = renderCardPreview(getProfile()); try { tuneCardScale(prev as HTMLElement) } catch {} }
    window.addEventListener('resize', () => { try { tuneCardScale(box?.parentElement as HTMLElement) } catch {} ; try { tuneCardScale(prev as HTMLElement) } catch {} }, { passive: true })
    try { tuneCardScale(box?.parentElement as HTMLElement) } catch {}
    try { tuneCardScale(prev as HTMLElement) } catch {}
  }
  function tuneCardScale(container?: HTMLElement | null) {
    if (!container) return
    const wrapAndScale = () => {
      let root = container.querySelector('.gh-card-root') as HTMLElement | null
      if (!root) return
      let sizer = container.querySelector('.gh-card-sizer') as HTMLElement | null
      if (!sizer) {
        const wrap = document.createElement('div')
        wrap.className = 'gh-card-wrap w-full h-full'
        wrap.style.setProperty('--s', '1')
        sizer = document.createElement('div')
        sizer.className = 'gh-card-sizer'
        sizer.style.transformOrigin = 'top left'
        sizer.style.width = '720px'
        sizer.style.height = '405px'
        root.style.width = '720px'
        root.style.height = '405px'
        root.parentElement?.insertBefore(wrap, root)
        wrap.appendChild(sizer)
        sizer.appendChild(root)
      }
      const w = Math.round(container.getBoundingClientRect().width || 0)
      if (!w) { requestAnimationFrame(wrapAndScale); return }
      const s = Math.max(0.1, Math.min(2, w / 720))
      ;(container.querySelector('.gh-card-sizer') as HTMLElement).style.transform = `scale(${s})`
    }
    wrapAndScale()
  }
  const showEditor = (on: boolean) => {
    const start = overlay.querySelector('#profileStart') as HTMLElement | null
    const editor = overlay.querySelector('#profileEditor') as HTMLElement | null
    const head = overlay.querySelector('#acctBasicHeader') as HTMLElement | null
    const leftBg = overlay.querySelector('#leftPaneModalBg') as HTMLElement | null
    start?.classList.toggle('hidden', on)
    editor?.classList.toggle('hidden', !on)
    head?.classList.toggle('hidden', on)
    if (leftBg) leftBg.classList.toggle('hidden', !on)
  }
  const showMenuList = (on: boolean) => {
    const menu = overlay.querySelector('#profMenuWrap') as HTMLElement | null
    const edit = overlay.querySelector('#menuEditWrap') as HTMLElement | null
    menu?.classList.toggle('hidden', !on)
    edit?.classList.toggle('hidden', on)
  }
  const openCategory = (kind: 'owned' | 'want' | 'design') => {
    markMenu(kind)
    const title = overlay.querySelector('#editTitle') as HTMLElement | null
    if (title) title.textContent = kind === 'owned' ? '所持スキル' : (kind === 'want' ? '希望スキル一覧' : 'デザイン変更')
    if (kind === 'design') renderEditorDesign(); else renderEditorSkillsGrid(kind)
    showMenuList(false)
    const prev = overlay.querySelector('#cardPreview') as HTMLElement | null
    if (prev) { prev.innerHTML = renderCardPreview(getProfile()); try { tuneCardScale(prev as HTMLElement) } catch {} }
  }
  const markMenu = (id: 'owned' | 'want' | 'design') => {
    overlay.querySelectorAll('.prof-menu-btn').forEach((b) => {
      const active = (b as HTMLElement).getAttribute('data-item') === id
      b.classList.toggle('bg-neutral-800', active)
      b.classList.toggle('ring-emerald-600', active)
      b.classList.toggle('text-white', active)
    })
  }
  // Grid-style skills selector (no extra headers or inner frames)
  const renderEditorSkillsGrid = (kind: 'owned' | 'want') => {
    const cont = overlay.querySelector('#menuEdit') as HTMLElement | null
    if (!cont) return
    const seed = ALL_SKILLS
    const key = kind === 'owned' ? '_pgOwned' : '_pgWant'
    let page = (overlay as any)[key] || 0
    const colKey = kind === 'owned' ? '_colsOwned' : '_colsWant'
    const ROWS = 4
    const measureCols = (): number => {
      const aside = cont.closest('aside') as HTMLElement | null
      const availW = Math.max(240, Math.min(560, (aside?.clientWidth || 560)))
      return Math.max(1, Math.floor(availW / 120))
    }
    if ((overlay as any)[colKey] == null) (overlay as any)[colKey] = measureCols()
    const draw = () => {
      const cols = Math.max(1, (overlay as any)[colKey] as number)
      const perPage = Math.max(1, cols * ROWS)
      const total = Math.max(1, Math.ceil(seed.length / perPage))
      page = Math.min(page, total - 1)
      ;(overlay as any)[key] = page
      const selected = new Set(loadSkills(meId, kind).filter((s) => ALL_SKILLS.includes(s)))
      const items = seed.slice(page * perPage, page * perPage + perPage)
      cont.innerHTML = `
        <div class="mx-auto w-full max-w-[560px]">
          <div class="sk-grid grid gap-2" style="grid-template-columns: repeat(${cols},minmax(0,1fr));">
            ${items.map((s) => `<button class=\"skill-pill grid place-items-center gap-1 p-2 rounded-lg ring-2 ${selected.has(s) ? 'bg-emerald-700/40 text-white ring-emerald-600' : 'bg-neutral-800/60 text-gray-200 ring-neutral-600'}\" style=\"aspect-ratio:1/1\" data-skill=\"${s}\">${skillIcon(s)}<span class=\"text-xs\">${s}</span></button>`).join('')}
          </div>
          <div class="mt-3 flex justify-center items-center gap-3">
            <button class="pg-prev px-3 py-1 rounded bg-neutral-800/60 ring-1 ring-neutral-600 text-sm disabled:opacity-50" ${page<=0?'disabled':''}>◀</button>
            <span class="text-xs text-gray-300">${page+1} / ${total}</span>
            <button class="pg-next px-3 py-1 rounded bg-neutral-800/60 ring-1 ring-neutral-600 text-sm disabled:opacity-50" ${page>=total-1?'disabled':''}>▶</button>
          </div>
        </div>`
      cont.querySelectorAll('.skill-pill')?.forEach((el) => {
        el.addEventListener('click', () => {
          const btn = el as HTMLElement
          const name = btn.getAttribute('data-skill') || ''
          const cur = new Set(loadSkills(meId, kind))
          if (cur.has(name)) cur.delete(name); else cur.add(name)
          saveSkills(meId, kind, Array.from(cur))
          btn.classList.toggle('bg-emerald-700/40')
          btn.classList.toggle('text-white')
          btn.classList.toggle('ring-emerald-600')
          btn.classList.toggle('bg-neutral-800/60')
          btn.classList.toggle('text-gray-200')
          btn.classList.toggle('ring-neutral-600')
          const c = overlay.querySelector('#cardPreview') as HTMLElement | null
          if (c) { c.innerHTML = renderCardPreview(getProfile()); try { tuneCardScale(c as HTMLElement) } catch {} }
        })
      })
      ;(cont.querySelector('.pg-prev') as HTMLButtonElement | null)?.addEventListener('click', () => { if (page>0) { page--; (overlay as any)[key]=page; draw() } })
      ;(cont.querySelector('.pg-next') as HTMLButtonElement | null)?.addEventListener('click', () => { if (page<total-1) { page++; (overlay as any)[key]=page; draw() } })
      if (!(overlay as any)._pgResizeBound) {
        window.addEventListener('resize', () => {
          const newCols = measureCols()
          if (newCols !== (overlay as any)[colKey]) { (overlay as any)[colKey] = newCols; draw() }
        }, { passive: true })
        ;(overlay as any)._pgResizeBound = true
      }
    }
    draw()
  }
  const renderEditorSkillsOld = (kind: 'owned' | 'want') => {
    const cont = overlay.querySelector('#menuEdit') as HTMLElement | null
    if (!cont) return
    const selected = new Set(loadSkills(meId, kind).filter((s) => ALL_SKILLS.includes(s)))
    const seed = ALL_SKILLS
    cont.innerHTML = `
      <div class=\"flex items-center justify-between mb-2\">
        <div class=\"text-sm text-gray-200\">${kind === 'owned' ? '所有スキルを選択' : '希望スキルを選択'}</div>
        <div class=\"text-[12px] text-gray-400\">${selected.size} 件選択</div>
      </div>
      <div class=\"rounded-lg ring-2 ring-neutral-600 bg-neutral-900/40 p-3 flex flex-wrap gap-2\">
        ${seed.map((s) => `<button class=\\"skill-pill px-3 py-1.5 rounded-full text-sm ring-2 ${selected.has(s) ? 'bg-emerald-700 text-white ring-emerald-600' : 'bg-neutral-800/60 text-gray-200 ring-neutral-600'}\\" data-skill=\\"${s}\\">${skillIcon(s)}${s}</button>`).join('')}
      </div>`
    cont.querySelectorAll('.skill-pill')?.forEach((el) => {
      el.addEventListener('click', () => {
        const btn = el as HTMLElement
        const name = btn.getAttribute('data-skill') || ''
        const cur = new Set(loadSkills(meId, kind))
        if (cur.has(name)) cur.delete(name); else cur.add(name)
        saveSkills(meId, kind, Array.from(cur))
        // toggle styles
        btn.classList.toggle('bg-emerald-700')
        btn.classList.toggle('text-white')
        btn.classList.toggle('ring-emerald-600')
        btn.classList.toggle('bg-neutral-800/60')
        btn.classList.toggle('text-gray-200')
        btn.classList.toggle('ring-neutral-600')
        // update preview + counter
        const c = overlay.querySelector('#cardPreview') as HTMLElement | null
        if (c) { c.innerHTML = renderCardPreview(getProfile()); try { tuneCardScale(c as HTMLElement) } catch {} }
        const counter = cont.querySelector('div.text-[12px].text-gray-400') as HTMLElement | null
        if (counter) counter.textContent = `${cur.size} 件選択`
      })
    })
  }
  const renderEditorSkills = (kind: 'owned' | 'want') => {
    const cont = overlay.querySelector('#menuEdit') as HTMLElement | null
    if (!cont) return
    const selected = new Set(loadSkills(meId, kind).filter((s) => ALL_SKILLS.includes(s)))
    const seed = ALL_SKILLS
    cont.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm text-gray-200">${kind === 'owned' ? '所有スキルを選択' : '希望スキルを選択'}</div>
        <div class="text-[12px] text-gray-400">${selected.size} 件選択</div>
      </div>
      <div class="rounded-lg ring-2 ring-neutral-600 bg-neutral-900/40 p-3 min-h-[260px] overflow-auto">
        <div class="sk-grid grid gap-2" style="grid-template-columns: repeat(auto-fill,minmax(140px,1fr));"></div>
      </div>`
    const grid = cont.querySelector('.sk-grid') as HTMLElement | null
    if (grid) grid.innerHTML = seed.map((s) => `
      <button class="skill-pill flex items-center gap-2 px-3 py-2 rounded-lg ring-2 ${selected.has(s) ? 'bg-emerald-700/40 text-white ring-emerald-600' : 'bg-neutral-800/60 text-gray-200 ring-neutral-600'}" data-skill="${s}">
        ${skillIcon(s)}<span class="text-sm">${s}</span>
      </button>
    `).join('')
    cont.querySelectorAll('.skill-pill')?.forEach((el) => {
      el.addEventListener('click', () => {
        const btn = el as HTMLElement
        const name = btn.getAttribute('data-skill') || ''
        const cur = new Set(loadSkills(meId, kind))
        if (cur.has(name)) cur.delete(name); else cur.add(name)
        saveSkills(meId, kind, Array.from(cur))
        btn.classList.toggle('bg-emerald-700/40')
        btn.classList.toggle('text-white')
        btn.classList.toggle('ring-emerald-600')
        btn.classList.toggle('bg-neutral-800/60')
        btn.classList.toggle('text-gray-200')
        btn.classList.toggle('ring-neutral-600')
        const c = overlay.querySelector('#cardPreview') as HTMLElement | null
        if (c) { c.innerHTML = renderCardPreview(getProfile()); try { tuneCardScale(c as HTMLElement) } catch {} }
        const counter = cont.querySelector('div.text-[12px].text-gray-400') as HTMLElement | null
        if (counter) counter.textContent = `${cur.size} 件選択`
      })
    })
  }
  const renderEditorDesign = () => {
    const cont = overlay.querySelector('#menuEdit') as HTMLElement | null
    if (!cont) return
    const cur = loadCardTheme(meId)
    cont.innerHTML = `
      <div class="mx-auto w-full max-w-[560px]"><div class="th-grid grid gap-2" style="grid-template-columns: repeat(auto-fill,minmax(110px,1fr));"></div></div>`
    const grid = cont.querySelector('.th-grid') as HTMLElement | null
    if (grid) grid.innerHTML = CARD_THEMES.map((t) => `
      <button class="design-opt rounded-lg ring-2 ${t.id===cur?'ring-emerald-600 bg-neutral-800/60':'ring-neutral-600 bg-neutral-800/40'} overflow-hidden text-left" data-theme="${t.id}">
        <div class="h-16 w-full" style="background: linear-gradient(135deg, ${t.a} 0%, ${t.b} 100%)"></div>
        <div class="px-2 py-1 text-sm">${t.name}</div>
      </button>
    `).join('')
    cont.querySelectorAll('.design-opt')?.forEach((el) => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).getAttribute('data-theme') || 'ocean'
        saveCardTheme(meId, id)
        cont.querySelectorAll('.design-opt').forEach((n) => {
          const sel = (n as HTMLElement).getAttribute('data-theme') === id
          n.classList.toggle('ring-emerald-600', sel)
          n.classList.toggle('ring-neutral-600', !sel)
          n.classList.toggle('bg-neutral-800/60', sel)
          n.classList.toggle('bg-neutral-800/40', !sel)
        })
        const prev = overlay.querySelector('#cardPreview') as HTMLElement | null
    if (prev) { prev.innerHTML = renderCardPreview(getProfile()); try { tuneCardScale(prev as HTMLElement) } catch {} }
      })
    })
  }
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
    overlay.querySelectorAll('.tab-panel')?.forEach((p) => {
      (p as HTMLElement).classList.toggle('hidden', (p as HTMLElement).getAttribute('data-tab') !== id)
    })
    overlay.querySelectorAll('#acctTabs .tab-btn')?.forEach((b) => {
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
      // Place label so its上辺が線と重なる
      const labTop = Math.round(ar.bottom - rr.top)
      label.style.top = `${labTop}px`
      const minW = Math.max(br.width + 24, 110)
      label.style.minWidth = `${minW}px`
      // Center exactly under the active tab (許容してはみ出しOK)
      const cx = (btn as HTMLElement).offsetLeft + ((btn as HTMLElement).offsetWidth / 2)
      label.style.left = `${cx}px`
    }
    // Ensure left 2/5 overlay shows only on Basic tab while editor is open
    const leftOverlay = overlay.querySelector('#leftPaneModalBg') as HTMLElement | null
    if (leftOverlay) {
      const ed = overlay.querySelector('#profileEditor') as HTMLElement | null
      const editorShown = !!ed && !ed.classList.contains('hidden')
      leftOverlay.classList.toggle('hidden', !(id === 'basic' && editorShown))
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
    b.style.width = '80px'
    b.style.height = '48px'
  })
  activate(overlay.querySelector('#acctTabs .tab-btn[data-tab="basic"]') as HTMLElement | null)
  window.addEventListener('resize', () => { if (currentTabEl) activate(currentTabEl) }, { passive: true })
  // mount profile card content
  mountStartCard()
  // interactions to toggle editor
  overlay.querySelector('#profileCard')?.addEventListener('click', () => {
    showEditor(true)
    showMenuList(true)
    // initial preview
    const prev = overlay.querySelector('#cardPreview') as HTMLElement | null
    if (prev) { prev.innerHTML = renderCardPreview(getProfile()); try { tuneCardScale(prev as HTMLElement) } catch {} }
  })
  overlay.querySelector('#profBack')?.addEventListener('click', () => {
    const menuEdit = overlay.querySelector('#menuEditWrap') as HTMLElement | null
    // If currently in item edit, go back to menu list. Otherwise exit editor to card view.
    if (menuEdit && !menuEdit.classList.contains('hidden')) {
      showMenuList(true)
    } else {
      showEditor(false); mountStartCard()
    }
  })
  overlay.querySelector('#profMenuWrap')?.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('.prof-menu-btn') as HTMLElement | null
    if (!t) return
    const id = (t.getAttribute('data-item') || 'owned') as 'owned' | 'want' | 'design'
    openCategory(id)
  })
  // editBack button removed; use the left-arrow close button to return to menu list when editing
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
  color?: 'blue' | 'red' | 'green' | 'black' | 'white' | 'purple' | 'orange' | 'yellow' | 'gray'
}

/* Removed: browser-like project tabs bar and picker
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
        else { try { sessionStorage.setItem('pj-back-anim', '1') } catch {}; try { sessionStorage.setItem('pj-back-color', String((root as HTMLElement).getAttribute('data-pj-color') || '')) } catch {}; try { showRouteLoading('プロジェクト一覧', ((root as HTMLElement).getAttribute('data-pj-color') || undefined) as any, { style: 'single', spinMs: 950 }) } catch {}; window.location.hash = '#/project' }
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
  pop.querySelector('#ptp-new')?.addEventListener('click', () => { try { sessionStorage.setItem('pj-back-anim', '1') } catch {}; try { sessionStorage.setItem('pj-back-color', String((root as HTMLElement).getAttribute('data-pj-color') || '')) } catch {}; try { showRouteLoading('プロジェクト一覧', ((root as HTMLElement).getAttribute('data-pj-color') || undefined) as any, { style: 'single', spinMs: 950 }) } catch {}; window.location.hash = '#/project'; pop.remove() })
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
*/

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
      try { hideRouteLoading() } catch {}
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

  // Determine if we are entering from project list with native slide
  // (flag is set in project list before navigating)
  let entryDir: string | null = null
  try { entryDir = sessionStorage.getItem('proj-entry-dir') } catch {}
  const entryHidden = (entryDir === 'left' || entryDir === 'right')
  // Render the full layout once with all available data. Hide the hex field initially
  // when coming from list to prevent a one-frame central flash before animation setup.
  container.innerHTML = detailLayout({ id: project.id, name: project.name, fullName, owner, repo: repoName }, { entryHidden })
  // Default to non-edit mode when:
  // - arriving from list (entry animation flag present), OR
  // - the initial page load is a direct navigation to this detail (NavigationType 'navigate').
  // Do NOT override on reload/back-forward, and do NOT override when re-entering the
  // same project within the same SPA session.
  let navType: string | null = null
  try {
    const entries = (performance as any)?.getEntriesByType?.('navigation') || []
    if (entries && entries.length) navType = (entries[0] as any).type || null
    else if ((performance as any).navigation) {
      const t = (performance as any).navigation.type
      navType = (t === 0 ? 'navigate' : t === 1 ? 'reload' : t === 2 ? 'back_forward' : 'prerender')
    }
  } catch {}
  const prevPid = (window as any).__pdCurrentProjectId
  const sameProjectInSession = String(prevPid || '') === String(project.id)
  const isInitialNavigate = navType === 'navigate'
  if (entryHidden || (isInitialNavigate && !sameProjectInSession)) {
    try { localStorage.setItem(`wg-edit-${project.id}`, '0') } catch {}
  }
  ;(window as any).__pdCurrentProjectId = String(project.id)
  // Helper: Intro title float-up (will be invoked when arrival reaches center)
  const showIntroTitle = () => {
    try {
      const old = document.getElementById('pdIntroTitle'); if (old) old.remove()
      const el = document.createElement('div')
      el.id = 'pdIntroTitle'
      const title = (project?.github_meta?.ui?.alias || project?.name || repoName || '').toString()
      el.textContent = title
      document.body.appendChild(el)
      el.classList.add('pd-in')
      setTimeout(() => { el.classList.remove('pd-in'); el.classList.add('pd-out'); setTimeout(()=>el.remove(), 420) }, 1200)
    } catch {}
  }
  // If coming from list with native transition, slide in actual detail honeycomb and fade dimmer
  try {
    const dir = (entryDir || sessionStorage.getItem('proj-entry-dir'))
    if (dir === 'left' || dir === 'right') {
      try { (container as HTMLElement).setAttribute('data-arriving', '1') } catch {}
      const wrapD = container.querySelector('#hxwWrap') as HTMLElement | null
      const canvasD = container.querySelector('#hxwCanvas') as HTMLElement | null
      if (wrapD) wrapD.style.visibility = 'hidden'
      const durationMove = 800
      const durationGrow = 400
      // S-curve easing (easeInOutCubic): 徐々に加速→徐々に減速
      const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
      const now = () => performance.now()
      const animate = (dur: number, step: (t:number)=>void, done: ()=>void) => {
        const t0 = now()
        const tick = () => { const t = Math.min(1, (now()-t0)/dur); step(ease(t)); if (t<1) requestAnimationFrame(tick); else done() }
        requestAnimationFrame(tick)
      }
      const startArrival = () => {
        const stD: any = (wrapD as any)?._hxw
        if (!wrapD || !canvasD || !stD) { setTimeout(startArrival, 16); return }
        const origScale = stD.scale || 1
        const origX = stD.offsetX || 0
        // Set initial: small; compute centered Y at small scale
        // Prefer absolute unit size recorded in list (tile*scale) to match visual size exactly
        let targetScale = origScale * 0.6
        try {
          const unitSmall = parseFloat(sessionStorage.getItem('proj-small-unit') || '')
          const tile = stD.tile || 200
          if (isFinite(unitSmall) && unitSmall > 1) {
            targetScale = unitSmall / tile
          } else {
            const r = parseFloat(sessionStorage.getItem('proj-shrink-ratio') || '')
            if (isFinite(r) && r > 0.1 && r < 2.0) targetScale = origScale * r
          }
        } catch {}
        stD.scale = Math.max(0.1, targetScale)
        const viewW = wrapD.clientWidth || 0
        const viewH = wrapD.clientHeight || 0
        const contentWSmall = (stD.width || 0) * (stD.scale || 1)
        const contentHSmall = (stD.height || 0) * (stD.scale || 1)
        const targetXSmall = Math.round((viewW - contentWSmall) / 2)
        const targetYSmall = Math.round((viewH - contentHSmall) / 2)
        // Place offscreen horizontally, but vertically already centered → pure horizontal motion
        stD.offsetX = origX + (dir === 'left' ? -wrapD.clientWidth * 1.2 : wrapD.clientWidth * 1.2)
        stD.offsetY = targetYSmall
        try { (hxwApplyTransform as any)(wrapD, canvasD, stD) } catch {}
        wrapD.style.visibility = ''
        try { (wrapD.style as any).opacity = '0' } catch {}
        // Phase A: move in while small (horizontal only)
        const startXOff = stD.offsetX
        animate(durationMove, (t) => {
          stD.offsetX = Math.round(startXOff + (targetXSmall - startXOff) * t)
          stD.offsetY = targetYSmall
          try { (hxwApplyTransform as any)(wrapD, canvasD, stD) } catch {}
        }, () => {
          // Show intro title right after reaching center (small scale)
          try { showIntroTitle() } catch {}
          // Phase B: grow to normal scale centered on viewport
          const startS = stD.scale
          const zoomAtCenter = (s: number) => {
            const rect = wrapD.getBoundingClientRect()
            const cx2 = rect.width / 2
            const cy2 = rect.height / 2
            const prev = stD.scale
            const wx = (cx2 - stD.offsetX) / prev
            const wy = (cy2 - stD.offsetY) / prev
            stD.scale = s
            stD.offsetX = cx2 - wx * s
            stD.offsetY = cy2 - wy * s
            try { (hxwApplyTransform as any)(wrapD, canvasD, stD) } catch {}
          }
          animate(durationGrow, (t2) => {
            const s = startS + (origScale - startS) * t2
            zoomAtCenter(s)
          }, () => {
            // Re-enable group toast after transition fully completes
            try { sessionStorage.removeItem('suppress-group-toast'); document.body.removeAttribute('data-suppress-group-toast') } catch {}
            // Reveal entry-hidden UI parts (e.g., minimap wrapper)
            try { (container.querySelector('.hxw-mini') as HTMLElement | null)?.style.removeProperty('visibility') } catch {}
            // Let deferred hydration proceed
            try { window.dispatchEvent(new CustomEvent('pd-arrived', { detail: { id: project?.id } })) } catch {}
            // Clear entry flags now that animation is fully done
            try { (container as HTMLElement).removeAttribute('data-arriving') } catch {}
            try { sessionStorage.removeItem('proj-entry-dir') } catch {}
          })
        })
        // Fade out and remove pageDimmer quickly, fade in wrap
        const dim = document.getElementById('pageDimmer') as HTMLElement | null
        if (dim) { setTimeout(() => { dim.style.opacity = '0'; setTimeout(() => dim.remove(), 120) }, 10) }
        try { requestAnimationFrame(() => { (wrapD.style as any).opacity = '1' }) } catch {}
      }
      setTimeout(startArrival, 0)
    }
  } catch {}
  // Intercept breadcrumb click to run a reverse transition back to list (shrink then slide right)
  try {
    const bc = container.querySelector('#topPathUser') as HTMLAnchorElement | null
    bc?.addEventListener('click', (ev) => {
      ev.preventDefault()
      const wrap = container.querySelector('#hxwWrap') as HTMLElement | null
      const canvas = container.querySelector('#hxwCanvas') as HTMLElement | null
      const st: any = (wrap as any)?._hxw
      // Set flags for list arrival and suppress toasts during transition
      try { sessionStorage.setItem('pj-back-anim', '1') } catch {}
      try { sessionStorage.setItem('pj-back-color', String(project.color || '')) } catch {}
      // Remember which project tile to center on in the list
      try { sessionStorage.setItem('pj-back-focus-id', String(project.id)) } catch {}
      try { sessionStorage.setItem('suppress-group-toast', '1') } catch {}
      try { document.body.setAttribute('data-suppress-group-toast', '1') } catch {}
      // No route loading overlay when returning to list
      // If layout not ready, fallback to immediate navigation
      if (!wrap || !canvas || !st) { window.location.hash = '#/project'; return }
      const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
      const now = () => performance.now()
      const animate = (dur: number, step: (t:number)=>void, done: ()=>void) => {
        const t0 = now()
        const tick = () => { const tt = Math.min(1, (now()-t0)/dur); step(ease(tt)); if (tt<1) requestAnimationFrame(tick); else done() }
        requestAnimationFrame(tick)
      }
      const zoomAtCenter = (s: number) => {
        const rect = wrap.getBoundingClientRect()
        const cx2 = rect.width / 2
        const cy2 = rect.height / 2
        const effBefore = (function(){ try { return (hxwEffectiveScale as any)(wrap, st) } catch { return st.scale || 1 } })()
        const wx = (cx2 - st.offsetX) / (effBefore || 1)
        const wy = (cy2 - st.offsetY) / (effBefore || 1)
        st.scale = s
        try {
          const effAfter = (hxwEffectiveScale as any)(wrap, st)
          st.offsetX = Math.round(cx2 - wx * (effAfter || s))
          st.offsetY = Math.round(cy2 - wy * (effAfter || s))
        } catch {
          st.offsetX = Math.round(cx2 - wx * s)
          st.offsetY = Math.round(cy2 - wy * s)
        }
        try { (hxwApplyTransform as any)(wrap, canvas, st) } catch {}
      }
      const startScale = st.scale || 1
      const endScale = Math.max(0.1, startScale * 0.6)
      // Persist the ratio so list can mirror our small state if desired
      try { sessionStorage.setItem('pj-back-shrink-ratio', String(endScale / Math.max(0.0001, startScale))) } catch {}
      let sent = false
      const go = () => { if (sent) return; sent = true; window.location.hash = '#/project' }
      const durationShrink = 400
      const durationMove = 800
      // Phase 1: shrink around viewport center
      animate(durationShrink, (t) => {
        const s = startScale + (endScale - startScale) * t
        zoomAtCenter(s)
      }, () => {
        // Phase 2: pan right while small
        const startX = st.offsetX || 0
        const targetX = startX + Math.max(wrap.clientWidth * 1.2, 600)
        const startY = st.offsetY || 0
        animate(durationMove, (t2) => {
          st.offsetX = Math.round(startX + (targetX - startX) * t2)
          st.offsetY = startY
          try { (hxwApplyTransform as any)(wrap, canvas, st) } catch {}
        }, () => {})
        // Navigate near end of move so edge is gone
        setTimeout(go, Math.max(600, durationMove - 180))
        setTimeout(go, durationMove + 700) // absolute fallback
      })
    })
  } catch {}
  // expose project color for honeycomb widget field tone alignment
  try { (container as HTMLElement).setAttribute('data-pj-color', (project.color || 'blue') as string) } catch {}
  // Persist back color so browser back/gesture also uses vivid color
  try { sessionStorage.setItem('pj-back-color', String(project.color || 'blue')) } catch {}
  if (fullName) (container as HTMLElement).setAttribute('data-repo-full', fullName)
  // For seamless transition: complete final move (from offscreen to center) then fade out overlay
  try { finishSeamless() } catch { try { hideRouteLoading() } catch {} }

  // Store user data if fetched
  if (me) {
    (container as any)._me = me
  }

  // --- Start of post-render setup ---
  // Top project tabs and in-app back/forward navigation removed
  try { localStorage.removeItem('open-project-tabs'); sessionStorage.removeItem('proj-nav') } catch {}

  setupTabs(container, String(project.id))
  applyCoreTabs(container, String(project.id))
  // Build hex-grid widget field for Summary
  try { renderHexWidgets(container, String(project.id)) } catch { }
  // Re-run once after mount to avoid initial 0-size measurement shrinking the field
  try {
    const pidStr = String(project.id)
    setTimeout(() => { try { renderHexWidgets(container, pidStr) } catch {} }, 0)
  } catch {}
  // Watch the host size and re-render the hex grid if the viewport for it changes
  try {
    const wrap = container.querySelector('#hxwWrap') as HTMLElement | null
    if (wrap && !(wrap as any)._hxwRO) {
      const ro = new ResizeObserver((entries) => {
        const cr = entries[0]?.contentRect
        if (!cr) return
        const w = Math.round(cr.width)
        const h = Math.round(cr.height)
        const prev = (wrap as any)._hxwSize as [number, number] | undefined
        if (w > 0 && h > 0 && (!prev || prev[0] !== w || prev[1] !== h)) {
          ;(wrap as any)._hxwSize = [w, h]
          // Defer to next frame so CSS settles before rebuilding geometry
          requestAnimationFrame(() => { try { renderHexWidgets(container, String(project.id)) } catch {} })
        }
      })
      ro.observe(wrap)
      ;(wrap as any)._hxwRO = ro
    }
  } catch {}
  // Ensure essential widgets (tabbar, invite, account) exist at least once
  try {
    const pid = String(project.id)
    const meta = hxwGetMeta(pid)
    const hasType = (t: string) => Object.values(meta || {}).some((m: any) => (m?.type === t))
    let seeded = false
    if (!hasType('tabnew')) { try { hxwAddWidget(container, pid, 'tabnew') } catch {}; seeded = true }
    if (!hasType('invite')) { try { hxwAddWidget(container, pid, 'invite') } catch {}; seeded = true }
    if (!hasType('account')) { try { hxwAddWidget(container, pid, 'account') } catch {}; seeded = true }
    if (seeded) {
      // nothing to bind globally; tab switching is handled by widgets and top-left buttons
    }
  } catch { }

  // Reopen widget picker if returning from create screen via back
  try {
    const r = sessionStorage.getItem('wc-return-to-picker')
    if (r === '1') {
      sessionStorage.removeItem('wc-return-to-picker')
      setTimeout(() => { try { openWidgetPickerModal(container, String(project.id)) } catch {} }, 0)
    }
  } catch {}
  // Apply saved view mode (2D/3D)
  try {
    const wrap = container.querySelector('#hxwWrap') as HTMLElement | null
    const canvas = container.querySelector('#hxwCanvas') as HTMLElement | null
    // Ensure normal scroll direction (do not invert)
    try { if (wrap) wrap.removeAttribute('data-scroll-dir') } catch {}
    const key = `hxw-view-${project.id}`
    const iso = localStorage.getItem(key) === 'iso'
    if (iso) wrap?.classList.add('hxw-iso')
    const btn = container.querySelector('#hxwView3d') as HTMLElement | null
    const applyLabel = () => {
      if (!btn) return
      const on = !!wrap?.classList.contains('hxw-iso')
      btn.setAttribute('aria-pressed', on ? 'true' : 'false')
      btn.setAttribute('title', on ? '3D モード' : '2D モード')
      btn.setAttribute('aria-label', on ? '3D モード' : '2D モード')
      btn.classList.toggle('is-on', on)
      const lab = btn.querySelector('.ctl-label') as HTMLElement | null
      if (lab) lab.textContent = on ? '3D' : '2D'
    }
    applyLabel()
    btn?.addEventListener('click', () => {
      if (!wrap || !canvas) return
      const toIso = !wrap.classList.contains('hxw-iso')
      const st = (wrap as any)._hxw as any
      try { if (st) hxwToggleIsoKeepCenter(wrap, canvas, st, toIso) } catch {}
      localStorage.setItem(key, wrap.classList.contains('hxw-iso') ? 'iso' : '2d')
      applyLabel()
    })
  } catch {}
  // Bind Add (green hex)
  const fabBtn = container.querySelector('#hxwFab') as HTMLElement | null
  fabBtn?.addEventListener('click', () => {
    openWidgetPickerModal(container, String(project.id), (type) => {
      try { hxwStartPlacement(container, String(project.id), type) } catch {}
    })
  })

  // Global edit toggle (applies to current visible panel)
  const edt = container.querySelector('#wgEditToggle') as HTMLElement | null
  const applyEditTo = (on: boolean, name: string) => {
    const panel = container.querySelector(`section[data-tab="${name}"]`) as HTMLElement | null
    const grid = panel?.querySelector('#widgetGrid') as HTMLElement | null
    const hx = container.querySelector('#hxwCanvas') as HTMLElement | null
    if (name === 'summary') {
      if (hx && (hx as any)._setEdit) (hx as any)._setEdit(on)
      try { localStorage.setItem(`wg-edit-${project.id}`, on ? '1' : '0') } catch {}
    } else {
      if (grid && (grid as any)._setEdit) {
        const scoped = grid.getAttribute('data-pid') || ''
        (grid as any)._setEdit(on)
        try { if (scoped) localStorage.setItem(`wg-edit-${scoped}`, on ? '1' : '0') } catch {}
      }
    }
  }
  edt?.addEventListener('click', () => {
    const active = container.querySelector('section[data-tab]:not(.hidden)') as HTMLElement | null
    const name = active?.getAttribute('data-tab') || 'summary'
    // Determine current state
    let cur = false
    if (name === 'summary') {
      const hx = container.querySelector('#hxwCanvas') as HTMLElement | null
      cur = (hx?.getAttribute('data-edit') === '1')
    } else {
      const grid = active?.querySelector('#widgetGrid') as HTMLElement | null
      cur = (grid?.getAttribute('data-edit') === '1')
    }
    const next = !cur
    applyEditTo(next, name)
    // Also try to mirror to the other area if both exist
    if (name !== 'summary') applyEditTo(next, 'summary')
  })

  // Initialize edit label according to saved summary state
  try {
    const hx = container.querySelector('#hxwCanvas') as HTMLElement | null
    const saved = localStorage.getItem(`wg-edit-${project.id}`) === '1'
    if (hx && (hx as any)._setEdit) (hx as any)._setEdit(saved)
  } catch {}

  // Defer heavy hydration if we are in entry animation; show area only until arrival finishes
  const deferHydration = (entryDir === 'left' || entryDir === 'right')
  const resumeHydration = async () => {
    try { enableDragAndDrop(container) } catch {}
    try { renderKanban(container, String(project.id)) } catch {}
    try { loadCustomTabs(container, String(project.id)) } catch {}
    try { applySavedTabOrder(container, String(project.id)) } catch {}
    try { await wsLoadAll(String(project.id)) } catch {}
    try { refreshDynamicWidgets(container, String(project.id)) } catch {}
    try { enableTabDnD(container, String(project.id)) } catch {}
    try { enableTabDnD(container, String(project.id)) } catch {}
  }
  if (deferHydration) {
    const once = () => { window.removeEventListener('pd-arrived', once as any); resumeHydration() }
    window.addEventListener('pd-arrived', once as any, { once: true })
  } else {
    await resumeHydration()
  }

  // Global top-left quick tab switch (always accessible)
  const showTab = (name: string) => {
    container.querySelectorAll('section[data-tab]')
      .forEach((sec) => (sec as HTMLElement).classList.toggle('hidden', sec.getAttribute('data-tab') !== name))
    if (name === 'board') renderKanban(container, String(project.id))
    // Apply saved edit state for the activated tab's widget grid (if any)
    const panel = container.querySelector(`section[data-tab="${name}"]`) as HTMLElement | null
    const grid = panel?.querySelector('#widgetGrid') as HTMLElement | null
    if (grid && (grid as any)._setEdit) {
      const scoped = grid.getAttribute('data-pid') || ''
      const on = localStorage.getItem(`wg-edit-${scoped}`) === '1'
        ; (grid as any)._setEdit(on)
    }
  }
  container.querySelector('#topGoSummary')?.addEventListener('click', () => showTab('summary'))
  container.querySelector('#topGoBoard')?.addEventListener('click', () => showTab('board'))

  // Activate default tab: prefer "概要" (summary); fallback to first visible (excluding "+ 新規タブ")
  try {
    const bar = container.querySelector('#tabBar') as HTMLElement | null
    if (bar) {
      const summary = bar.querySelector('.tab-btn[data-tab="summary"]') as HTMLElement | null
      const isHidden = (el: HTMLElement | null) => !!el?.classList.contains('hidden')
      if (summary && !isHidden(summary)) (summary as HTMLButtonElement).click()
      else {
        const tabs = Array.from(bar.querySelectorAll('.tab-btn')) as HTMLElement[]
        const first = tabs.find((el) => {
          const id = el.getAttribute('data-tab') || ''
          const hidden = el.classList.contains('hidden')
          return id && id !== 'new' && !hidden
        })
        first?.click()
      }
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
  const railReopen = container.querySelector('#railReopen') as HTMLButtonElement | null
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
    if (railReopen) railReopen.classList.toggle('hidden', !collapsed)
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
  railReopen?.addEventListener('click', onToggle)

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
    const hx = panel?.querySelector('#hxwCanvas') as HTMLElement | null
    if (hx && (hx as any)._setEdit) { (hx as any)._setEdit(on) }
  })
  // Initialize built-in tab lock icons
  try {
    const sumBtn = bar?.querySelector('.tab-lock[data-for="summary"]') as HTMLElement | null
    if (sumBtn) {
      const on = localStorage.getItem(`wg-edit-${project.id}`) === '1'
      sumBtn.innerHTML = on ? LOCK_OPEN_RIGHT_SVG : LOCK_SVG
      sumBtn.setAttribute('aria-pressed', on ? 'true' : 'false')
      // Apply to hex widget field immediately
      try {
        const hx = container.querySelector('#hxwCanvas') as HTMLElement | null
        if (hx && (hx as any)._setEdit) { (hx as any)._setEdit(on) }
      } catch {}
    }
  } catch { }

  // Load data for widgets from GitHub proxy (independent fallbacks)
  const hydrateRepo = async () => {
    if (!fullName) return
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
  if (deferHydration) {
    const runOnce = () => { window.removeEventListener('pd-arrived', runOnce as any); hydrateRepo() }
    window.addEventListener('pd-arrived', runOnce as any, { once: true })
  } else {
    await hydrateRepo()
  }

  // Update avatar image if user was fetched
  if (me?.github_id) {
    const accImg = container.querySelector('#accountTopImg') as HTMLImageElement | null
    const url = `https://avatars.githubusercontent.com/u/${me.github_id}?s=96`
    if (accImg) { accImg.src = url; accImg.classList.remove('hidden') }
  }
  try {
    const ov = document.getElementById('routeLoading') as HTMLElement | null
    if (!ov) { /* already closed */ }
    else if (ov.getAttribute('data-style') === 'seamless') {
      // Let finishSeamless control close timing; do nothing here
    } else {
      hideRouteLoading()
    }
  } catch {}
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

// Small toast below the minimap (top-right) for quick feedback like deletions
function showMiniToast(message: string, opts?: { variant?: 'default' | 'danger' }): void {
  try {
    const id = 'miniToast'
    document.getElementById(id)?.remove()
    const mini = document.querySelector('.hxw-mini') as HTMLElement | null
    // Default position roughly under the minimap if not found
    let top = 164
    let right = -16 // pull slightly further beyond the edge
    try {
      const modal = document.querySelector('.pop-modal') as HTMLElement | null
      if (modal) {
        const r = modal.getBoundingClientRect()
        top = Math.max(10, Math.round(r.top + 10))
        right = -16
      } else if (mini) {
        const r = mini.getBoundingClientRect()
        top = Math.round(r.bottom + 8)
        // Pull a bit further right to visually hug the edge
        right = -16
      }
    } catch { }
    const wrap = document.createElement('div')
    wrap.id = id
    wrap.className = 'mini-toast'
    if (opts?.variant === 'danger') wrap.classList.add('is-danger'); else wrap.classList.add('is-success')
    wrap.style.top = `${top}px`
    wrap.style.right = `${right}px`
    const inner = document.createElement('div')
    inner.className = 'mini-inner'
    const body = document.createElement('div')
    body.className = 'mini-body'
    // Build icon | text structure
    const icon = document.createElement('span')
    icon.className = 'mini-ico'
    // Choose icon by variant
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '16'); svg.setAttribute('height', '16'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'currentColor'); svg.setAttribute('aria-hidden', 'true')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    if (opts?.variant === 'danger') {
      // trash-ish icon
      path.setAttribute('d', 'M9 3h6a1 1 0 0 1 1 1v1h4v2h-1l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7H4V5h4V4a1 1 0 0 1 1-1zm2 4h2v12h-2V7zm-4 0h2v12H7V7zm8 0h2v12h-2V7zM9 5h6V4H9v1z')
    } else {
      // check mark
      path.setAttribute('d', 'M20.285 6.709l-11.1 11.1-5.47-5.47 1.414-1.415 4.056 4.056 9.686-9.686 1.414 1.415z')
    }
    svg.appendChild(path)
    icon.appendChild(svg)
    const sep = document.createElement('span'); sep.className = 'mini-sep'; sep.setAttribute('aria-hidden', 'true')
    const text = document.createElement('span'); text.className = 'mini-text'; text.textContent = message
    body.appendChild(icon); body.appendChild(sep); body.appendChild(text)
    inner.appendChild(body)
    wrap.appendChild(inner)
    ;(document.body || document.documentElement).appendChild(wrap)
    setTimeout(() => { try { wrap.remove() } catch { } }, 3800)
  } catch { }
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
  // Minimal placeholder (no persistent Loading text)
  return `<div class="h-60"></div>`
}

function readmeSkeleton(): string {
  // Minimal body; whole widget acts as a button in view mode
  return `<div class=\"h-full\"></div>`
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
  // Hex-packed layout when slots exist
  const widget = (wrap.closest('.hxw-widget') as HTMLElement | null) || (wrap.closest('[data-widget="committers"]') as HTMLElement | null)
  const slotsWrap = widget?.querySelector('.hxw-cells') as HTMLElement | null
  if (slotsWrap) {
    const gridEl = widget?.closest('#widgetGrid') as HTMLElement | null
    const hxEl = widget?.closest('#hxwCanvas') as HTMLElement | null
    const edit = ((gridEl && gridEl.getAttribute('data-edit') === '1') || (hxEl && hxEl.getAttribute('data-edit') === '1'))
    // Make sure slots layer is visible
    (slotsWrap as HTMLElement).style.display = ''
    const slots = Array.from(slotsWrap.querySelectorAll('.hxw-slot .slot-inner')) as HTMLElement[]
    const wid = (widget?.getAttribute('data-widget') || '')
    const pid = (document.getElementById('hxwCanvas') as HTMLElement | null)?.getAttribute('data-pid') || (root.getAttribute('data-pid') || '')
    // state helpers
    const cmKey = (p: string, w: string) => `pj-cm-users-${p}-${w}`
    const cmGet = (): string[] => { try { return JSON.parse(localStorage.getItem(cmKey(pid, wid)) || '[]') as string[] } catch { return [] } }
    const cmSet = (arr: string[]) => { localStorage.setItem(cmKey(pid, wid), JSON.stringify(arr)) }
    const users = cmGet()
    // center cell: label
    if (slots[0]) {
      slots[0].innerHTML = `<div class="text-center text-gray-100"><div class="text-[12px]">コミット数</div><div class="text-[11px] text-gray-300">過去90日</div></div>`
    }
    // make a picker overlay
    const openPicker = async (slotIdx: number) => {
      // Avoid stacking pickers
      document.getElementById('cmPicker')?.remove()
      const overlay = document.createElement('div')
      overlay.id = 'cmPicker'
      overlay.className = 'fixed inset-0 z-[90] bg-black/50 grid place-items-center'
      overlay.innerHTML = `<div class="w-[min(420px,92vw)] rounded-lg bg-neutral-900 ring-2 ring-neutral-600 p-3 text-gray-100">
        <div class="text-sm mb-2">メンバーを選択</div>
        <input id="cm-q" class="w-full rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100" placeholder="検索" />
        <div id="cm-list" class="mt-2 max-h-64 overflow-auto divide-y divide-neutral-700"></div>
      </div>`
      document.body.appendChild(overlay)
      const listEl = overlay.querySelector('#cm-list') as HTMLElement
      try {
        let itemsHtml = ''
        const seen = new Set<string>()
        const pushUsers = (arr: Array<{ login: string; avatar_url?: string }>) => {
          arr.forEach(u => {
            const login = u.login || ''
            if (!login || seen.has(login)) return
            seen.add(login)
            itemsHtml += `<button data-login="${login}" class=\"w-full text-left flex items-center gap-2 px-2 py-1 hover:bg-neutral-800/60\">\n              <img src=\"${u.avatar_url || `https://avatars.githubusercontent.com/${login}?s=64`}\" class=\"w-5 h-5 rounded-full\"/>\n              <span>${login}</span>\n            </button>`
          })
        }
        // 1) プロジェクトのコラボレータ（コミット0でも全員）
        try {
          const collabs = await apiFetch<Array<{ login: string; avatar_url?: string }>>(`/projects/${pid}/collaborators`)
          if (Array.isArray(collabs) && collabs.length) pushUsers(collabs)
        } catch { /* ignore */ }
        // 2) GitHub Collaborators（補完: リポジトリの全協力者=コミット0含む）
        try {
          const full = (root as HTMLElement).getAttribute('data-repo-full') || ((document.querySelector('[data-repo-full]') as HTMLElement | null)?.getAttribute('data-repo-full') || '')
          if (full) {
            const cols = await apiFetch<any[]>(`/github/collaborators?full_name=${encodeURIComponent(full)}`)
            pushUsers((cols || []).map(c => ({ login: c.login || '', avatar_url: c.avatar_url || '' })))
          }
        } catch { /* ignore */ }
        // 3) GitHub Contributors（さらに補完: committers）
        try {
          const full = (root as HTMLElement).getAttribute('data-repo-full') || ((document.querySelector('[data-repo-full]') as HTMLElement | null)?.getAttribute('data-repo-full') || '')
          if (full) {
            const contr = await apiFetch<any[]>(`/github/contributors?full_name=${encodeURIComponent(full)}`)
            pushUsers((contr || []).map(c => ({ login: c.login || '', avatar_url: c.avatar_url || '' })))
          }
        } catch { /* ignore */ }
        // 4) 左レールに既に描画済みのメンバー（最後の補完）
        try {
          const imgs = Array.from(document.querySelectorAll('#collabAvatars img[data-login]')) as HTMLImageElement[]
          pushUsers(imgs.map(img => ({ login: img.getAttribute('data-login') || '', avatar_url: img.getAttribute('src') || '' })))
        } catch { /* ignore */ }
        listEl.innerHTML = itemsHtml || '<div class="text-gray-400 px-2 py-1">メンバーがいません</div>'
        listEl.addEventListener('click', (e) => {
          const b = (e.target as HTMLElement).closest('[data-login]') as HTMLElement | null
          if (!b) return
          const login = b.getAttribute('data-login') || ''
          const next = users.slice()
          next[slotIdx - 1] = login // outer ring indices start at 1
          cmSet(next)
          overlay.remove()
          // rehydrate
          try {
            // Immediately replace the selected slot content (no full rebuild needed)
            const s = slots[slotIdx]
            if (s) {
              s.innerHTML = `<div class=\"relative grid place-items-center\">\n                <button title=\"解除\" class=\"cm-del absolute top-0.5 right-0.5 text-[12px] text-gray-300 hover:text-white\">×</button>\n                <img src=\"https://avatars.githubusercontent.com/${login}?s=96\" class=\"rounded-full ring-2 ring-[rgba(255,255,255,0.22)] object-cover\" style=\"width:56px;height:56px\" alt=\"${login}\"/>\n                <div class=\"mt-1 text-[12px] text-gray-200 truncate max-w-[96%]\">${login}</div>\n                <div class=\"cm-count text-[13px] font-semibold text-emerald-300\">…</div>\n              </div>`
              // allow re-pick on click (excluding delete)
              s.addEventListener('click', (ev) => { const t = ev.target as HTMLElement; if (!t.closest('.cm-del')) openPicker(slotIdx) })
              const del = s.querySelector('.cm-del') as HTMLElement | null
              del?.addEventListener('click', (ev) => { ev.stopPropagation(); const next2 = users.slice(); next2[slotIdx - 1] = '' as any; cmSet(next2); s.innerHTML = `<button class=\\"cm-add text-2xl md:text-3xl text-gray-100\\">＋</button>`; (s.querySelector('.cm-add') as HTMLElement | null)?.addEventListener('click', () => openPicker(slotIdx)) })
            }
            // Update counts for all selected users
            hydrateCommittersSelected(root)
          } catch {}
        })
      } catch {
        listEl.innerHTML = '<div class="text-gray-400 px-2 py-1">読み込みに失敗しました</div>'
      }
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
    }
    // fill outer cells with + or selected user
    slots.forEach((s, i) => {
      if (i === 0) return
      const login = users[i - 1] || ''
      if (!login) {
        // 非編集モードでも追加できるように常に＋ボタンを表示
        s.innerHTML = `<button class=\"cm-add text-2xl md:text-3xl text-gray-100\">＋</button>`
        const btn = s.querySelector('.cm-add') as HTMLElement | null
        btn?.addEventListener('click', () => openPicker(i))
      } else {
        if (edit) {
          s.innerHTML = `<div class=\"relative grid place-items-center\">\n          <button title=\"解除\" class=\"cm-del absolute top-0.5 right-0.5 text-[12px] text-gray-300 hover:text-white\">×</button>\n          <img src=\"https://avatars.githubusercontent.com/${login}?s=96\" class=\"rounded-full ring-2 ring-[rgba(255,255,255,0.22)] object-cover\" style=\"width:56px;height:56px\" alt=\"${login}\"/>\n          <div class=\"mt-1 text-[12px] text-gray-200 truncate max-w-[96%]\">${login}</div>\n          <div class=\"cm-count text-[13px] font-semibold text-emerald-300\">…</div>\n        </div>`
          // allow re-pick on click username
          s.addEventListener('click', (ev) => { const t = ev.target as HTMLElement; if (!t.closest('.cm-del')) openPicker(i) })
          const del = s.querySelector('.cm-del') as HTMLElement | null
          del?.addEventListener('click', (ev) => {
            ev.stopPropagation()
            const next = users.slice(); next[i - 1] = '' as any
            cmSet(next)
            // back to plus
            s.innerHTML = `<button class=\\\"cm-add text-2xl md:text-3xl text-gray-100\\\">＋</button>`
            const btn2 = s.querySelector('.cm-add') as HTMLElement | null
            btn2?.addEventListener('click', () => openPicker(i))
            try { hydrateCommittersSelected(root) } catch {}
          })
        } else {
          s.innerHTML = `<div class=\"relative grid place-items-center\">\n          <button title=\"解除\" class=\"cm-del absolute top-0.5 right-0.5 text-[12px] text-gray-300 hover:text-white\">×</button>\n          <img src=\"https://avatars.githubusercontent.com/${login}?s=96\" class=\"cm-avatar rounded-full ring-2 ring-[rgba(255,255,255,0.22)] object-cover\" style=\"width:56px;height:56px\" alt=\"${login}\"/>\n          <div class=\"mt-1 text-[12px] text-gray-200 truncate max-w-[96%]\">${login}</div>\n          <div class=\"cm-count text-[13px] font-semibold text-emerald-300\">…</div>\n        </div>`
          const del2 = s.querySelector('.cm-del') as HTMLElement | null
          del2?.addEventListener('click', (ev) => { ev.stopPropagation(); const next = users.slice(); next[i - 1] = '' as any; cmSet(next); s.innerHTML = `<button class=\\\"cm-add text-2xl md:text-3xl text-gray-100\\\">＋</button>`; (s.querySelector('.cm-add') as HTMLElement | null)?.addEventListener('click', () => openPicker(i)) })
        }
      }
    })
    // hide rectangular default area
    if (wrap) (wrap as HTMLElement).style.display = 'none'
    // After layout, fetch commit counts for selected
    try { hydrateCommittersSelected(root) } catch {}
    return
  }
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
    <div class="relative w-full h-full rounded-md" style="background-color: transparent; border: none;">
      <div class="absolute inset-0 grid" style="grid-template-rows: repeat(4, 1fr)">
        ${[0, 1, 2, 3].map(() => '<div class=\"border-t border-dotted\" style=\"border-color: rgba(255,255,255,0.12);\"></div>').join('')}
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

// Compute counts for currently selected users in the hex committers widget
async function hydrateCommittersSelected(root: HTMLElement): Promise<void> {
  const host = (root as HTMLElement)
  const full = host.getAttribute('data-repo-full') || (document.querySelector('[data-repo-full]') as HTMLElement | null)?.getAttribute('data-repo-full') || ''
  if (!full) return
  const pid = (document.getElementById('hxwCanvas') as HTMLElement | null)?.getAttribute('data-pid') || (root.getAttribute('data-pid') || '')
  const widgets = Array.from(root.querySelectorAll('.hxw-widget[data-type="committers"]')) as HTMLElement[]
  for (const widEl of widgets) {
    const wid = widEl.getAttribute('data-widget') || ''
    const pid = (document.getElementById('hxwCanvas') as HTMLElement | null)?.getAttribute('data-pid') || (root.getAttribute('data-pid') || '')
    const rKey = (p: string, w: string) => `pj-cm-range-${p}-${w}`
    const days = Math.max(7, parseInt(localStorage.getItem(rKey(pid, wid)) || '90', 10))
    const countObj = await ensureCommitCounts(full, days)
    const slotsWrap = widEl.querySelector('.hxw-cells') as HTMLElement | null
    if (!slotsWrap) continue
    const outers = Array.from(slotsWrap.querySelectorAll('.hxw-slot .slot-inner')).slice(1) as HTMLElement[]
    const cmKey = (p: string, w: string) => `pj-cm-users-${p}-${w}`
    let users: string[] = []
    try { users = JSON.parse(localStorage.getItem(cmKey(pid, wid)) || '[]') as string[] } catch { users = [] }
    outers.forEach((s, idx) => {
      const login = users[idx] || ''
      const el = s.querySelector('.cm-count') as HTMLElement | null
      if (el) el.textContent = login ? String(countObj[login] || 0) : ''
    })
    try { if (widget) densifyCommitters(widget, 1) } catch {}
  }
}

async function committersPopulate(root: HTMLElement): Promise<void> {
  const host = root as HTMLElement
  const full = host.getAttribute('data-repo-full') || ((document.querySelector('[data-repo-full]') as HTMLElement | null)?.getAttribute('data-repo-full') || '')
  const pid = (document.getElementById('hxwCanvas') as HTMLElement | null)?.getAttribute('data-pid') || (root.getAttribute('data-pid') || '')
  const widgets = Array.from(root.querySelectorAll('.hxw-widget[data-type="committers"]')) as HTMLElement[]
  if (widgets.length === 0) return
  const countsByDays = new Map<number, Record<string, number>>()
  for (const widEl of widgets) {
    const slotsWrap = widEl.querySelector('.hxw-cells') as HTMLElement | null
    if (!slotsWrap) continue
    const gridEl = widEl.closest('#widgetGrid') as HTMLElement | null
    const hxEl = widEl.closest('#hxwCanvas') as HTMLElement | null
    const edit = ((gridEl && gridEl.getAttribute('data-edit') === '1') || (hxEl && hxEl.getAttribute('data-edit') === '1'))
    ;(slotsWrap as HTMLElement).style.display = ''
    const wid = widEl.getAttribute('data-widget') || ''
    const cmKey = (p: string, w: string) => `pj-cm-users-${p}-${w}`
    let users: string[] = []
    try { users = JSON.parse(localStorage.getItem(cmKey(pid, wid)) || '[]') as string[] } catch { users = [] }
    const slots = Array.from(slotsWrap.querySelectorAll('.hxw-slot .slot-inner')) as HTMLElement[]
    const rKey = (p: string, w: string) => `pj-cm-range-${p}-${w}`
    let days = Math.max(7, parseInt(localStorage.getItem(rKey(pid, wid)) || '90', 10))
    // center label with range toggle
    if (slots[0]) slots[0].innerHTML = `<div class=\"text-center text-gray-100\"><div class=\"text-[12px]\">コミット数</div><button class=\"cm-range text-[11px] text-gray-300 hover:text-white underline decoration-dotted\">過去${days}日</button></div>`
    const openPicker = async (slotIdx: number) => {
      document.getElementById('cmPicker')?.remove()
      const overlay = document.createElement('div')
      overlay.id = 'cmPicker'
      overlay.className = 'fixed inset-0 z-[90] bg-black/50 grid place-items-center'
      overlay.innerHTML = `<div class=\"w-[min(420px,92vw)] rounded-lg bg-neutral-900 ring-2 ring-neutral-600 p-3 text-gray-100\">\n        <div class=\"text-sm mb-2\">メンバーを選択</div>\n        <input id=\"cm-q\" class=\"w-full rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100\" placeholder=\"検索\" />\n        <div id=\"cm-list\" class=\"mt-2 max-h-64 overflow-auto divide-y divide-neutral-700\"></div>\n      </div>`
      document.body.appendChild(overlay)
      const listEl = overlay.querySelector('#cm-list') as HTMLElement
      const add = (arr: Array<{login:string;avatar_url?:string}>, seen: Set<string>) => {
        arr.forEach(u => { const lg = u.login||''; if (!lg || seen.has(lg)) return; seen.add(lg); listEl.innerHTML += `<button data-login=\"${lg}\" class=\"w-full text-left flex items-center gap-2 px-2 py-1 hover:bg-neutral-800/60\">\n          <img src=\"${u.avatar_url || `https://avatars.githubusercontent.com/${lg}?s=64`}\" class=\"w-5 h-5 rounded-full\"/>\n          <span>${lg}</span>\n        </button>` }) }
      try {
        const seen = new Set<string>()
        try { const collabs = await apiFetch<Array<{login:string;avatar_url?:string}>>(`/projects/${pid}/collaborators`); if (collabs) add(collabs, seen) } catch {}
        if (full) { try { const cols = await apiFetch<any[]>(`/github/collaborators?full_name=${encodeURIComponent(full)}`); add((cols||[]).map(c=>({login:c.login||'',avatar_url:c.avatar_url||''})), seen) } catch {} }
        if (full) { try { const contr = await apiFetch<any[]>(`/github/contributors?full_name=${encodeURIComponent(full)}`); add((contr||[]).map(c=>({login:c.login||'',avatar_url:c.avatar_url||''})), seen) } catch {} }
        if (listEl.innerHTML === '') listEl.innerHTML = '<div class="text-gray-400 px-2 py-1">メンバーがいません</div>'
        listEl.addEventListener('click', (e) => {
          const b = (e.target as HTMLElement).closest('[data-login]') as HTMLElement | null
          if (!b) return
          const login = b.getAttribute('data-login') || ''
          const next = users.slice(); next[slotIdx - 1] = login; localStorage.setItem(cmKey(pid, wid), JSON.stringify(next))
          overlay.remove()
          committersPopulate(root)
        })
      } catch { overlay.remove() }
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove() })
    }
    // outer cells
    // click center range to cycle [30, 90, 180, 365]
    try {
      const rngBtn = slots[0]?.querySelector('.cm-range') as HTMLElement | null
      rngBtn?.addEventListener('click', async (ev) => {
        ev.preventDefault()
        const list = [30, 90, 180, 365]
        const cur = Math.max(7, parseInt(localStorage.getItem(rKey(pid, wid)) || String(days), 10))
        const next = list[(list.indexOf(cur) + 1) % list.length] || 90
        localStorage.setItem(rKey(pid, wid), String(next))
        // refresh this widget only
        await committersPopulate(root)
        await hydrateCommittersSelected(root)
      })
    } catch {}
    // outer cells
    slots.forEach((s, idx) => {
      if (idx === 0) return
      const login = users[idx - 1] || ''
      if (!login) {
        // 非編集モードでも追加できるように常に＋ボタンを表示
        s.innerHTML = `<button class=\"cm-add text-2xl md:text-3xl text-gray-100\">＋</button>`
        ;(s.querySelector('.cm-add') as HTMLElement | null)?.addEventListener('click', () => openPicker(idx))
      } else {
        if (edit) {
          s.innerHTML = `<div class=\"relative grid place-items-center\">\n          <button title=\"解除\" class=\"cm-del absolute top-0.5 right-0.5 text-[12px] text-gray-300 hover:text-white\">×</button>\n          <img src=\"https://avatars.githubusercontent.com/${login}?s=96\" class=\"cm-avatar rounded-full ring-2 ring-[rgba(255,255,255,0.22)] object-cover\" style=\"width:56px;height:56px\" alt=\"${login}\"/>\n          <div class=\"mt-1 text-[12px] text-gray-200 truncate max-w-[96%]\">${login}</div>\n          <div class=\"cm-count text-[13px] font-semibold text-emerald-300\">${(countsByDays.get(days)||{})[login]||0}</div>\n        </div>`
          s.addEventListener('click', (ev) => { const t = ev.target as HTMLElement; if (!t.closest('.cm-del')) openPicker(idx) })
          ;(s.querySelector('.cm-del') as HTMLElement | null)?.addEventListener('click', (ev) => { ev.stopPropagation(); const next = users.slice(); next[idx - 1] = ''; localStorage.setItem(cmKey(pid, wid), JSON.stringify(next)); committersPopulate(root) })
        } else {
          // 非編集でも削除（×）できるように統一
          s.innerHTML = `<div class=\"relative grid place-items-center\">\n          <button title=\"解除\" class=\"cm-del absolute top-0.5 right-0.5 text-[12px] text-gray-300 hover:text-white\">×</button>\n          <img src=\"https://avatars.githubusercontent.com/${login}?s=96\" class=\"cm-avatar rounded-full ring-2 ring-[rgba(255,255,255,0.22)] object-cover\" style=\"width:56px;height:56px\" alt=\"${login}\"/>\n          <div class=\"mt-1 text-[12px] text-gray-200 truncate max-w-[96%]\">${login}</div>\n          <div class=\"cm-count text-[13px] font-semibold text-emerald-300\">${(countsByDays.get(days)||{})[login]||0}</div>\n        </div>`
          ;(s.querySelector('.cm-del') as HTMLElement | null)?.addEventListener('click', (ev) => { ev.stopPropagation(); const next = users.slice(); next[idx - 1] = ''; localStorage.setItem(cmKey(pid, wid), JSON.stringify(next)); committersPopulate(root) })
        }
      }
    })
    // Apply sizing
    try { densifyCommitters(widEl, 1) } catch {}
    // fetch counts for chosen range (cache per range during this populate)
    if (full) {
      if (!countsByDays.has(days)) countsByDays.set(days, await ensureCommitCounts(full, days))
    }
  }
}

function hydrateReadme(root: HTMLElement, text: string): void {
  // Cache on container for popup use
  try { (root as any)._readmeText = text || '' } catch {}
}

function mdFillSlots(_w: HTMLElement, _pid: string, _id: string, _text: string): void { /* no-op for popup mode */ }

// ------- Contributions heatmap (GitHub-like) -------
type ContribCache = { at: number; start: string; days: Record<string, number> }

// ------- Committers (counts per login) cache -------
type CommitCountsCache = { at: number; counts: Record<string, number> }
function ccKey(full: string): string { return `pj-commit-counts-v1-${full}` }
function ccGet(full: string): CommitCountsCache | null {
  try {
    const raw = localStorage.getItem(ccKey(full)); if (!raw) return null
    return JSON.parse(raw) as CommitCountsCache
  } catch { return null }
}
function ccSet(full: string, data: CommitCountsCache): void {
  try { localStorage.setItem(ccKey(full), JSON.stringify(data)) } catch { }
}
async function ensureCommitCounts(full: string, days: number = 90): Promise<Record<string, number>> {
  const ttl = 60 * 60 * 1000 // 1h
  const cached = ccGet(full + `-d${days}`)
  const now = Date.now()
  if (cached && (now - cached.at) < ttl) return cached.counts || {}
  // fetch commits in the last N days and aggregate
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const commits = await fetchCommitsPaged(full, since)
  const map = new Map<string, number>()
  ;(commits || []).forEach(c => {
    const login = (c.author && c.author.login) || (c.commit && c.commit.author && c.commit.author.name) || ''
    if (!login) return
    map.set(login, (map.get(login) || 0) + 1)
  })
  const counts: Record<string, number> = {}
  map.forEach((v, k) => { counts[k] = v })
  ccSet(full + `-d${days}`, { at: now, counts })
  return counts
}

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
    // If hex slots exist for contrib widgets, render into slots; otherwise fallback to rectangular heatmap
    const widgets = Array.from(root.querySelectorAll('[data-widget="contrib"]')) as HTMLElement[]
    let usedSlots = false
    widgets.forEach((w) => {
      const slotsWrap = w.querySelector('.hxw-cells') as HTMLElement | null
      if (!slotsWrap) return
      const slots = Array.from(slotsWrap.querySelectorAll('.hxw-slot .slot-inner')) as HTMLElement[]
      if (slots.length === 0) return
      usedSlots = true
      // last N days mapped to slots L->R (old->new)
      const end = new Date(); end.setUTCHours(0,0,0,0)
      const start = new Date(end.getTime() - (slots.length - 1) * 86400000)
      const days: string[] = []
      const cur = new Date(start)
      while (cur <= end) { days.push(formatDate(cur)); cur.setUTCDate(cur.getUTCDate() + 1) }
      let max = 0
      days.forEach(d => { max = Math.max(max, data.days[d] || 0) })
      const color = (n: number) => {
        if (n <= 0) return 'rgba(255,255,255,0.10)'
        const t = max > 0 ? (n / max) : 0
        const a = 0.25 + 0.55 * Math.sqrt(t)
        return `rgba(59,130,246,${a.toFixed(3)})` // blue tone for activity
      }
      slots.forEach((s, i) => {
        const d = days[i]
        const n = data.days[d] || 0
        s.innerHTML = `<div class="w-4 h-4 rounded-full" title="${d}: ${n}" style="background:${color(n)}"></div>`
      })
      // hide default rectangular area
      const body = w.querySelector('.contrib-body') as HTMLElement | null
      if (body) body.style.display = 'none'
    })
    if (!usedSlots) renderContribHeatmap(root, full, data)
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
  // Remove deprecated widgets from saved meta and DOM (overview, milestones, flow)
  try {
    const meta = getWidgetMeta(pid)
    let changed = false
    Object.entries(meta).forEach(([id, m]) => {
      const t = (m as any)?.type
      if (t === 'overview' || t === 'milestones' || t === 'flow') {
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
    const widget = (e.target as HTMLElement).closest('.widget') as HTMLElement | null
    const onHandle = (e.target as HTMLElement).closest('.wg-move') as HTMLElement | null
    const locked = widget?.getAttribute('data-locked') === '1'
    // Locked custom widgets can start drag from anywhere; others require the move handle
    dragAllowed = locked ? true : !!onHandle
    if (widget && dragAllowed) widget.setAttribute('draggable', 'true')
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

  // Right-click shortcut menu (grid widgets, edit mode only)
  grid.addEventListener('contextmenu', (e) => {
    const t = e.target as HTMLElement
    const w = t.closest('.widget') as HTMLElement | null
    if (!w) return
    e.preventDefault(); e.stopPropagation()
    const scoped = grid.getAttribute('data-pid') || '' // e.g., "123:custom-..."
    const [pidOnly, scope] = ((): [string, string] => { const a = scoped.split(':'); return [a[0] || '', a[1] || ''] })()
    const wid = w.getAttribute('data-widget') || ''
    const idKey = `gd:${pidOnly}:${scope}:${wid}`
    const cur = scGet(pidOnly)
    const on = cur.includes(idKey)
    document.getElementById('hxwScMenu')?.remove()
    const menu = document.createElement('div')
    menu.id = 'hxwScMenu'
    menu.className = 'fixed z-[70] rounded-md bg-neutral-900 ring-2 ring-neutral-600 shadow-lg p-1 text-sm text-gray-200'
    const item = document.createElement('button')
    item.className = 'px-3 py-1.5 hover:bg-neutral-800 rounded'
    item.textContent = on ? 'ショートカットから削除' : 'ショートカットに追加'
    item.addEventListener('click', () => {
      if (on) { scRemove(pidOnly, idKey); try { showMiniToast('ショートカットを削除しました', { variant: 'danger' }) } catch {} }
      else { scAdd(pidOnly, idKey); try { showMiniToast('ショートカットに追加しました') } catch {} }
      try { hxwRenderShortcuts(root, pidOnly) } catch {}
      menu.remove(); document.removeEventListener('click', onDoc)
    })
    menu.appendChild(item)
    document.body.appendChild(menu)
    const x = (e as MouseEvent).clientX, y = (e as MouseEvent).clientY
    const mw = menu.offsetWidth || 150, mh = menu.offsetHeight || 38
    const left = Math.max(8, Math.min(window.innerWidth - mw - 8, x + 6))
    const top = Math.max(8, Math.min(window.innerHeight - mh - 8, y + 6))
    menu.style.left = `${left}px`
    menu.style.top = `${top}px`
    const startX = x, startY = y
    const startSX = (window.pageXOffset || document.documentElement.scrollLeft || 0)
    const startSY = (window.pageYOffset || document.documentElement.scrollTop || 0)
    const close = () => {
      try { document.removeEventListener('click', onDoc) } catch {}
      try { window.removeEventListener('mousemove', onMove) } catch {}
      try { window.removeEventListener('scroll', onScr, true) } catch {}
      try { window.removeEventListener('keydown', onKey) } catch {}
      menu.remove()
    }
    const onDoc = (ev: MouseEvent) => { if (!menu.contains(ev.target as Node)) close() }
    const onMove = (ev: MouseEvent) => {
      const r = menu.getBoundingClientRect(); const m = 12
      const inside = ev.clientX >= r.left - m && ev.clientX <= r.right + m && ev.clientY >= r.top - m && ev.clientY <= r.bottom + m
      if (!inside) close()
    }
    const onScr = () => {
      const sx = (window.pageXOffset || document.documentElement.scrollLeft || 0)
      const sy = (window.pageYOffset || document.documentElement.scrollTop || 0)
      if (Math.abs(sx - startSX) + Math.abs(sy - startSY) > 24) close()
    }
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') close() }
    setTimeout(() => {
      document.addEventListener('click', onDoc)
      window.addEventListener('mousemove', onMove)
      window.addEventListener('scroll', onScr, true)
      window.addEventListener('keydown', onKey)
    }, 0)
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
    if (widget.getAttribute('data-locked') === '1') return
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
    grid.querySelectorAll('.widget').forEach((w) => {
      ;(w as HTMLElement).setAttribute('draggable', on ? 'true' : 'false')
    })
    const btn = root.querySelector('#wgEditToggle') as HTMLElement | null
    if (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false')
      btn.setAttribute('title', on ? '編集中' : '編集モード')
      btn.classList.toggle('is-on', on)
      const lab = btn.querySelector('.ctl-label') as HTMLElement | null
      if (lab) lab.textContent = on ? '編集中' : '編集'
    }
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
          // In grid panels, picker should add rectangular widgets here, not start hex placement
          node.addEventListener('click', () => openWidgetPickerModal(root, pid, (type) => addWidget(root, pid, type)))
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
      const locked = el.getAttribute('data-locked') === '1'
      el.classList.toggle('border', on && !locked)
      el.classList.toggle('border-dashed', on && !locked)
      el.classList.toggle('border-amber-500/40', on && !locked)
      const delBtn = el.querySelector('.w-del') as HTMLElement | null
      const resHandles = el.querySelectorAll('.wg-rz') as NodeListOf<HTMLElement>
      const move = el.querySelector('.wg-move') as HTMLElement | null
      if (delBtn) delBtn.classList.toggle('hidden', !on || locked)
      resHandles.forEach(h => h.classList.toggle('hidden', !on || locked))
      if (move) move.classList.toggle('hidden', !on || locked)
    })
    // Toggle elements that are explicitly edit-only
    grid.querySelectorAll('.edit-only').forEach((el) => (el as HTMLElement).classList.toggle('hidden', !on))
    // Disable inner content interactions while editing (buttons/links inside widgets)
    grid.querySelectorAll('.widget .wg-content').forEach((cnt) => { (cnt as HTMLElement).style.pointerEvents = on ? 'none' : '' })
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

  // Add widget button (grid context): use picker to add into this grid
  grid.querySelector('#addWidget')?.addEventListener('click', () => openWidgetPickerModal(root, pid, (type) => addWidget(root, pid, type)))

  // In edit mode, swallow clicks in grid so inner buttons/links won't act
  grid.addEventListener('click', (e) => {
    if (!isEdit()) return
    const t = e.target as HTMLElement
    if (t.closest('#addWidget')) return
    e.stopPropagation(); e.preventDefault()
  }, true)

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
    if (widget.getAttribute('data-locked') === '1') return
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
    try { showMiniToast('ウィジェットを削除しました', { variant: 'danger' }) } catch {}
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
        if (preview) preview.innerHTML = mdRenderQiita(txt || 'ここにMarkdownを書いてください')
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
    // Whole-widget button behavior for README/Markdown in view mode
    const widget = (e.target as HTMLElement).closest('.widget') as HTMLElement | null
    if (widget) {
      const isEdit = (grid.getAttribute('data-edit') === '1')
      const t = (widget.getAttribute('data-type') || '').toLowerCase()
      if (!isEdit && (t === 'readme' || t === 'markdown')) {
        e.stopPropagation()
        const id = widget.getAttribute('data-widget') || ''
        if (t === 'readme') openReadmeModal(root)
        else openMarkdownModal(root, pid, id)
        return
      }
    }
    // 旧UI（編集/保存/キャンセル）ボタンは廃止済み
    // Links: toggle add form
    const add = (e.target as HTMLElement).closest('.lnk-add') as HTMLElement | null
    if (add) {
      const w = getWid(add); if (!w) return
      const isEdit = grid.getAttribute('data-edit') === '1'
      const id = w.getAttribute('data-widget') || ''
      if (!isEdit) { openLinkHexPopup(root, pid, id); return }
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

  // Markdown: popup modeなので初期描画は不要

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
      if (preview) preview.innerHTML = mdRenderQiita(val || 'ここにMarkdownを書いてください')
      try { mdFillSlots(w, pid, id, val) } catch {}
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
  try {
    const raw = JSON.parse(localStorage.getItem(`pj-widgets-meta-${pid}`) || '{}') as Record<string, WidgetMeta>
    // Remove deprecated/disabled types
    const meta: Record<string, WidgetMeta> = {}
    Object.entries(raw).forEach(([id, m]) => {
      const t = (m?.type || '')
      if (t === 'flow') return
      if (t === 'calendar') return // calendar widget retired
      meta[id] = m
    })
    if (Object.keys(meta).length !== Object.keys(raw).length) { try { setWidgetMeta(pid, meta) } catch {} }
    return meta
  } catch { return {} }
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
  // Scale generic text slightly
  const labels = widgetEl.querySelectorAll('.wg-content div[class*="text-"]') as NodeListOf<HTMLElement>
  const base = 12
  const fs = Math.round(Math.max(12, Math.min(18, base * scale)))
  labels.forEach((n) => { n.style.fontSize = `${fs}px` })
  // Scale avatar and counts based on available height
  const area = (widgetEl.querySelector('.hxw-body') as HTMLElement | null) || widgetEl
  const rect = (area as HTMLElement).getBoundingClientRect()
  const h = Math.max(120, rect.height || widgetEl.clientHeight || 200)
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(v)))
  const ava = clamp(h * 0.28, 48, 96)
  const cnt = clamp(h * 0.18, 16, 42)
  widgetEl.querySelectorAll('.cm-avatar').forEach((n) => { const el = n as HTMLElement; el.style.width = `${ava}px`; el.style.height = `${ava}px` })
  widgetEl.querySelectorAll('.cm-count').forEach((n) => { const el = n as HTMLElement; el.style.fontSize = `${cnt}px`; el.style.lineHeight = '1.1' })
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
  const labelPx = Math.round(clamp(h * 0.12, 14, 24))
  const countPx = Math.round(clamp(h * 0.36, 24, 72))
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
      try { (card as HTMLElement).setAttribute('data-type', m.type) } catch {}
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

function openWidgetPickerModal(root: HTMLElement, pid: string, onPick?: (type: string) => void): void {
  try {
    // Ensure project widget-state is loaded so project library can be included as tiles
    const has = (WS_CACHE as any).has ? (WS_CACHE as any).has(pid) : false
    if (!has) { try { wsLoadAll(pid).then(() => { try { openWidgetPickerModal(root, pid, onPick) } catch {} }) } catch {}; return }
  } catch {}
  const overlay = document.createElement('div')
  overlay.className = 'fixed inset-0 z-[66] bg-black/60 backdrop-blur-[1px] grid place-items-center fade-overlay'
  overlay.innerHTML = `
    <div class="relative w-[min(1200px,96vw)] overflow-hidden rounded-xl bg-neutral-900 ring-2 ring-neutral-600 shadow-2xl text-gray-100 pop-modal modal-fixed" data-mode="browse">
      <header class="h-12 flex items-center px-5 border-b border-neutral-600">
        <h3 class="text-lg font-semibold" id="wp-title">ウィジェットを選択</h3>
        <button id=\"wp-close\" class=\"ml-auto text-2xl text-neutral-300 hover:text-white\">×</button>
      </header>
      <div class="flex h-[calc(86vh-3rem)]">
        <section class="flex-1 relative p-2 overflow-hidden">
          <div id="wp-slides" class="absolute inset-0 flex" style="width:200%; transform: translateX(0%); transition: transform .24s ease">
            <div class="wp-slide relative w-1/2 h-full">
              <div id=\"wp-field\" class=\"absolute inset-0 overflow-hidden\"></div>
            </div>
            <div class="wp-slide relative w-1/2 h-full">
              <div id=\"wp-myfield\" class=\"absolute inset-0 overflow-hidden\"></div>
            </div>
          </div>
          <div class=\"absolute left-2 bottom-2 pointer-events-none\"> 
            <div id=\"wp-ctl-browse\" class=\"pointer-events-auto inline-flex items-center gap-2\">
              <button id=\"wp-create\" class=\"inline-flex items-center gap-2 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-3 py-2 shadow-lg\" title=\"自由にウィジェットを作成\"> 
                <span class=\"text-base leading-none\">＋</span> 
                <span>ウィジェット作成</span> 
              </button> 
              <button id=\"wp-my-add\" class=\"inline-flex items-center gap-2 rounded-md bg-sky-700 hover:bg-sky-600 text-white text-sm font-medium px-3 py-2 shadow-lg\" title=\"手持ちのウィジェットをプロジェクトに追加\"> 
                <span class=\"text-base leading-none\">↪</span> 
                <span>手持ちから追加</span> 
              </button> 
            </div>
            <div id=\"wp-ctl-mylib\" class=\"hidden pointer-events-auto inline-flex items-center gap-2\">
              <button id=\"wp-back\" class=\"inline-flex items-center gap-2 rounded-md bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-medium px-3 py-2 shadow-lg\" title=\"前の一覧に戻る\"> 
                <span class=\"text-base leading-none\">←</span> 
                <span>一覧に戻る</span> 
              </button> 
            </div>
          </div>
        </section>
        <aside class="w-80 shrink-0 p-4 border-l border-neutral-600">
          <div id=\"wp-desc-title\" class=\"text-base font-semibold mb-2\">ウィジェットを選択</div>
          <div id=\"wp-desc-body\" class=\"text-sm text-gray-300 leading-relaxed\">左のハニカムからウィジェットを選んでください。カーソルを合わせるとここに説明が表示されます。</div>
        </aside>
      </div>
    </div>
  `
  const close = () => { overlay.remove(); const c = +(document.body.getAttribute('data-lock') || '0'); const n = Math.max(0, c - 1); if (n === 0) { document.body.style.overflow = ''; } document.body.setAttribute('data-lock', String(n)) }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#wp-close')?.addEventListener('click', close)

  

  // Helpers for switching modes with slide animation
  const modal = overlay.querySelector('.pop-modal') as HTMLElement
  const slides = overlay.querySelector('#wp-slides') as HTMLElement
  const titleEl = overlay.querySelector('#wp-title') as HTMLElement
  const ctlBrowse = overlay.querySelector('#wp-ctl-browse') as HTMLElement
  const ctlMylib = overlay.querySelector('#wp-ctl-mylib') as HTMLElement
  // Rebuild main (browse) field and optionally focus a specific lib-id
  const rebuildPickerField = (focusLibId?: string) => {
    // Replace field to drop previous listeners
    const oldField = overlay.querySelector('#wp-field') as HTMLElement | null
    if (!oldField || !oldField.parentElement) return
    const field = oldField.cloneNode(false) as HTMLElement
    field.id = 'wp-field'
    oldField.parentElement.replaceChild(field, oldField)
    try { (field.style as any).touchAction = 'none'; (field.style as any).webkitUserSelect = 'none'; (field.style as any).userSelect = 'none' } catch {}

    // Desc refs
    const descTitle = overlay.querySelector('#wp-desc-title') as HTMLElement
    const descBody = overlay.querySelector('#wp-desc-body') as HTMLElement
    const titleOf = (t: string) => widgetTitle(t)
    const descOf = (t: string): string => {
      switch (t) {
        case 'readme': return 'リポジトリの README を直接表示します。'
        case 'contrib': return 'GitHub のコントリビューションヒートマップを表示します。'
        case 'committers': return '主要なコミッターの活動量を棒グラフで表示します。'
        case 'markdown': return '自由なメモや説明を Markdown で配置します。'
        case 'tasksum': return 'TODO/DOING/DONE の件数など、タスクの概要を表示します。'
        case 'links': return 'よく使うページへのショートカットリンクを並べます。'
        case 'skin': return 'ハニカムの色味やアクセントを切り替える着せ替え設定です。'
        case 'tabnew': return '新しいタブを作成します。'
        case 'invite': return 'メンバー招待や共有用のエントリーポイントです。'
        case 'account': return 'ユーザー設定を開くショートカットです。'
        case 'clock': return 'アナログ時計を表示します。'
        case 'clock-digital': return 'デジタル時計を表示します。'
        case 'spacer': return 'レイアウト調整用の空きセルです。'
        default: return 'ウィジェット'
      }
    }
    const showDesc = (t: string) => {
      try {
        if (t.startsWith('lib:')) {
          const parts = t.split(':')
          const id = parts[1]
          const arr = (wsGet(pid, 'lib_widgets') as any[]) || []
          const entry = arr.find((x: any) => x.id === id)
          if (entry) {
            descTitle.textContent = entry.name || (entry.type === 'flow' ? 'フロー' : 'カスタム')
            descBody.innerHTML = `<div class="space-y-2">
              <div class="text-sm text-gray-300">自作ウィジェット</div>
              <div class="text-xs text-gray-400">クリックで配置。既にプロジェクトに共有済みです。</div>
            </div>`
            return
          }
        }
        descTitle.textContent = titleOf(t)
        descBody.textContent = descOf(t)
      } catch {}
    }

    // Geometry and palette
    const TILE = 100
    const W = TILE
    const H = Math.round(TILE * 0.866)
    const stepX = Math.round(TILE * 0.75)
    const stepY = H
    const palette: Array<[number,number,number]> = [[59,130,246],[16,185,129],[239,68,68],[168,85,247],[251,146,60],[234,179,8],[99,102,241],[20,184,166],[14,165,233]]
    const hsh = (s: string) => { let h = 0; for (let i=0;i<s.length;i++){ h = ((h<<5)-h) + s.charCodeAt(i); h|=0 } return Math.abs(h) }
    const fillFor = (id: string) => { const [r,g,b] = palette[hsh(id) % palette.length]; const light = (document.documentElement.getAttribute('data-theme') || 'dark') !== 'dark'; const a = light ? 0.42 : 0.38; return { flat: `rgba(${r},${g},${b}, ${a})`, solid: `rgb(${r},${g},${b})` } }

    // Items compose
    const types: string[] = ['readme','contrib','committers','markdown','tasksum','links','skin','tabnew','invite','account','clock','clock-digital','spacer']
    const occ = new Set<string>()
    const key = (q:number,r:number) => `${q},${r}`
    const lib: any[] = ((wsGet(pid, 'lib_widgets') as any[]) || [])
    const anchors = axGrow((types.length + lib.length) * 30)
    const neighbors = (q:number,r:number): Array<{q:number;r:number}> => {
      const odd = (q & 1) === 1
      return [
        { q, r: r-1 },
        odd ? { q:q+1, r } : { q:q+1, r:r-1 },
        odd ? { q:q+1, r:r+1 } : { q:q+1, r },
        { q, r: r+1 },
        odd ? { q:q-1, r:r+1 } : { q:q-1, r },
        odd ? { q:q-1, r } : { q:q-1, r:r-1 },
      ]
    }
    type Item = { type: string; cells: Array<{q:number;r:number}>, label?: string, rgba?: string, lib?: any }
    const items: Item[] = []
    types.forEach((type) => {
      const rel = hxwShapeFor(type)
      if (type === 'clock-digital') {
        let best: { cells: Array<{q:number;r:number}>; touches: number } | null = null
        for (const [ax, az] of anchors) {
          const cells = rel.map(([sx,sz]) => axialToOddq(ax+sx, az+sz))
          if (cells.some(c => occ.has(key(c.q,c.r)))) continue
          let t = 0
          cells.forEach((c) => { neighbors(c.q,c.r).forEach(nb => { if (occ.has(key(nb.q, nb.r))) t++ }) })
          if (!best || t > best.touches) best = { cells, touches: t }
          if (best && best.touches >= 3) break
        }
        const pick = best || { cells: rel.map(([sx,sz]) => axialToOddq(sx, sz)), touches: 0 }
        pick.cells.forEach(c => occ.add(key(c.q,c.r)))
        items.push({ type, cells: pick.cells, label: titleOf(type) })
      } else {
        for (const [ax, az] of anchors) {
          const cells = rel.map(([sx,sz]) => axialToOddq(ax+sx, az+sz))
          if (cells.some(c => occ.has(key(c.q,c.r)))) continue
          cells.forEach(c => occ.add(key(c.q,c.r)))
          items.push({ type, cells, label: titleOf(type) })
          break
        }
      }
    })
    const px = (q:number, r:number) => ({ x: q * stepX, y: Math.round((r + (q % 2 ? 0.5 : 0)) * stepY) })
    // Insert lib entries
    lib.forEach((en: any) => {
      const rel = (en.shape && en.shape.length) ? en.shape : [[0,0]]
      for (const [ax, az] of anchors) {
        const cells = rel.map(([sx,sz]) => axialToOddq(ax+sx, az+sz))
        if (cells.some(c => occ.has(key(c.q,c.r)))) continue
        cells.forEach(c => occ.add(key(c.q,c.r)))
        const rgba = en.rgb ? `rgba(${en.rgb[0]},${en.rgb[1]},${en.rgb[2]}, ${typeof en.alpha==='number'? en.alpha : 0.38})` : fillFor('lib').flat
        items.push({ type: `lib:${en.id}:${en.type || 'custom'}`, cells, label: en.name || (en.type==='flow'?'フロー':'カスタム'), rgba, lib: en })
        break
      }
    })

    // Bounds and canvas
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    items.forEach((it) => { it.cells.forEach((c) => { const p = px(c.q, c.r); minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y) }) })
    if (!isFinite(minX) || !isFinite(minY)) { minX = 0; minY = 0; maxX = stepX; maxY = stepY }
    const PAD = 20
    const width = (maxX - minX) + W + PAD * 2
    const height = (maxY - minY) + H + PAD * 2
    const canvas = document.createElement('div')
    canvas.id = 'wpCanvas'
    canvas.style.position = 'absolute'
    canvas.style.left = '0px'
    canvas.style.top = '0px'
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    field.appendChild(canvas)

    // Host draw
    items.forEach((it) => {
      const col = it.rgba ? { flat: it.rgba, solid: it.rgba } : fillFor(it.type)
      const points = it.cells.map(c => px(c.q, c.r))
      const bx = Math.min(...points.map(p => p.x))
      const by = Math.min(...points.map(p => p.y))
      const bw = (Math.max(...points.map(p => p.x)) - bx) + W
      const bh = (Math.max(...points.map(p => p.y)) - by) + H
      const host = document.createElement('div')
      host.className = 'wp-item'
      host.setAttribute('data-type', it.type)
      host.style.position = 'absolute'
      host.style.left = `${(bx - minX) + PAD}px`
      host.style.top = `${(by - minY) + PAD}px`
      host.style.width = `${bw}px`
      host.style.height = `${bh}px`
      host.style.cursor = 'pointer'
      host.style.transition = 'transform .12s ease, filter .12s ease, box-shadow .12s ease'
      host.addEventListener('mouseenter', () => { host.style.filter = 'brightness(1.08)'; showDesc(it.type) })
      host.addEventListener('mouseleave', () => { host.style.filter = '' })
      const pickFromItem = () => {
        if (it.lib) {
          if (onPick) {
            try { (window as any)._wpPickedLibName = it.lib.name || '' } catch {}
            close(); setTimeout(() => { try { onPick('custom') } catch {} }, 0)
            return
          }
          ;(window as any)._hxwPending = { shape: it.lib.shape, rgb: it.lib.rgb, alpha: it.lib.alpha, name: it.lib.name, flowGraph: it.lib.flowGraph }
          const t = it.lib.type
          close(); setTimeout(() => { try { hxwStartPlacement(root, pid, t) } catch {} }, 0)
        } else {
          close(); setTimeout(() => { if (onPick) onPick(it.type); else try { hxwStartPlacement(root, pid, it.type) } catch {} }, 0)
        }
      }
      host.addEventListener('click', pickFromItem)
      host.tabIndex = 0
      host.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickFromItem() } })
      it.cells.forEach((c) => {
        const p = px(c.q, c.r)
        const cell = document.createElement('div')
        cell.className = 'hxw-hex hxw-filled'
        cell.style.position = 'absolute'
        cell.style.left = `${(p.x - bx)}px`
        cell.style.top = `${(p.y - by)}px`
        cell.style.width = `${W}px`
        cell.style.height = `${H}px`
        const clip = document.createElement('div')
        clip.className = 'hxw-clip hx-svgclip'
        clip.style.color = col.flat
        { const f = deriveFacets(col.flat); (clip.style as any).setProperty('--hx-side', f.side); (clip.style as any).setProperty('--hx-hi', f.hi); (clip.style as any).setProperty('--hx-edge', f.side) }
        clip.innerHTML = honeyHexFilledSvg()
        cell.appendChild(clip)
        host.appendChild(cell)
      })
      const lab = document.createElement('div')
      lab.textContent = it.label || titleOf(it.type)
      lab.style.position = 'absolute'; lab.style.inset = '0'
      lab.style.display = 'grid'; lab.style.placeItems = 'center'; lab.style.pointerEvents = 'none'
      lab.style.color = 'var(--gh-contrast)'; lab.style.textShadow = '0 1px 2px rgba(0,0,0,.18)'; lab.style.fontSize = '12px'
      host.appendChild(lab)
      canvas.appendChild(host)
    })

    // Pan/zoom and focusing
    const viewport = field
    const state = { scale: 1, offsetX: 0, offsetY: 0 }
    const apply = () => { const tr = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`; canvas.style.transform = tr }
    const centerOn = (x: number, y: number) => {
      try { const vpW = viewport.clientWidth, vpH = viewport.clientHeight; state.offsetX = Math.round(vpW / 2 - x); state.offsetY = Math.round(vpH / 2 - y); apply() } catch {}
    }
    const centerDefault = () => {
      try {
        const vpW = viewport.clientWidth, vpH = viewport.clientHeight
        const nodes = Array.from(canvas.querySelectorAll('.wp-item')) as HTMLElement[]
        let tx = width / 2, ty = height / 2
        if (nodes.length) {
          const cx = width / 2, cy = height / 2
          let best: { d2: number; x: number; y: number } | null = null
          nodes.forEach((n) => { const x = (parseFloat(n.style.left || '0') || 0) + (n.offsetWidth || 0) / 2; const y = (parseFloat(n.style.top || '0') || 0) + (n.offsetHeight || 0) / 2; const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy); if (!best || d2 < best.d2) best = { d2, x, y } })
          if (best) { tx = best.x; ty = best.y }
        }
        state.offsetX = Math.round(vpW / 2 - tx)
        state.offsetY = Math.round(vpH / 2 - ty)
        apply()
      } catch {}
    }
    // Pointer pan
    const touches = new Map<number, { x: number; y: number }>()
    let twoPan = false
    let cx = 0, cy = 0
    const centroid = () => { let sx2 = 0, sy2 = 0, n = 0; touches.forEach((p) => { sx2 += p.x; sy2 += p.y; n++ }); return { x: sx2 / Math.max(1, n), y: sy2 / Math.max(1, n) } }
    const onDown = (e: PointerEvent) => { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (touches.size >= 2 && !twoPan) { const c = centroid(); cx = c.x; cy = c.y; twoPan = true } }
    const onMove = (e: PointerEvent) => { if (!touches.has(e.pointerId)) return; touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (twoPan && touches.size >= 2) { const c = centroid(); state.offsetX += (c.x - cx); state.offsetY += (c.y - cy); cx = c.x; cy = c.y; apply() } }
    const onUp = (e: PointerEvent) => { touches.delete(e.pointerId); if (touches.size < 2) twoPan = false }
    viewport.addEventListener('pointerdown', onDown as any)
    viewport.addEventListener('pointermove', onMove as any)
    viewport.addEventListener('pointerup', onUp as any)
    viewport.addEventListener('pointercancel', onUp as any)
    viewport.addEventListener('pointerleave', onUp as any)
    viewport.addEventListener('wheel', (e: WheelEvent) => { e.preventDefault(); const pinchZoom = (e as any).ctrlKey || Math.abs((e as any).deltaZ || 0) > 0; if (pinchZoom) { const z = Math.exp(-e.deltaY / 600); state.scale = Math.min(2.0, Math.max(0.6, state.scale * z)) } else { state.offsetX -= (e as any).deltaX || 0; state.offsetY -= (e as any).deltaY || 0 } apply() }, { passive: false })

    // Focus on target if specified
    try {
      if (focusLibId) {
        const target = canvas.querySelector(`.wp-item[data-type^="lib:${focusLibId}:"]`) as HTMLElement | null
        if (target) {
          const x = (parseFloat(target.style.left || '0') || 0) + (target.offsetWidth || 0) / 2
          const y = (parseFloat(target.style.top || '0') || 0) + (target.offsetHeight || 0) / 2
          centerOn(x, y)
          // Drop-in animation
          target.style.transform = 'translateY(-18px) scale(1.02)'
          target.style.boxShadow = '0 0 0 2px rgba(16,185,129,.85) inset'
          target.focus?.()
          setTimeout(() => { try { target.style.transform = ''; target.style.boxShadow = '' } catch {} }, 140)
        } else {
          centerDefault()
        }
      } else {
        centerDefault()
      }
    } catch { centerDefault() }
  }
  const setMode = (mode: 'browse' | 'mylib') => {
    modal?.setAttribute('data-mode', mode)
    if (slides) slides.style.transform = mode === 'mylib' ? 'translateX(-50%)' : 'translateX(0%)'
    if (mode === 'mylib') {
      titleEl.textContent = '手持ちから追加'
      ctlBrowse.classList.add('hidden')
      ctlMylib.classList.remove('hidden')
      // Default description for mylib
      try {
        const t = overlay.querySelector('#wp-desc-title') as HTMLElement
        const b = overlay.querySelector('#wp-desc-body') as HTMLElement
        if (t) t.textContent = '手持ちのウィジェット'
        if (b) b.textContent = '自作したウィジェットをハニカムから選んでプロジェクトに追加します。'
      } catch {}
      renderMyLib()
    } else {
      titleEl.textContent = 'ウィジェットを選択'
      ctlMylib.classList.add('hidden')
      ctlBrowse.classList.remove('hidden')
      // Reset description
      try {
        const t = overlay.querySelector('#wp-desc-title') as HTMLElement
        const b = overlay.querySelector('#wp-desc-body') as HTMLElement
        if (t) t.textContent = 'ウィジェットを選択'
        if (b) b.textContent = '左のハニカムからウィジェットを選んでください。カーソルを合わせるとここに説明が表示されます。'
      } catch {}
    }
  }

  // Build compact field (no background mask) with pannable canvas (browse slide)
  const field = overlay.querySelector('#wp-field') as HTMLElement
  field.innerHTML = ''
  try { (field.style as any).touchAction = 'none'; (field.style as any).webkitUserSelect = 'none'; (field.style as any).userSelect = 'none' } catch {}

  // Expose picker context for library actions
  try { (window as any)._hxwPickerRoot = root; (window as any)._hxwPickerPid = pid } catch {}

  // Create button → open creator modal (stacks above; picker remains open underneath)
  const createBtn = overlay.querySelector('#wp-create') as HTMLElement | null
  createBtn?.addEventListener('click', (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    try { showRouteLoading('ウィジェット作成', 'blue', { style: 'single', spinMs: 1200, minMs: 900 }) } catch {}
    try { sessionStorage.setItem('wc-target-pid', pid) } catch {}
    try { sessionStorage.setItem('wc-return-to-picker', '1') } catch {}
    try { close() } catch {}
    window.location.hash = '#/widget/create'
  })

  // Controls
  const myAddBtn = overlay.querySelector('#wp-my-add') as HTMLElement | null
  const backBtn = overlay.querySelector('#wp-back') as HTMLElement | null
  myAddBtn?.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); setMode('mylib') })
  backBtn?.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); setMode('browse') })

  // Aside: render project-shared library list
  const renderProjLibList = () => {
    const box = overlay.querySelector('#wp-proj-lib') as HTMLElement | null
    if (!box) return
    const arr = (wsGet(pid, 'lib_widgets') as any[]) || []
    box.innerHTML = ''
    if (!arr.length) {
      box.innerHTML = '<div class="text-xs text-gray-400">まだ追加されていません。</div>'
      return
    }
    arr.forEach((en: any) => {
      const row = document.createElement('div')
      row.className = 'flex items-center gap-2'
      const btn = document.createElement('button')
      btn.className = 'flex-1 text-left px-2 py-1.5 rounded bg-neutral-800/60 ring-1 ring-neutral-600 hover:bg-neutral-800 text-sm'
      btn.textContent = en.name || (en.type === 'flow' ? 'フロー' : 'カスタム')
      btn.addEventListener('click', () => {
        if (onPick) {
          try { (window as any)._wpPickedLibName = en.name || '' } catch {}
          close()
          setTimeout(() => { try { onPick('custom') } catch {} }, 0)
          return
        }
        ;(window as any)._hxwPending = { shape: en.shape, rgb: en.rgb, alpha: en.alpha, name: en.name, flowGraph: en.flowGraph }
        close()
        setTimeout(() => { try { hxwStartPlacement(root, pid, en.type || 'custom') } catch {} }, 0)
      })
      const del = document.createElement('button')
      del.className = 'px-2 py-1 text-sm text-rose-400 hover:text-rose-300'
      del.textContent = '×'
      del.title = 'プロジェクトから削除'
      del.addEventListener('click', async (ev) => {
        ev.stopPropagation()
        try {
          await wsLoadAll(pid)
          const cur = (wsGet(pid, 'lib_widgets') as any[]) || []
          const next = cur.filter((x: any) => x && x.id !== en.id)
          await wsSet(pid, 'lib_widgets', next)
          renderProjLibList()
        } catch {}
        try { showMiniToast('ウィジェットを削除しました', { variant: 'danger' }) } catch {}
      })
      row.appendChild(btn)
      row.appendChild(del)
      box.appendChild(row)
    })
  }
  try { wsLoadAll(pid).then(() => { try { renderProjLibList() } catch {} }) } catch {}

  const types: string[] = ['readme','contrib','committers','markdown','tasksum','links','skin','tabnew','invite','account','clock','clock-digital','spacer']
  const titleOf = (t: string) => widgetTitle(t)
  const descOf = (t: string): string => {
    switch (t) {
      case 'readme': return 'リポジトリの README を直接表示します。'
      case 'contrib': return 'GitHub のコントリビューションヒートマップを表示します。'
      case 'committers': return '主要なコミッターの活動量を棒グラフで表示します。'
      case 'markdown': return '自由なメモや説明を Markdown で配置します。'
      case 'tasksum': return 'TODO/DOING/DONE の件数など、タスクの概要を表示します。'
      case 'links': return 'よく使うページへのショートカットリンクを並べます。'
      case 'skin': return 'ハニカムの色味やアクセントを切り替える着せ替え設定です。'
      case 'tabnew': return '新しいタブを作成します。'
      case 'invite': return 'メンバー招待や共有用のエントリーポイントです。'
      case 'account': return 'ユーザー設定を開くショートカットです。'
      case 'clock': return 'アナログ時計を表示します。'
      case 'clock-digital': return 'デジタル時計を表示します。'
      case 'spacer': return 'レイアウト調整用の空きセルです。'
      default: return 'ウィジェット'
    }
  }
  // Geometry
  const TILE = 100
  const W = TILE
  const H = Math.round(TILE * 0.866)
  const stepX = Math.round(TILE * 0.75)
  const stepY = H
  // Color palette aligned with detail view
  const palette: Array<[number,number,number]> = [[59,130,246],[16,185,129],[239,68,68],[168,85,247],[251,146,60],[234,179,8],[99,102,241],[20,184,166],[14,165,233]]
  const hsh = (s: string) => { let h = 0; for (let i=0;i<s.length;i++){ h = ((h<<5)-h) + s.charCodeAt(i); h|=0 } return Math.abs(h) }
  const fillFor = (id: string) => { const [r,g,b] = palette[hsh(id) % palette.length]; const light = (document.documentElement.getAttribute('data-theme') || 'dark') !== 'dark'; const a = light ? 0.42 : 0.38; return { flat: `rgba(${r},${g},${b}, ${a})`, solid: `rgb(${r},${g},${b})` } }
  // Occupancy and anchor search (compact field centered in its container)
  const occ = new Set<string>()
  const key = (q:number,r:number) => `${q},${r}`
  // Include project-shared library items (server-backed) as tiles in the field
  const lib: any[] = ((wsGet(pid, 'lib_widgets') as any[]) || [])
  const anchors = axGrow((types.length + lib.length) * 30)
  const items: Array<{ type: string; cells: Array<{q:number;r:number}>, label?: string, rgba?: string, lib?: LibEntry }> = []
  // neighbor helper for odd-q grid
  const neighbors = (q:number,r:number): Array<{q:number;r:number}> => {
    const odd = (q & 1) === 1
    return [
      { q, r: r-1 },
      odd ? { q:q+1, r } : { q:q+1, r:r-1 },
      odd ? { q:q+1, r:r+1 } : { q:q+1, r },
      { q, r: r+1 },
      odd ? { q:q-1, r:r+1 } : { q:q-1, r },
      odd ? { q:q-1, r } : { q:q-1, r:r-1 },
    ]
  }
  types.forEach((type) => {
    const rel = hxwShapeFor(type)
    if (type === 'clock-digital') {
      // Prefer a spot that touches existing cells to look attached
      let best: { cells: Array<{q:number;r:number}>; touches: number } | null = null
      for (const [ax, az] of anchors) {
        const cells = rel.map(([sx,sz]) => axialToOddq(ax+sx, az+sz))
        if (cells.some(c => occ.has(key(c.q,c.r)))) continue
        // count how many edges touch existing occupied cells
        let t = 0
        cells.forEach((c) => {
          neighbors(c.q,c.r).forEach(nb => { if (occ.has(key(nb.q, nb.r))) t++ })
        })
        if (!best || t > best.touches) best = { cells, touches: t }
        // small early exit if strongly attached
        if (best && best.touches >= 3) break
      }
      const pick = best || { cells: rel.map(([sx,sz]) => axialToOddq(sx, sz)), touches: 0 }
      pick.cells.forEach(c => occ.add(key(c.q,c.r)))
      items.push({ type, cells: pick.cells, label: titleOf(type) })
    } else {
      for (const [ax, az] of anchors) {
        const cells = rel.map(([sx,sz]) => axialToOddq(ax+sx, az+sz))
        if (cells.some(c => occ.has(key(c.q,c.r)))) continue
        cells.forEach(c => occ.add(key(c.q,c.r)))
        items.push({ type, cells, label: titleOf(type) })
        break
      }
    }
  })
  // place library entries with their saved shapes/colors
  lib.forEach((en: any) => {
    const rel = (en.shape && en.shape.length) ? en.shape : [[0,0]]
    for (const [ax, az] of anchors) {
      const cells = rel.map(([sx,sz]) => axialToOddq(ax+sx, az+sz))
      if (cells.some(c => occ.has(key(c.q,c.r)))) continue
      cells.forEach(c => occ.add(key(c.q,c.r)))
      const rgba = en.rgb ? `rgba(${en.rgb[0]},${en.rgb[1]},${en.rgb[2]}, ${typeof en.alpha==='number'? en.alpha : 0.38})` : fillFor('lib').flat
      items.push({ type: `lib:${en.id}:${en.type || 'custom'}`, cells, label: en.name || (en.type==='flow'?'フロー':'カスタム'), rgba, lib: en })
      break
    }
  })
  // Compute pixel bounds and size the field
  const px = (q:number, r:number) => ({ x: q * stepX, y: Math.round((r + (q % 2 ? 0.5 : 0)) * stepY) })
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  items.forEach((it) => {
    it.cells.forEach((c) => {
      const p = px(c.q, c.r)
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    })
  })
  if (!isFinite(minX) || !isFinite(minY)) { minX = 0; minY = 0; maxX = stepX; maxY = stepY }
  const PAD = 20
  const width = (maxX - minX) + W + PAD * 2
  const height = (maxY - minY) + H + PAD * 2
  // Create inner canvas to pan/zoom
  const canvas = document.createElement('div')
  canvas.id = 'wpCanvas'
  canvas.style.position = 'absolute'
  canvas.style.left = '0px'
  canvas.style.top = '0px'
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  field.appendChild(canvas)

  const descTitle = overlay.querySelector('#wp-desc-title') as HTMLElement
  const descBody = overlay.querySelector('#wp-desc-body') as HTMLElement
  const showDesc = (t: string) => {
    try {
      if (t.startsWith('lib:')) {
        const parts = t.split(':')
        const id = parts[1]
        const entry = lib.find(x => x.id === id)
        if (entry) {
          descTitle.textContent = entry.name || (entry.type === 'flow' ? 'フロー' : 'カスタム')
          descBody.innerHTML = `<div class="space-y-2">
            <div class="text-sm text-gray-300">自作ウィジェット</div>
            <div class="text-xs text-gray-400">クリックで配置。削除する場合は下のボタンから。</div>
            <div><button id="lib-del" class="rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-medium px-3 py-1.5">削除</button></div>
          </div>`
          const del = descBody.querySelector('#lib-del') as HTMLElement | null
          del?.addEventListener('click', async () => {
            if (!confirm(`${entry.name || 'ウィジェット'} を削除しますか？`)) return
            try {
              await wsLoadAll(pid)
              const cur = (wsGet(pid, 'lib_widgets') as any[]) || []
              const next = cur.filter((x: any) => x && x.id !== entry.id)
              await wsSet(pid, 'lib_widgets', next)
            } catch {}
            try { showMiniToast('ウィジェットを削除しました', { variant: 'danger' }) } catch {}
            close()
            setTimeout(() => { try { openWidgetPickerModal(root, pid) } catch {} }, 0)
          })
          return
        }
      }
      descTitle.textContent = titleOf(t)
      descBody.textContent = descOf(t)
    } catch {}
  }

  // Render items as grouped hex shapes
  items.forEach((it) => {
    const col = it.rgba ? { flat: it.rgba, solid: it.rgba } : fillFor(it.type)
    const points = it.cells.map(c => px(c.q, c.r))
    const bx = Math.min(...points.map(p => p.x))
    const by = Math.min(...points.map(p => p.y))
    const bw = (Math.max(...points.map(p => p.x)) - bx) + W
    const bh = (Math.max(...points.map(p => p.y)) - by) + H
    const host = document.createElement('div')
    host.className = 'wp-item'
    host.setAttribute('data-type', it.type)
    host.style.position = 'absolute'
    host.style.left = `${(bx - minX) + PAD}px`
    host.style.top = `${(by - minY) + PAD}px`
    host.style.width = `${bw}px`
    host.style.height = `${bh}px`
    host.style.cursor = 'pointer'
    host.style.transition = 'transform .12s ease, filter .12s ease'
    host.addEventListener('mouseenter', () => { host.style.filter = 'brightness(1.08)'; showDesc(it.type) })
    host.addEventListener('mouseleave', () => { host.style.filter = '' })
    const pickFromItem = () => {
      if (it.lib) {
        // If picker was opened with an onPick callback, we're in a grid panel.
        // Grid cannot use hex placement; fallback to adding a simple "custom" widget card.
        if (onPick) {
          try { (window as any)._wpPickedLibName = it.lib.name || '' } catch {}
          close()
          setTimeout(() => { try { onPick('custom') } catch {} }, 0)
          return
        }
        // Otherwise (summary/hex canvas), start hex placement with saved shape/color
        ;(window as any)._hxwPending = { shape: it.lib.shape, rgb: it.lib.rgb, alpha: it.lib.alpha, name: it.lib.name, flowGraph: it.lib.flowGraph }
        const t = it.lib.type
        close()
        setTimeout(() => { try { hxwStartPlacement(root, pid, t) } catch {} }, 0)
      } else {
        close()
        setTimeout(() => { if (onPick) onPick(it.type); else try { hxwStartPlacement(root, pid, it.type) } catch {} }, 0)
      }
    }
    host.addEventListener('click', pickFromItem)
    host.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickFromItem() } })
    host.addEventListener('contextmenu', (ev) => {
      if (!it.lib) return
      ev.preventDefault(); ev.stopPropagation()
      const ok = confirm(`${it.lib.name || 'ウィジェット'} を削除しますか？`)
      if (!ok) return
      ;(async () => {
        try {
          await wsLoadAll(pid)
          const cur = (wsGet(pid, 'lib_widgets') as any[]) || []
          const next = cur.filter((x: any) => x && x.id !== it.lib!.id)
          await wsSet(pid, 'lib_widgets', next)
        } catch {}
        try { showMiniToast('ウィジェットを削除しました', { variant: 'danger' }) } catch {}
        ;(document.getElementById('wp-close') as HTMLButtonElement | null)?.click()
        setTimeout(() => { try { openWidgetPickerModal(root, pid) } catch {} }, 0)
      })()
    })
    host.tabIndex = 0
    it.cells.forEach((c) => {
      const p = px(c.q, c.r)
      const cell = document.createElement('div')
      cell.className = 'hxw-hex hxw-filled'
      cell.style.position = 'absolute'
      cell.style.left = `${(p.x - bx)}px`
      cell.style.top = `${(p.y - by)}px`
      cell.style.width = `${W}px`
      cell.style.height = `${H}px`
      const clip = document.createElement('div')
      clip.className = 'hxw-clip hx-svgclip'
      // use selected color for currentColor; derive side/highlight numerically
      clip.style.color = col.flat
      { const f = deriveFacets(col.flat); (clip.style as any).setProperty('--hx-side', f.side); (clip.style as any).setProperty('--hx-hi', f.hi); (clip.style as any).setProperty('--hx-edge', f.side) }
        clip.innerHTML = honeyHexFilledSvg()
      cell.appendChild(clip)
      host.appendChild(cell)
    })
    const lab = document.createElement('div')
    lab.textContent = it.label || titleOf(it.type)
    lab.style.position = 'absolute'; lab.style.inset = '0'
    lab.style.display = 'grid'; lab.style.placeItems = 'center'; lab.style.pointerEvents = 'none'
    lab.style.color = 'var(--gh-contrast)'; lab.style.textShadow = '0 1px 2px rgba(0,0,0,.18)'; lab.style.fontSize = '12px'
    host.appendChild(lab)
    canvas.appendChild(host)
  })

  // Render user's saved widgets library at the bottom of the field
  // Library items are now integrated as honeycomb shapes in the field

  // Pan and zoom similar to project detail (simple)
  const viewport = field // absolute inset-0
  const state = { scale: 1, offsetX: 0, offsetY: 0 }
  const apply = () => { const tr = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`; canvas.style.transform = tr }
  // Prepare a function to center a widget after layout is ready
  const centerInitial = () => {
    try {
      const vpW = viewport.clientWidth, vpH = viewport.clientHeight
      const nodes = Array.from(canvas.querySelectorAll('.wp-item')) as HTMLElement[]
      let tx = width / 2, ty = height / 2
      if (nodes.length) {
        // pick the item whose center is closest to canvas center
        const cx = width / 2, cy = height / 2
        let best: { d2: number; x: number; y: number } | null = null
        nodes.forEach((n) => {
          const x = (parseFloat(n.style.left || '0') || 0) + (n.offsetWidth || 0) / 2
          const y = (parseFloat(n.style.top || '0') || 0) + (n.offsetHeight || 0) / 2
          const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy)
          if (!best || d2 < best.d2) best = { d2, x, y }
        })
        if (best) { tx = best.x; ty = best.y }
      }
      state.offsetX = Math.round(vpW / 2 - tx)
      state.offsetY = Math.round(vpH / 2 - ty)
      apply()
    } catch {}
  }
  // Two-finger pan via Pointer Events (touch)
  const touches = new Map<number, { x: number; y: number }>()
  let twoPan = false
  let cx = 0, cy = 0
  const centroid = () => {
    let sx2 = 0, sy2 = 0, n = 0
    touches.forEach((p) => { sx2 += p.x; sy2 += p.y; n++ })
    return { x: sx2 / Math.max(1, n), y: sy2 / Math.max(1, n) }
  }
  const onDown = (e: PointerEvent) => {
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (touches.size >= 2 && !twoPan) { const c = centroid(); cx = c.x; cy = c.y; twoPan = true }
  }
  const onMove = (e: PointerEvent) => {
    if (!touches.has(e.pointerId)) return
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (twoPan && touches.size >= 2) {
      const c = centroid()
      state.offsetX += (c.x - cx)
      state.offsetY += (c.y - cy)
      cx = c.x; cy = c.y
      apply()
    }
  }
  const onUp = (e: PointerEvent) => {
    touches.delete(e.pointerId)
    if (touches.size < 2) twoPan = false
  }
  viewport.addEventListener('pointerdown', onDown as any)
  viewport.addEventListener('pointermove', onMove as any)
  viewport.addEventListener('pointerup', onUp as any)
  viewport.addEventListener('pointercancel', onUp as any)
  viewport.addEventListener('pointerleave', onUp as any)
  // Trackpad two-finger: wheel pan; pinch-to-zoom if ctrlKey
  viewport.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault()
    const pinchZoom = (e as any).ctrlKey || Math.abs((e as any).deltaZ || 0) > 0
    if (pinchZoom) {
      const z = Math.exp(-e.deltaY / 600)
      const next = Math.min(2.0, Math.max(0.6, state.scale * z))
      state.scale = next
    } else {
      state.offsetX -= (e as any).deltaX || 0
      state.offsetY -= (e as any).deltaY || 0
    }
    apply()
  }, { passive: false })

  // Prepare and render my library slide
  const renderMyLib = async () => {
    const host = overlay.querySelector('#wp-myfield') as HTMLElement
    if (!host) return
    host.innerHTML = ''
    try { (host.style as any).touchAction = 'none'; (host.style as any).webkitUserSelect = 'none'; (host.style as any).userSelect = 'none' } catch {}
    // Resolve current user id
    const getUid = async (): Promise<number | null> => {
      try { const app: any = document.getElementById('app'); const m = app?._me; if (m && m.id) return Number(m.id) } catch {}
      try { const me = await apiFetch<{ id: number }>(`/me`); try { (document.getElementById('app') as any)._me = me } catch {}; return me?.id ?? null } catch { return null }
    }
    const uid = await getUid()
    const my = uid != null ? userLibGet(uid) : []
    if (!my || my.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'w-full h-full grid place-items-center text-sm text-gray-400'
      empty.textContent = '手持ちのウィジェットがありません。先に作成してください。'
      host.appendChild(empty)
      return
    }
    // Compute items from my library; arrange like honeycomb tiles
    const anchors2 = axGrow(Math.max(60, my.length * 30))
    const occ2 = new Set<string>()
    const key2 = (q:number,r:number) => `${q},${r}`
    type MyItem = { lib: any; cells: Array<{q:number;r:number}>; rgba: string }
    const items2: MyItem[] = []
    my.forEach((en) => {
      const rel = (en.shape && en.shape.length) ? en.shape as Array<[number,number]> : [[0,0]]
      for (const [ax, az] of anchors2) {
        const cells = rel.map(([sx,sz]) => axialToOddq(ax+sx, az+sz))
        if (cells.some(c => occ2.has(key2(c.q,c.r)))) continue
        cells.forEach(c => occ2.add(key2(c.q,c.r)))
        const rgba = en.rgb ? `rgba(${en.rgb[0]},${en.rgb[1]},${en.rgb[2]}, ${typeof en.alpha==='number'? en.alpha : 0.38})` : fillFor('lib').flat
        items2.push({ lib: en, cells, rgba })
        break
      }
    })
    // Bounds
    const px2 = (q:number, r:number) => ({ x: q * stepX, y: Math.round((r + (q % 2 ? 0.5 : 0)) * stepY) })
    let minX2 = Infinity, minY2 = Infinity, maxX2 = -Infinity, maxY2 = -Infinity
    items2.forEach((it) => { it.cells.forEach((c) => { const p = px2(c.q, c.r); minX2 = Math.min(minX2, p.x); minY2 = Math.min(minY2, p.y); maxX2 = Math.max(maxX2, p.x); maxY2 = Math.max(maxY2, p.y) }) })
    if (!isFinite(minX2) || !isFinite(minY2)) { minX2 = 0; minY2 = 0; maxX2 = stepX; maxY2 = stepY }
    const PAD2 = 20
    const width2 = (maxX2 - minX2) + W + PAD2 * 2
    const height2 = (maxY2 - minY2) + H + PAD2 * 2
    const canvas2 = document.createElement('div')
    canvas2.id = 'wpCanvasMy'
    canvas2.style.position = 'absolute'
    canvas2.style.left = '0px'
    canvas2.style.top = '0px'
    canvas2.style.width = `${width2}px`
    canvas2.style.height = `${height2}px`
    host.appendChild(canvas2)
    const px = px2
    items2.forEach((it) => {
      const col = { flat: it.rgba, solid: it.rgba }
      const points = it.cells.map(c => px(c.q, c.r))
      const bx = Math.min(...points.map(p => p.x))
      const by = Math.min(...points.map(p => p.y))
      const bw = (Math.max(...points.map(p => p.x)) - bx) + W
      const bh = (Math.max(...points.map(p => p.y)) - by) + H
      const hostItem = document.createElement('div')
      hostItem.className = 'wp-item'
      hostItem.style.position = 'absolute'
      hostItem.style.left = `${(bx - minX2) + PAD2}px`
      hostItem.style.top = `${(by - minY2) + PAD2}px`
      hostItem.style.width = `${bw}px`
      hostItem.style.height = `${bh}px`
      hostItem.style.cursor = 'pointer'
      hostItem.style.transition = 'transform .12s ease, filter .12s ease'
      const addToProject = async () => {
        let newId: string | undefined
        try {
          await wsLoadAll(pid)
          const cur = (wsGet(pid, 'lib_widgets') as any[]) || []
          const id = `shr-${uid}-${it.lib.id}`
          newId = id
          if (!cur.find((x: any) => x && x.id === id)) {
            const copy = { ...it.lib, id, owner: uid }
            await wsSet(pid, 'lib_widgets', cur.concat(copy))
          }
        } catch {}
        try { showMiniToast('ウィジェットを追加しました') } catch {}
        try { renderProjLibList() } catch {}
        // Slide back and rebuild main field focusing the newly added item
        try { setMode('browse') } catch {}
        const fid = newId
        setTimeout(() => { try { rebuildPickerField(fid) } catch {} }, 260)
      }
      hostItem.addEventListener('click', addToProject)
      hostItem.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addToProject() } })
      const descTitle = overlay.querySelector('#wp-desc-title') as HTMLElement
      const descBody = overlay.querySelector('#wp-desc-body') as HTMLElement
      hostItem.addEventListener('mouseenter', () => {
        try { descTitle.textContent = it.lib.name || (it.lib.type === 'flow' ? 'フロー' : 'カスタム') } catch {}
        try { descBody.textContent = 'クリックしてプロジェクトに追加します。' } catch {}
      })
      it.cells.forEach((c) => {
        const p = px(c.q, c.r)
        const cell = document.createElement('div')
        cell.className = 'hxw-hex hxw-filled'
        cell.style.position = 'absolute'
        cell.style.left = `${(p.x - bx)}px`
        cell.style.top = `${(p.y - by)}px`
        cell.style.width = `${W}px`
        cell.style.height = `${H}px`
        const clip = document.createElement('div')
        clip.className = 'hxw-clip hx-svgclip'
        clip.style.color = col.flat
        { const f = deriveFacets(col.flat); (clip.style as any).setProperty('--hx-side', f.side); (clip.style as any).setProperty('--hx-hi', f.hi); (clip.style as any).setProperty('--hx-edge', f.side) }
        clip.innerHTML = honeyHexFilledSvg()
        cell.appendChild(clip)
        hostItem.appendChild(cell)
      })
      const lab = document.createElement('div')
      lab.textContent = it.lib.name || (it.lib.type === 'flow' ? 'フロー' : 'カスタム')
      lab.style.position = 'absolute'; lab.style.inset = '0'
      lab.style.display = 'grid'; lab.style.placeItems = 'center'; lab.style.pointerEvents = 'none'
      lab.style.color = 'var(--gh-contrast)'; lab.style.textShadow = '0 1px 2px rgba(0,0,0,.18)'; lab.style.fontSize = '12px'
      hostItem.appendChild(lab)
      canvas2.appendChild(hostItem)
    })
    // Pan/zoom for mylib canvas
    const viewport2 = host
    const state2 = { scale: 1, offsetX: 0, offsetY: 0 }
    const apply2 = () => { const tr = `translate(${state2.offsetX}px, ${state2.offsetY}px) scale(${state2.scale})`; canvas2.style.transform = tr }
    const center2 = () => {
      try {
        const vpW = viewport2.clientWidth, vpH = viewport2.clientHeight
        const nodes = Array.from(canvas2.querySelectorAll('.wp-item')) as HTMLElement[]
        let tx = width2 / 2, ty = height2 / 2
        if (nodes.length) {
          const cx = width2 / 2, cy = height2 / 2
          let best: { d2: number; x: number; y: number } | null = null
          nodes.forEach((n) => { const x = (parseFloat(n.style.left || '0') || 0) + (n.offsetWidth || 0) / 2; const y = (parseFloat(n.style.top || '0') || 0) + (n.offsetHeight || 0) / 2; const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy); if (!best || d2 < best.d2) best = { d2, x, y } })
          if (best) { tx = best.x; ty = best.y }
        }
        state2.offsetX = Math.round(vpW / 2 - tx)
        state2.offsetY = Math.round(vpH / 2 - ty)
        apply2()
      } catch {}
    }
    const touches = new Map<number, { x: number; y: number }>()
    let twoPan = false
    let cx = 0, cy = 0
    const centroid = () => { let sx2 = 0, sy2 = 0, n = 0; touches.forEach((p) => { sx2 += p.x; sy2 += p.y; n++ }); return { x: sx2 / Math.max(1, n), y: sy2 / Math.max(1, n) } }
    const onDown = (e: PointerEvent) => { touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (touches.size >= 2 && !twoPan) { const c = centroid(); cx = c.x; cy = c.y; twoPan = true } }
    const onMove = (e: PointerEvent) => { if (!touches.has(e.pointerId)) return; touches.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (twoPan && touches.size >= 2) { const c = centroid(); state2.offsetX += (c.x - cx); state2.offsetY += (c.y - cy); cx = c.x; cy = c.y; apply2() } }
    const onUp = (e: PointerEvent) => { touches.delete(e.pointerId); if (touches.size < 2) twoPan = false }
    viewport2.addEventListener('pointerdown', onDown as any)
    viewport2.addEventListener('pointermove', onMove as any)
    viewport2.addEventListener('pointerup', onUp as any)
    viewport2.addEventListener('pointercancel', onUp as any)
    viewport2.addEventListener('pointerleave', onUp as any)
    viewport2.addEventListener('wheel', (e: WheelEvent) => { e.preventDefault(); const pinchZoom = (e as any).ctrlKey || Math.abs((e as any).deltaZ || 0) > 0; if (pinchZoom) { const z = Math.exp(-e.deltaY / 600); state2.scale = Math.min(2.0, Math.max(0.6, state2.scale * z)) } else { state2.offsetX -= (e as any).deltaX || 0; state2.offsetY -= (e as any).deltaY || 0 } apply2() }, { passive: false })
    try { requestAnimationFrame(center2) } catch { center2() }
  }

  document.body.appendChild(overlay); (function () { const c = +(document.body.getAttribute('data-lock') || '0'); if (c === 0) { document.body.style.overflow = 'hidden' } document.body.setAttribute('data-lock', String(c + 1)) })()
  // Center after DOM is attached and sizes are known
  try { requestAnimationFrame(centerInitial) } catch { centerInitial() }
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
  if (type === 'spacer') return `<div class=\"w-20 h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded grid place-items-center\"><span class=\"text-xs text-gray-400\">1セル</span></div>`
  if (type === 'skin') {
    return `<div class=\"w-20 h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded grid place-items-center text-center\">\n      <div>\n        <div class=\"text-[11px] text-gray-300 mb-0.5\">着せ替え</div>\n        <div class=\"w-7 h-7 rounded-full bg-emerald-600 text-white grid place-items-center text-lg\">＋</div>\n      </div>\n    </div>`
  }
  if (type === 'tabnew') {
    return `<div class=\"w-20 h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded grid place-items-center text-center\">\n      <div>\n        <div class=\"text-[11px] text-gray-300 mb-0.5\">新規タブ</div>\n        <div class=\"w-7 h-7 rounded-full bg-emerald-600 text-white grid place-items-center text-lg\">＋</div>\n      </div>\n    </div>`
  }
  if (type === 'tabbar') {
    return `<div class=\"w-full h-24 bg-neutral-900/60 ring-2 ring-neutral-600 rounded p-2 text-[11px] text-gray-300\">\n      <div class=\"space-y-1\">\n        <div class=\"rounded bg-neutral-800/70 px-2 py-1\">概要</div>\n        <div class=\"rounded bg-neutral-800/50 px-2 py-1\">カンバンボード</div>\n        <div class=\"rounded bg-neutral-800/40 px-2 py-1\">＋ 新規タブ</div>\n      </div>\n    </div>`
  }
  if (type === 'invite') {
    return `<div class=\"w-full h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded grid place-items-center\"><div class=\"text-xs text-gray-300\">メンバーを追加</div></div>`
  }
  if (type === 'account') {
    return `<div class=\"w-full h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded grid place-items-center\"><div class=\"text-xs text-gray-300\">ユーザー設定</div></div>`
  }
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
  if (type === 'readme') return `<div class="w-full h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded grid place-items-center"><div class="rd-open text-xs px-2 py-1 rounded bg-neutral-800/70 ring-2 ring-neutral-600 text-gray-100">README を開く</div></div>`
  if (type === 'markdown') return `<div class="w-full h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded grid place-items-center"><div class="md-open text-xs px-2 py-1 rounded bg-neutral-800/70 ring-2 ring-neutral-600 text-gray-100">Markdown を開く</div></div>`
  if (type === 'tasksum') return `<div class="w-full h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded p-2 grid grid-cols-3 gap-2 text-[10px] text-gray-300"><div class="rounded bg-neutral-800/60 p-1 text-center">TODO<br/><span class="text-emerald-400">5</span></div><div class="rounded bg-neutral-800/60 p-1 text-center">DOING<br/><span class="text-emerald-400">3</span></div><div class="rounded bg-neutral-800/60 p-1 text-center">DONE<br/><span class="text-emerald-400">8</span></div></div>`
  if (type === 'milestones') return `<div class="w-full h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded p-2 text-xs text-gray-400"><div>v1.0 リリース</div><div class="text-gray-500">2025-01-31</div></div>`
  if (type === 'links') return `<div class="w-full h-20 bg-neutral-900/60 ring-2 ring-neutral-600 rounded p-2 text-xs text-gray-400">- PR一覧\n- 仕様書</div>`
  if (type === 'calendar') return `<div class="w-full h-24 bg-neutral-900/60 ring-2 ring-neutral-600 rounded p-2 text-xs text-gray-300 grid place-items-center">Googleカレンダー<br/>(埋め込みURL)</div>`
  if (type === 'clock') return `<div class="w-full h-24 bg-neutral-900/60 ring-2 ring-neutral-600 rounded grid place-items-center"><div class="text-sm text-gray-300">Analog</div></div>`
  if (type === 'clock-digital') return `<div class="w-full h-24 bg-neutral-900/60 ring-2 ring-neutral-600 rounded grid place-items-center"><div class="text-2xl font-mono text-gray-200">12:34</div></div>`
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
    // expose type for delegated clicks
    try { (el as HTMLElement).setAttribute('data-type', type) } catch {}
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
    // If this custom widget came from user's library in grid context, lock it and show its name. Whole widget acts as a button.
    if (type === 'custom') {
      let pickedName = ''
      try { pickedName = String((window as any)._wpPickedLibName || '') } catch {}
      if (pickedName) {
        const card = el as HTMLElement
        card.setAttribute('data-locked', '1')
        card.setAttribute('data-name', pickedName)
        const body = card.querySelector('.wg-content') as HTMLElement | null
        if (body) {
          body.innerHTML = `<button class="w-full h-full grid place-items-center text-center px-2 py-1 rounded bg-neutral-900/40 ring-2 ring-neutral-600 hover:bg-neutral-900/60 text-gray-100 transition shadow-sm hover:shadow-md hover:brightness-110" style="min-height:64px">${escapeHtml(pickedName)}</button>`
          const btn = body.querySelector('button') as HTMLButtonElement | null
          btn?.addEventListener('click', (e) => {
            e.stopPropagation()
            const gridEl = card.closest('#widgetGrid') as HTMLElement | null
            if (gridEl?.getAttribute('data-edit') === '1') return
            try { openWidgetRunModal(root, pid, id, 'custom', pickedName) } catch {}
          })
        }
        // Make the whole card act as a button in view mode
        card.addEventListener('click', (e) => {
          const gridEl = card.closest('#widgetGrid') as HTMLElement | null
          if (gridEl?.getAttribute('data-edit') === '1') return
          e.stopPropagation()
          try { openWidgetRunModal(root, pid, id, 'custom', pickedName) } catch {}
        })
        // Note: ホバー効果は内側ボタンにのみ適用（カード全体には適用しない）
        // Hide edit affordances for locked card
        ;(card.querySelector('.w-del') as HTMLElement | null)?.classList.add('hidden')
        card.querySelectorAll('.wg-rz').forEach((n) => (n as HTMLElement).classList.add('hidden'))
        ;(card.querySelector('.wg-move') as HTMLElement | null)?.classList.add('hidden')
        // Clear the global hint to avoid affecting later additions
        try { (window as any)._wpPickedLibName = '' } catch {}
        try { showMiniToast('ウィジェットを追加しました') } catch {}
      }
    }
    // markdown: popup mode → 初期同期は不要
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
    ? `<div class=\"h-full min-h-[220px] overflow-hidden\"><iframe class=\"w-full h-full\" src=\"https://www.youtube.com/embed/${escHtml(yt)}\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen></iframe></div>`
    : `<div class=\"aspect-video overflow-hidden rounded-md ring-1 ring-neutral-600\"><iframe class=\"w-full h-full\" src=\"https://www.youtube.com/embed/${escHtml(yt)}\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen></iframe></div>`
  const vm = vimeoId(url)
  if (vm) return full
    ? `<div class=\"h-full min-h-[220px] overflow-hidden\"><iframe class=\"w-full h-full\" src=\"https://player.vimeo.com/video/${escHtml(vm)}\" allow=\"autoplay; fullscreen; picture-in-picture\" allowfullscreen></iframe></div>`
    : `<div class=\"aspect-video overflow-hidden rounded-md ring-1 ring-neutral-600\"><iframe class=\"w-full h-full\" src=\"https://player.vimeo.com/video/${escHtml(vm)}\" allow=\"autoplay; fullscreen; picture-in-picture\" allowfullscreen></iframe></div>`
  const lm = loomId(url)
  if (lm) return full
    ? `<div class=\"h-full min-h-[220px] overflow-hidden\"><iframe class=\"w-full h-full\" src=\"https://www.loom.com/embed/${escHtml(lm)}\" allowfullscreen></iframe></div>`
    : `<div class=\"aspect-video overflow-hidden rounded-md ring-1 ring-neutral-600\"><iframe class=\"w-full h-full\" src=\"https://www.loom.com/embed/${escHtml(lm)}\" allowfullscreen></iframe></div>`
  const fg = figmaEmbed(url)
  if (fg) return full
    ? `<div class=\"h-full min-h-[220px] overflow-hidden\"><iframe class=\"w-full h-full\" src=\"${escHtml(fg)}\" allowfullscreen></iframe></div>`
    : `<div class=\"aspect-video overflow-hidden rounded-md ring-1 ring-neutral-600\"><iframe class=\"w-full h-full\" src=\"${escHtml(fg)}\" allowfullscreen></iframe></div>`
  const gd = googleDocEmbed(url)
  if (gd) return full
    ? `<div class=\"h-full min-h-[220px] overflow-hidden\"><iframe class=\"w-full h-full\" src=\"${escHtml(gd)}\"></iframe></div>`
    : `<div class=\"h-56 overflow-hidden rounded-md ring-1 ring-neutral-600\"><iframe class=\"w-full h-full\" src=\"${escHtml(gd)}\"></iframe></div>`
  // GitHub lightweight card
  try {
    const u = new URL(url)
    if (u.hostname.includes('github.com')) {
      const path = u.pathname.replace(/^\/+/, '')
      return `<div class=\"rounded-md ring-1 ring-neutral-700 p-3 text-xs\">GitHub: <span class=\"text-gray-300\">${escHtml(path || '')}</span></div>`
    }
  } catch { }
  // Generic iframe attempt as best-effort
  const gen = renderGenericFrame(url, full)
  if (gen) return gen
  // Fallback text
  return `<div class=\"rounded-md ring-1 ring-neutral-700 p-6 text-xs text-gray-400 grid place-items-center\">プレビュー未対応</div>`
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
        <div class=\"flex-1 min-h-[220px]\"></div>
        <div class=\"p-4 border-t border-neutral-700/60\">
          <div class=\"h-4 w-2/3 bg-neutral-800 rounded mb-2\"></div>
          <div class=\"h-3 w-4/5 bg-neutral-800 rounded\"></div>
        </div>
      </div>
    `
  }
  return `
    <div>
      <div class=\"h-40\"></div>
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
  const media = img ? `<img src=\"${img}\" alt=\"\" class=\"w-full ${hero ? 'h-full min-h-[220px]' : 'h-40'} object-cover\" loading=\"lazy\"/>` : `<div class=\"${hero ? 'h-full min-h-[220px]' : 'h-40'}\"></div>`
  if (hero) {
    return `
      <a href=\"${u}\" target=\"_blank\" class=\"block h-full flex flex-col\">
        <div class=\"flex-1\">${media}</div>
        <div class=\"px-4 py-3 border-t border-neutral-700/60\">
          <div class=\"text-[15px] text-gray-100 font-medium truncate\">${title || u}</div>
          <div class=\"text-[12px] text-gray-400 mt-0.5 line-clamp-2\">${desc}</div>
          <div class=\"text-[11px] text-gray-400 mt-1 flex items-center gap-2\">${favicon ? `<img src=\"${favicon}\" class=\"w-4 h-4\"/>` : ''}<span class=\"inline-block px-1.5 py-0.5 rounded ring-1 ring-neutral-700\">${site}</span></div>
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
        <div class=\"text-[11px] text-gray-400 mt-1 flex items-center gap-2\">${favicon ? `<img src=\"${favicon}\" class=\"w-4 h-4\"/>` : ''}<span class=\"inline-block px-1.5 py-0.5 rounded ring-1 ring-neutral-700\">${site}</span></div>
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
  if (hero) return `<a href=\"${safeUrl}\" target=\"_blank\" class=\"block h-full rounded-xl ring-1 ring-neutral-600 hover:ring-neutral-500 transition-colors\">${inner}</a>`
  return `<a href=\"${safeUrl}\" target=\"_blank\" class=\"block rounded-xl ring-1 ring-neutral-600 hover:ring-neutral-500 transition-colors\">${inner}</a>`
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
          <div class=\"lnk-card h-full flex flex-col rounded-xl ring-1 ring-neutral-600 overflow-hidden\">
            <div class=\"flex-1 min-h-[200px]\">${body}</div>
            <div class=\"px-4 py-3 border-t border-neutral-700/60 flex items-center gap-2\">
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
        <div class=\"lnk-card rounded-xl ring-1 ring-neutral-600 overflow-hidden\">
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
      <div class=\"lnk-card rounded-xl ring-1 ring-neutral-600 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset] hover:ring-neutral-500 transition-colors\">
        <div class=\"flex items-start gap-3\">
          <img src=\"${fav}\" alt=\"\" class=\"w-5 h-5 mt-0.5 opacity-90\" onerror=\"this.style.display='none'\" />
          <div class=\"min-w-0 flex-1\">
            <a href=\"${url}\" target=\"_blank\" class=\"text-[15px] text-sky-400 hover:text-sky-300 font-medium truncate inline-block max-w-full\">${title || url}</a>
            <div class=\"text-[11px] text-gray-400 mt-0.5\"><span class=\"inline-block px-1.5 py-0.5 rounded ring-1 ring-neutral-700\">${domain}</span></div>
          </div>
          ${actions}
        </div>
        <div class=\"${previewCls}\">${renderLinkPreview(l.url)}</div>
      </div>
    `
  }).join('')
}

// Hex circle preview for Links: unfurl metadata and fill circle with image or fallback
async function hydrateLinkCircle(circle: HTMLElement, url: string): Promise<void> {
  try {
    if (!circle) return
    const safeUrl = (url || '').trim()
    if (!safeUrl) { circle.innerHTML = ``; return }
    // Loading indicator
    circle.innerHTML = `<div class="w-full h-full grid place-items-center text-[11px] text-gray-400">読み込み中…</div>`
    let meta: LinkMeta | null = null
    const cached = unfurlLoad(safeUrl)
    if (cached && (Date.now() - (cached.ts || 0)) < UNFURL_TTL) meta = cached.meta
    else { meta = await unfurlFetch(safeUrl); if (meta) unfurlSave(safeUrl, meta) }
    const img = (meta && meta.image) ? String(meta.image) : ''
    if (img) {
      circle.innerHTML = `<a href="${escHtml(safeUrl)}" target="_blank" class="block w-full h-full"><img src="${escHtml(img)}" alt="" class="w-full h-full object-cover"/></a>`
    } else {
      const fav = faviconSrc(safeUrl)
      const domain = linkDomain(safeUrl)
      circle.innerHTML = `<a href="${escHtml(safeUrl)}" target="_blank" class="block w-full h-full grid place-items-center text-center">
        <div class="flex items-center gap-2 text-gray-200 text-[12px] px-2">
          ${fav ? `<img src="${fav}" class="w-5 h-5" onerror="this.style.display='none'"/>` : ''}
          <span class="truncate max-w-[80%]">${escHtml(domain || safeUrl)}</span>
        </div>
      </a>`
    }
  } catch {
    const domain = linkDomain(url)
    circle.innerHTML = `<a href="${escHtml(url)}" target="_blank" class="block w-full h-full grid place-items-center text-center">
      <div class="text-gray-300 text-xs px-2 truncate">${escHtml(domain || url)}</div>
    </a>`
  }
}

function refreshDynamicWidgets(root: HTMLElement, pid: string): void {
  // Task summary + union with hex widgets meta
  const metaGrid = getWidgetMeta(pid)
  const metaHex = hxwGetMeta(pid)
  const ids = new Set<string>([...Object.keys(metaGrid || {}), ...Object.keys(metaHex || {})])
  ids.forEach((id) => {
    const m = (metaHex as any)[id] || (metaGrid as any)[id] || {}
    const w = root.querySelector(`[data-widget="${id}"]`) as HTMLElement | null
    if (!w) return
    if (m.type === 'readme') {
      try {
        const gridEl = w.closest('#widgetGrid') as HTMLElement | null
        const hx = w.closest('#hxwCanvas') as HTMLElement | null
        const isEdit = (gridEl?.getAttribute('data-edit') === '1') || (hx?.getAttribute('data-edit') === '1')
        const ensureOverlay = () => {
          let ovl = w.querySelector('.wg-ovl') as HTMLElement | null
          if (!ovl) {
            ovl = document.createElement('button')
            ovl.className = 'wg-ovl'
            ovl.style.position = 'absolute'
            ovl.style.left = '0'; ovl.style.top = '0'; ovl.style.right = '0'; ovl.style.bottom = '0'
            ovl.style.display = 'grid'; (ovl.style as any).placeItems = 'center'
            ovl.style.background = 'transparent'
            ovl.style.zIndex = '9'
            ovl.style.border = 'none'
            ovl.style.outline = 'none'
            ovl.style.transition = 'background-color .12s ease, box-shadow .12s ease, transform .04s ease'
            ovl.addEventListener('click', (ev) => { ev.stopPropagation(); openReadmeModal(root) })
            const lab = document.createElement('div')
            lab.className = 'wg-label'
            lab.textContent = 'README'
            lab.style.padding = '2px 6px'
            lab.style.borderRadius = '8px'
            lab.style.background = 'rgba(0,0,0,0.35)'
            lab.style.color = 'var(--gh-contrast)'
            lab.style.fontSize = '16px'; lab.style.fontWeight = '700'
            ovl.appendChild(lab)
            w.appendChild(ovl)
            // hover/active feedback
            ovl.addEventListener('mouseenter', () => { if (ovl && !ovl.hasAttribute('disabled')) { ovl.style.background = 'rgba(255,255,255,0.06)'; ovl.style.boxShadow = '' } })
            ovl.addEventListener('mouseleave', () => { if (ovl) { ovl.style.background = 'transparent'; ovl.style.boxShadow = '' } })
            ovl.addEventListener('mousedown', () => { if (ovl && !ovl.hasAttribute('disabled')) ovl.style.transform = 'scale(0.995)' })
            ovl.addEventListener('mouseup', () => { if (ovl) ovl.style.transform = '' })
          }
          ovl.toggleAttribute('disabled', !!isEdit)
          ovl.style.pointerEvents = isEdit ? 'none' : 'auto'
          w.classList.toggle('cursor-pointer', !isEdit)
          w.setAttribute('title', !isEdit ? 'クリックでREADMEを開く' : '')
          // Clip overlay to hex union soホバーの半透明がはみ出さない
          try {
            const body2 = w.querySelector('.hxw-body') as HTMLElement | null
            const cp = body2 && ((body2.style as any).clipPath || (body2.style as any).webkitClipPath)
            if (cp) { (ovl.style as any).clipPath = cp; (ovl.style as any).webkitClipPath = cp }
          } catch {}
        }
        ensureOverlay()
        const slotsWrap = w.querySelector('.hxw-cells') as HTMLElement | null
        if (slotsWrap) { (slotsWrap as HTMLElement).querySelectorAll('.slot-inner').forEach((s) => ((s as HTMLElement).innerHTML = '')) }
      } catch {}
      return
    }
    if (m.type === 'markdown') {
      try {
        const gridEl = w.closest('#widgetGrid') as HTMLElement | null
        const hx = w.closest('#hxwCanvas') as HTMLElement | null
        const isEdit = (gridEl?.getAttribute('data-edit') === '1') || (hx?.getAttribute('data-edit') === '1')
        const ensureOverlay = () => {
          let ovl = w.querySelector('.wg-ovl') as HTMLElement | null
          if (!ovl) {
            ovl = document.createElement('button')
            ovl.className = 'wg-ovl'
            ovl.style.position = 'absolute'
            ovl.style.left = '0'; ovl.style.top = '0'; ovl.style.right = '0'; ovl.style.bottom = '0'
            ovl.style.display = 'grid'; (ovl.style as any).placeItems = 'center'
            ovl.style.background = 'transparent'
            ovl.style.zIndex = '9'
            ovl.style.border = 'none'
            ovl.style.outline = 'none'
            ovl.style.transition = 'background-color .12s ease, box-shadow .12s ease, transform .04s ease'
            ovl.addEventListener('click', (ev) => { ev.stopPropagation(); const id = w.getAttribute('data-widget') || ''; openMarkdownModal(root, pid, id) })
            const lab = document.createElement('div')
            lab.className = 'wg-label'
            lab.textContent = 'Markdown'
            lab.style.padding = '2px 6px'
            lab.style.borderRadius = '8px'
            lab.style.background = 'rgba(0,0,0,0.35)'
            lab.style.color = 'var(--gh-contrast)'
            lab.style.fontSize = '16px'; lab.style.fontWeight = '700'
            ovl.appendChild(lab)
            w.appendChild(ovl)
            ovl.addEventListener('mouseenter', () => { if (ovl && !ovl.hasAttribute('disabled')) { ovl.style.background = 'rgba(255,255,255,0.06)'; ovl.style.boxShadow = '' } })
            ovl.addEventListener('mouseleave', () => { if (ovl) { ovl.style.background = 'transparent'; ovl.style.boxShadow = '' } })
            ovl.addEventListener('mousedown', () => { if (ovl && !ovl.hasAttribute('disabled')) ovl.style.transform = 'scale(0.995)' })
            ovl.addEventListener('mouseup', () => { if (ovl) ovl.style.transform = '' })
          }
          ovl.toggleAttribute('disabled', !!isEdit)
          ovl.style.pointerEvents = isEdit ? 'none' : 'auto'
          w.classList.toggle('cursor-pointer', !isEdit)
          w.setAttribute('title', !isEdit ? 'クリックでMarkdownを開く' : '')
          try {
            const body2 = w.querySelector('.hxw-body') as HTMLElement | null
            const cp = body2 && ((body2.style as any).clipPath || (body2.style as any).webkitClipPath)
            if (cp) { (ovl.style as any).clipPath = cp; (ovl.style as any).webkitClipPath = cp }
          } catch {}
        }
        ensureOverlay()
        const slotsWrap = w.querySelector('.hxw-cells') as HTMLElement | null
        if (slotsWrap) { (slotsWrap as HTMLElement).querySelectorAll('.slot-inner').forEach((s) => ((s as HTMLElement).innerHTML = '')) }
      } catch {}
      return
    }
    if (m.type === 'tabnew') {
      const slotsWrap = w.querySelector('.hxw-cells') as HTMLElement | null
      const wsKey = `tabnew:${id}`
      const tnGet = (): { id: string; title?: string } | null => { try { return wsGet(pid, wsKey) || null } catch { return null } }
      const tnSet = (v: { id: string; title?: string }) => { try { wsSet(pid, wsKey, v) } catch {} }
      const tnClear = () => { try { wsSet(pid, wsKey, null) } catch {} }
      const renderCell = (host: HTMLElement) => {
        const assoc = tnGet()
        if (assoc && assoc.id && assoc.id.startsWith('custom-')) {
          // Clear only if the associated custom tab no longer exists in saved tabs
          try {
            const saved = JSON.parse(localStorage.getItem(`tabs-${pid}`) || '[]') as Array<{ id: string }>
            if (!saved.some((t) => t.id === assoc.id)) tnClear()
          } catch {}
        }
        const st = tnGet()
        if (st && st.id) {
          // Prefer actual tab label from the bar if available (keeps rename in sync)
          const btnInBar = root.querySelector(`#tabBar .tab-btn[data-tab="${st.id}"]`) as HTMLElement | null
          const title = (btnInBar?.textContent?.trim()) || st.title || 'タブへ移動'
          host.innerHTML = `<div class="w-full h-full grid place-items-center text-center">
            <div>
              <div class="text-[11px] text-gray-300 mb-0.5">${title}</div>
              <button class="tn-go rounded bg-neutral-800/70 ring-2 ring-neutral-600 text-gray-100 px-3 py-1 text-sm">移動</button>
            </div>
          </div>`
          const go = host.querySelector('.tn-go') as HTMLElement | null
          const goAction = () => {
            const btn = root.querySelector(`#tabBar .tab-btn[data-tab="${st.id}"]`) as HTMLElement | null
            if (btn) (btn as HTMLButtonElement).click()
            else {
              root.querySelectorAll('section[data-tab]')
                .forEach((sec) => (sec as HTMLElement).classList.toggle('hidden', sec.getAttribute('data-tab') !== st.id))
            }
          }
          go?.addEventListener('click', (e) => { e.stopPropagation(); goAction() })
          // Whole tile acts as a button; overwrite handler each render
          host.style.cursor = 'pointer'
          ;(host as any).onclick = goAction
          // Keep stored title up-to-date
          try { tnSet({ id: st.id, title }) } catch {}
          return
        }
        host.innerHTML = `<div class="w-full h-full grid place-items-center text-center">
          <div>
            <div class="text-[11px] text-gray-300 mb-0.5">新規タブ</div>
            <button class="tn-add rounded-full bg-emerald-600 text-white w-8 h-8 leading-none text-xl">＋</button>
          </div>
        </div>`
        const btn = host.querySelector('.tn-add') as HTMLElement | null
        const openPicker = () => {
          openTabPickerModal(root, { onSelect: (type: TabTemplate) => {
            const newId = `custom-${Date.now()}`
            const title = tabTitle(type)
            addCustomTab(root, pid, type, true, newId, title)
            tnSet({ id: newId, title })
            renderCell(host)
            root.querySelectorAll('section[data-tab]')
              .forEach((sec) => (sec as HTMLElement).classList.toggle('hidden', sec.getAttribute('data-tab') !== newId))
          } } as any)
        }
        btn?.addEventListener('click', (e) => { e.stopPropagation(); openPicker() })
        host.style.cursor = 'pointer'
        ;(host as any).onclick = openPicker
      }
      if (slotsWrap) {
        const inner = slotsWrap.querySelector('.hxw-slot .slot-inner') as HTMLElement | null
        if (inner) renderCell(inner)
      } else {
        const body = w.querySelector('.wg-content') as HTMLElement | null
        if (body) renderCell(body)
      }
      return
    }
    if (m.type === 'account') {
      const slotsWrap = w.querySelector('.hxw-cells') as HTMLElement | null
      const renderCell = (host: HTMLElement) => {
        host.innerHTML = `<div class="w-full h-full grid place-items-center text-center">
          <div>
            <div class="text-[11px] text-gray-300 mb-0.5">ユーザー設定</div>
            <button class="ac-open rounded bg-neutral-800/70 ring-2 ring-neutral-600 text-gray-100 px-3 py-1 text-sm">開く</button>
          </div>
        </div>`
        const btn = host.querySelector('.ac-open') as HTMLElement | null
        const openAcc = () => openAccountModal(root)
        btn?.addEventListener('click', (e) => { e.stopPropagation(); openAcc() })
        host.style.cursor = 'pointer'
        ;(host as any).onclick = openAcc
      }
      if (slotsWrap) {
        const inner = slotsWrap.querySelector('.hxw-slot .slot-inner') as HTMLElement | null
        if (inner) renderCell(inner)
      } else {
        const body = w.querySelector('.wg-content') as HTMLElement | null
        if (body) renderCell(body)
      }
      return
    }
    if (m.type === 'skin') {
      const slotsWrap = w.querySelector('.hxw-cells') as HTMLElement | null
      const wsKey = `skin:${id}`
      type ThemeId = 'dark' | 'warm' | 'sakura'
      const renderCell = (host: HTMLElement) => {
        const st = (wsGet(pid, wsKey) as { theme?: ThemeId } | null) || null
        const choose = () => {
          host.innerHTML = `<div class=\"w-full h-full grid place-items-center text-center\">\n            <div>\n              <div class=\"text-[11px] text-gray-300 mb-1\">テーマを選択</div>\n              <div class=\"flex items-center justify-center gap-2\">\n                <button data-th=\"warm\" class=\"px-2 py-1 rounded bg-neutral-800/70 ring-2 ring-neutral-600 text-xs text-gray-100 hover:bg-neutral-800\">ウォーム</button>\n                <button data-th=\"sakura\" class=\"px-2 py-1 rounded bg-neutral-800/70 ring-2 ring-neutral-600 text-xs text-gray-100 hover:bg-neutral-800\">さくら</button>\n              </div>\n            </div>\n          </div>`
          host.querySelectorAll('[data-th]')?.forEach((b) => {
            b.addEventListener('click', async () => {
              const th = (b as HTMLElement).getAttribute('data-th') as ThemeId
              await wsSet(pid, wsKey, { theme: th })
              renderCell(host)
            })
          })
        }
        if (st && st.theme) {
          const cur = getTheme()
          const label = st.theme === 'warm' ? 'ウォーム' : st.theme === 'sakura' ? 'さくら' : 'ダーク'
          const thClass = st.theme === 'warm' ? 'th-warm' : (st.theme === 'sakura' ? 'th-sakura' : 'th-dark')
          host.innerHTML = `<button class=\"w-full h-full grid place-items-center text-center group\" title=\"クリックで切替\">\n            <div class=\"flex flex-col items-center\">\n              <div class=\"text-[11px] text-gray-300 mb-1\">着せ替え</div>\n              <div class=\"sk-prev ${thClass} rounded-md ring-2 ring-neutral-600 bg-neutral-900/50 p-2 relative overflow-hidden\" data-demo=\"1\" style=\"width:88px;height:46px;\">\n                <div class=\"h-full w-full rounded-sm\" style=\"background-color: var(--gh-canvas-subtle); border:1px solid var(--gh-border);\"></div>\n                <div class=\"absolute left-2 bottom-2 h-2 w-10 rounded-sm\" style=\"background: var(--gh-green); opacity:.9\"></div>\n                <div class=\"absolute right-2 top-2 text-[9px]\" style=\"color: var(--gh-accent);\">Aa</div>\n              </div>\n              <div class=\"mt-1 px-2 py-0.5 rounded bg-neutral-800/60 text-gray-100 text-[11px] group-hover:bg-neutral-800\">${label}・${cur === st.theme ? 'ON' : 'OFF'}</div>\n            </div>\n          </button>`
          const btn = host.querySelector('button') as HTMLButtonElement | null
          const toggle = () => {
            const now = getTheme()
            const next = now === st.theme ? 'dark' : st.theme
            setTheme(next as ThemeId)
          }
          btn?.addEventListener('click', (e) => { e.stopPropagation(); toggle() })
          host.style.cursor = 'pointer'
          ;(host as any).onclick = toggle
          return
        }
        // not configured yet -> show plus to choose
        host.innerHTML = `<div class=\"w-full h-full grid place-items-center text-center\">\n          <div>\n            <div class=\"text-[11px] text-gray-300 mb-0.5\">着せ替え</div>\n            <button class=\"sk-add rounded-full bg-emerald-600 text-white w-8 h-8 leading-none text-xl\" title=\"テーマを選択\">＋</button>\n          </div>\n        </div>`
        const btn = host.querySelector('.sk-add') as HTMLElement | null
        const pick = () => choose()
        btn?.addEventListener('click', (e) => { e.stopPropagation(); pick() })
        host.style.cursor = 'pointer'
        ;(host as any).onclick = pick
      }
      if (slotsWrap) {
        const inner = slotsWrap.querySelector('.hxw-slot .slot-inner') as HTMLElement | null
        if (inner) renderCell(inner)
      } else {
        const body = w.querySelector('.wg-content') as HTMLElement | null
        if (body) renderCell(body)
      }
      return
    }
    if (m.type === 'invite') {
      const slotsWrap = w.querySelector('.hxw-cells') as HTMLElement | null
      const wsKey = `invite:${id}`
      const ivGet = (): { login: string; avatar_url?: string } | null => { try { return wsGet(pid, wsKey) || null } catch { return null } }
      const ivSet = (v: { login: string; avatar_url?: string }) => { try { wsSet(pid, wsKey, v) } catch {} }
      const openPicker = () => {
        document.getElementById('ivPicker')?.remove()
        const overlay = document.createElement('div')
        overlay.id = 'ivPicker'
        overlay.className = 'fixed inset-0 z-[90] bg-black/50 grid place-items-center'
        overlay.innerHTML = `<div class=\"relative w-[min(420px,92vw)] rounded-lg bg-neutral-900 ring-2 ring-neutral-600 p-3 text-gray-100\">\n          <button id=\"iv-close\" class=\"absolute right-2 top-2 text-neutral-400 hover:text-white text-xl leading-none\" title=\"閉じる\">×</button>\n          <div class=\"text-sm mb-2\">メンバーを選択</div>\n          <input id=\"iv-q\" class=\"w-full rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100\" placeholder=\"検索\" />\n          <div id=\"iv-list\" class=\"mt-2 max-h-64 overflow-auto divide-y divide-neutral-700\"></div>\n        </div>`
        document.body.appendChild(overlay)
        const doClose = () => { try { document.removeEventListener('keydown', onKey) } catch {}; overlay.remove() }
        overlay.addEventListener('click', (ev) => { if (ev.target === overlay) doClose() })
        overlay.querySelector('#iv-close')?.addEventListener('click', doClose)
        const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') doClose() }
        setTimeout(() => document.addEventListener('keydown', onKey), 0)
        const listEl = overlay.querySelector('#iv-list') as HTMLElement
        const input = overlay.querySelector('#iv-q') as HTMLInputElement
        const renderItems = (arr: Array<{ login: string; avatar_url?: string }>) => {
          listEl.innerHTML = arr.map(u => `<button data-login=\"${u.login}\" data-avatar=\"${u.avatar_url || ''}\" class=\"w-full text-left flex items-center gap-2 px-2 py-1 hover:bg-neutral-800/60\">\n            <img src=\"${u.avatar_url || `https://avatars.githubusercontent.com/${u.login}?s=64`}\" class=\"w-5 h-5 rounded-full\"/>\n            <span>${u.login}</span>\n          </button>`).join('')
          listEl.querySelectorAll('[data-login]')?.forEach((el) => {
            el.addEventListener('click', async () => {
              const login = (el as HTMLElement).getAttribute('data-login') || ''
              const avatar = (el as HTMLElement).getAttribute('data-avatar') || ''
              try {
                await apiFetch(`/projects/${pid}/collaborators`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login, permission: 'push' }) })
                ivSet({ login, avatar_url: avatar })
                doClose()
                try { refreshDynamicWidgets(root, pid) } catch {}
              } catch { alert('招待に失敗しました') }
            })
          })
        }
        let t: any
        input.addEventListener('input', async () => {
          const q = input.value.trim()
          clearTimeout(t)
          if (!q) { listEl.innerHTML = ''; return }
          t = setTimeout(async () => {
            try { const res = await apiFetch<any>(`/github/search/users?query=${encodeURIComponent(q)}`); renderItems(res.items || []) } catch { listEl.innerHTML = '<div class=\"px-2 py-2 text-gray-400\">読み込みに失敗しました</div>' }
          }, 250)
        })
        input.focus()
      }
      const renderCell = (host: HTMLElement) => {
        const st = ivGet()
        if (st && st.login) {
          const avatar = st.avatar_url || `https://avatars.githubusercontent.com/${st.login}?s=96`
          host.innerHTML = `<div class=\"w-full h-full grid place-items-center text-center\">\n            <div class=\"grid place-items-center\">\n              <img src=\"${avatar}\" class=\"w-10 h-10 rounded-full ring-2 ring-neutral-600 object-cover\"/>\n              <div class=\"mt-1 text-[12px] text-gray-200 truncate max-w-[90px]\">${st.login}</div>\n            </div>\n          </div>`
          host.style.cursor = 'pointer'
          ;(host as any).onclick = () => openPicker()
          return
        }
        host.innerHTML = `<div class=\"w-full h-full grid place-items-center text-center\">\n          <div>\n            <div class=\"text-[11px] text-gray-300 mb-0.5\">メンバー追加</div>\n            <button class=\"iv-add rounded-full bg-emerald-600 text-white w-8 h-8 leading-none text-xl\">＋</button>\n          </div>\n        </div>`
        const btn = host.querySelector('.iv-add') as HTMLElement | null
        btn?.addEventListener('click', (e) => { e.stopPropagation(); openPicker() })
        host.style.cursor = 'pointer'
        ;(host as any).onclick = () => openPicker()
      }
      if (slotsWrap) {
        const inner = slotsWrap.querySelector('.hxw-slot .slot-inner') as HTMLElement | null
        if (inner) renderCell(inner)
      } else {
        const body = w.querySelector('.wg-content') as HTMLElement | null
        if (body) renderCell(body)
      }
      return
    }
    if (m.type === 'flow') {
      const box = w.querySelector('.flow-body') as HTMLElement | null
      const canvas = w.querySelector('.flow-canvas') as HTMLElement | null
      const svg = w.querySelector('.flow-svg') as SVGSVGElement | null
      if (box && canvas && svg) {
        const isHex = !!w.closest('.hxw-widget')
        const gridEl = w.closest('#widgetGrid') as HTMLElement | null
        const edit = gridEl?.getAttribute('data-edit') === '1'
        const g = flowLoad(pid, id)
        // Mode toggle: logic/design
        const paletteWrap = (w.querySelector('.flow-palette') as HTMLElement | null)
        const designWrap = (w.querySelector('.flow-design') as HTMLElement | null)
        const modeBtns = Array.from(w.querySelectorAll('.flow-mode [data-mode]')) as HTMLElement[]
        const applyMode = (md: 'logic'|'design') => {
          if (isHex) {
            if (paletteWrap) paletteWrap.classList.add('hidden')
            if (designWrap) designWrap.classList.add('hidden')
            if (box) box.classList.add('hidden')
            return
          }
          if (paletteWrap) paletteWrap.classList.toggle('hidden', md !== 'logic')
          if (designWrap) designWrap.classList.toggle('hidden', md !== 'design')
          if (box) box.classList.toggle('hidden', md !== 'logic')
          modeBtns.forEach(btn => {
            const on = (btn.getAttribute('data-mode') === md)
            btn.classList.toggle('bg-neutral-800/80', on)
            btn.classList.toggle('text-gray-100', on)
            btn.classList.toggle('text-gray-300', !on)
          })
        }
        const currentMode = flowModeGet(pid, id)
        applyMode(currentMode)
        if (!isHex) modeBtns.forEach(btn => btn.addEventListener('click', () => { const md = (btn.getAttribute('data-mode') as any) || 'logic'; flowModeSet(pid, id, md); applyMode(md) }))
        // Design panel (color/alpha + shape presets)
        const applyDesignUpdate = (conf: { rgb?: [number,number,number]; alpha?: number; shape?: Array<[number,number]> }) => {
          const cur = hxwCustomGet(pid, id) || {}
          const next = { ...cur, ...conf }
          try { hxwCustomSet(pid, id, next) } catch {}
          // Rebuild hex placement and rehydrate
          try {
            const wrap = root.querySelector('#hxwWrap') as HTMLElement | null
            const canvasEl = root.querySelector('#hxwCanvas') as HTMLElement | null
            const st: any = (wrap as any)?._hxw
            if (wrap && canvasEl && st) { hxwPlaceWidgets(root, pid, st); refreshDynamicWidgets(root, pid) }
          } catch {}
        }
        const colorsWrap = (w.querySelector('#fld-colors') as HTMLElement | null)
        const alphaInput = (w.querySelector('#fld-alpha') as HTMLInputElement | null)
        if (isHex) {
          if (paletteWrap) paletteWrap.classList.add('hidden')
          if (designWrap) designWrap.classList.add('hidden')
        }
        if (colorsWrap && !isHex) {
          const palette: Array<[number,number,number]> = [[59,130,246],[16,185,129],[239,68,68],[168,85,247],[251,146,60],[234,179,8],[99,102,241],[20,184,166],[14,165,233]]
          const cur = hxwCustomGet(pid, id)
          let pick = 1
          if (cur?.rgb) {
            const j = palette.findIndex(([r,g,b]) => r===cur.rgb![0] && g===cur.rgb![1] && b===cur.rgb![2])
            if (j >= 0) pick = j
          }
          colorsWrap.innerHTML = ''
          palette.forEach(([r,g,b], i) => {
            const btt = document.createElement('button')
            btt.type = 'button'
            btt.title = `rgb(${r},${g},${b})`
            btt.style.width = '18px'; btt.style.height = '18px'; btt.style.borderRadius = '9999px'
            btt.style.border = i === pick ? '2px solid #fff' : '2px solid rgba(255,255,255,.22)'
            btt.style.background = `rgb(${r},${g},${b})`
            btt.addEventListener('click', () => { pick = i; Array.from(colorsWrap.children).forEach((c,idx)=>((c as HTMLElement).style.border = idx===pick?'2px solid #fff':'2px solid rgba(255,255,255,.22)')); applyDesignUpdate({ rgb: [r,g,b] as any }) })
            colorsWrap.appendChild(btt)
          })
        }
        if (alphaInput && !isHex) {
          const cur = hxwCustomGet(pid, id)
          alphaInput.value = String(typeof cur?.alpha === 'number' ? cur!.alpha : 0.38)
          alphaInput.addEventListener('input', () => { const a = Math.max(0, Math.min(1, parseFloat(alphaInput.value)||0.38)); applyDesignUpdate({ alpha: a }) })
        }
        if (!isHex) {
          const setShapePreset = (shape: Array<[number,number]>) => applyDesignUpdate({ shape })
          ;(w.querySelector('#fld-t1') as HTMLElement | null)?.addEventListener('click', () => setShapePreset([[0,0]]))
          ;(w.querySelector('#fld-t3') as HTMLElement | null)?.addEventListener('click', () => setShapePreset([[0,0],[1,0],[0,1]]))
          ;(w.querySelector('#fld-t4') as HTMLElement | null)?.addEventListener('click', () => setShapePreset([[0,0],[1,0],[0,1],[1,1]]))
          ;(w.querySelector('#fld-t7') as HTMLElement | null)?.addEventListener('click', () => setShapePreset([[0,0],[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]]))
        }
        // Hex-packed rendering if slots exist
        const slotsWrap = w.querySelector('.hxw-cells') as HTMLElement | null
        if (slotsWrap) { (slotsWrap as HTMLElement).style.display = 'none' }
        // clear
        canvas.innerHTML = ''
        const setDefs = () => { svg.innerHTML = '<defs><marker id="arr" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#34d399"/></marker></defs>' }
        setDefs()

        // helpers
        const portSize = 8
        const createNodeEl = (n: FlowNode): HTMLElement => {
          const el = document.createElement('div')
          el.className = 'flow-node absolute select-none'
          el.style.left = `${n.x}px`; el.style.top = `${n.y}px`; el.style.width = '200px'; el.style.height = '120px'
          el.style.display = 'grid'; (el.style as any).placeItems = 'center'
          el.style.background = 'transparent'
          el.setAttribute('data-node', n.id)
          // Visual category: trigger / transform / action
          const visualKind = (n.type === 'expr' || n.type === 'condition') ? 'transform' : (n.kind === 'trigger' ? 'trigger' : 'action')
          const headCls = visualKind === 'trigger' ? 'bg-emerald-700' : (visualKind === 'transform' ? 'bg-fuchsia-700' : 'bg-sky-700')
          // Apply distinct shapes and outline colors
          const outline = visualKind === 'trigger' ? '#10b981' : (visualKind === 'transform' ? '#d946ef' : '#38bdf8')
          // Shape is drawn in a separate layer to avoid clipping ports/bar
          let shapeStyle = `position:absolute; inset:0; background: rgba(38,38,38,.8);`
          if (visualKind !== 'action') shapeStyle += ` box-shadow: 0 0 0 2px ${outline};`
          if (visualKind === 'trigger') shapeStyle += ' clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);'
          else if (visualKind === 'transform') shapeStyle += ' clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);'
          else shapeStyle += ' border-radius: 12px;'
          const title = n.label || (n.kind === 'trigger' ? (n.type === 'timer' ? 'Timer' : 'Manual Trigger') : (n.type === 'webhook' ? 'Webhook' : (n.type === 'github_issue' ? 'GitHub Issue' : 'Notify')))
          el.innerHTML = `
            <div class="fn-shape" style="${shapeStyle}"></div>
            <div class="fn-bar absolute top-1 right-1" style="z-index:8">
              ${edit ? '<button class=\"fn-del text-rose-500 hover:text-rose-400 text-lg leading-none\" title=\"削除\">×</button>' : ''}
            </div>
            <div class="fn-body text-xs text-gray-100 text-center" style="position:absolute; inset:0; display:grid; place-items:center; z-index:1;"></div>
            <div class="fn-ports" style="position:absolute; inset:0; z-index:7; pointer-events:none;">
              ${n.kind !== 'trigger' ? `<div class=\"port-in absolute left-1/2 -translate-x-1/2 rounded-full ring-2 ring-neutral-500\" style=\"top:2px;width:${portSize}px;height:${portSize}px;background:#38bdf8; pointer-events:auto;\"></div>` : ''}
              <div class="port-out absolute left-1/2 -translate-x-1/2 rounded-full ring-2 ring-neutral-500" style="bottom:2px;width:${portSize}px; height:${portSize}px; background:#34d399; pointer-events:auto;"></div>
            </div>
          `
          // body content (type + basic cfg)
          const body = el.querySelector('.fn-body') as HTMLElement | null
          if (body) {
            const typeSel = edit ? `<select class=\"fn-type rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100\">${(n.kind==='trigger'?
              ['manual','timer'] : ['notify','webhook','github_issue','expr','condition']).map(t=>`<option value=\"${t}\" ${t===n.type?'selected':''}>${t}</option>`).join('')}</select>` : `<div class=\"text-[13px] font-semibold\">${title}</div>`
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
              } else if (n.type === 'expr') {
                const expr = String(cfg.expr ?? 'x + 1')
                const out = String(cfg.out ?? 'result')
                cfgHtml = edit?`<div class=\"space-y-1\">\
                  <div><label class=\"text-gray-400\">式</label> <input class=\"fn-expr ml-1 w-full rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-0.5 text-gray-100\" placeholder=\"x > 10 && user.role=='admin'\" value=\"${expr.replace(/\"/g,'&quot;')}\"/></div>\
                  <div><label class=\"text-gray-400\">出力キー</label> <input class=\"fn-expr-out ml-1 w-48 rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-0.5 text-gray-100\" placeholder=\"result\" value=\"${out.replace(/\"/g,'&quot;')}\"/></div>\
                  <div class=\"text-[11px] text-gray-500\">ctx: user.name, count など。関数: len, lower, upper, trim, contains, now, dateAdd, formatDate。</div>\
                </div>`:`<div class=\"text-gray-400\">${expr}</div>`
              } else if (n.type === 'condition') {
                const expr = String(cfg.expr ?? 'true')
                cfgHtml = edit?`<div class=\"space-y-1\">\
                  <div><label class=\"text-gray-400\">条件式</label> <input class=\"fn-cond-expr ml-1 w-full rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-0.5 text-gray-100\" placeholder=\"x > 0\" value=\"${expr.replace(/\"/g,'&quot;')}\"/></div>\
                  <div class=\"text-[11px] text-gray-500\">true の場合のみ次のノードに進みます</div>\
                </div>`:`<div class=\"text-gray-400\">${expr}</div>`
              }
            }
            body.innerHTML = `<div class=\"grid place-items-center gap-1\">${typeSel}${n.kind==='trigger' && n.type==='manual' && edit?'<span class=\"text-gray-300\">（クリックで実行）</span>':''}</div>${cfgHtml}`
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
          const ctx: any = { repo, pid }
          const visit = async (nid: string, depth = 0, seen = new Set<string>()) => {
            if (depth > 64 || seen.has(nid)) return; seen.add(nid)
            const outs = g.edges.filter(e => e.from === nid)
            for (const e of outs) {
              const n = g.nodes.find(x => x.id === e.to); if (!n) continue
              if (n.kind === 'action') {
                try {
                  if (n.type === 'notify') {
                    const raw = String((n.cfg?.message) ?? '処理が完了しました')
                    const msg = flowTpl(raw, ctx)
                    appendLog(`通知: ${msg}`)
                  } else if (n.type === 'webhook') {
                    const url = String(n.cfg?.url || '')
                    const method = String(n.cfg?.method || 'POST').toUpperCase()
                    const payload = flowTpl(String(n.cfg?.payload || '{}'), ctx)
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
                  } else if (n.type === 'expr') {
                    const src = String(n.cfg?.expr || '')
                    const out = String(n.cfg?.out || '')
                    const { ok, value, error } = safeEvalExpr(src, ctx)
                    if (!ok) { appendLog(`式エラー: ${error || 'invalid'}`) }
                    else {
                      if (out) assignByPath(ctx, out, value)
                      appendLog(`式: ${src} => ${formatLogVal(value)}`)
                    }
                  } else if (n.type === 'condition') {
                    const src = String(n.cfg?.expr || '')
                    const { ok, value, error } = safeEvalExpr(src, ctx)
                    if (!ok) { appendLog(`条件エラー: ${error || 'invalid'}`); continue }
                    const pass = !!value
                    appendLog(`条件: ${src} => ${pass ? 'true' : 'false'}`)
                    if (!pass) continue
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
          const head = el.querySelector('.fn-bar') as HTMLElement | null
          const idN = el.getAttribute('data-node') || ''
          const startDragNode = (ev: MouseEvent) => {
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
          }
          head?.addEventListener('mousedown', (ev) => startDragNode(ev as MouseEvent))
          // Fallback: drag by clicking body/shape (not ports or bar)
          el.addEventListener('mousedown', (ev) => {
            const t = ev.target as HTMLElement
            if (t.closest('.port-in, .port-out, .fn-bar, .fn-body')) return
            startDragNode(ev as MouseEvent)
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
                if (node.kind === 'action' && node.type === 'expr') { node.cfg = { ...(node.cfg||{}), expr: String(node.cfg?.expr || 'x + 1'), out: String(node.cfg?.out || 'result') } }
                if (node.kind === 'action' && node.type === 'condition') { node.cfg = { ...(node.cfg||{}), expr: String(node.cfg?.expr || 'true') } }
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
              const expr = el.querySelector('.fn-expr') as HTMLInputElement | null
              const exprOut = el.querySelector('.fn-expr-out') as HTMLInputElement | null
              expr?.addEventListener('change', () => { const n = g.nodes.find(x => x.id === idN); if (!n) return; n.cfg = { ...(n.cfg||{}), expr: expr.value }; flowSave(pid, id, g) })
              exprOut?.addEventListener('change', () => { const n = g.nodes.find(x => x.id === idN); if (!n) return; n.cfg = { ...(n.cfg||{}), out: exprOut.value }; flowSave(pid, id, g) })
              const condExpr = el.querySelector('.fn-cond-expr') as HTMLInputElement | null
              condExpr?.addEventListener('change', () => { const n = g.nodes.find(x => x.id === idN); if (!n) return; n.cfg = { ...(n.cfg||{}), expr: condExpr.value }; flowSave(pid, id, g) })
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
          // Drag-to-connect (rubber-band) + click fallback
          let pending: string | null = null
          let tempPath: SVGPathElement | null = null
          const startDragLink = (originPort: HTMLElement, e: MouseEvent) => {
            const originEl = originPort.closest('.flow-node') as HTMLElement | null
            pending = originEl?.getAttribute('data-node') || ''
            if (!pending) return
            if (tempPath) { try { tempPath.remove() } catch {} }
            tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
            tempPath.setAttribute('stroke', '#f59e0b')
            tempPath.setAttribute('stroke-width', '2')
            tempPath.setAttribute('fill', 'none')
            svg.appendChild(tempPath)
            const base = box.getBoundingClientRect()
            const startR = originPort.getBoundingClientRect()
            const a = { x: startR.left - base.left + startR.width / 2, y: startR.top - base.top + startR.height / 2 }
            const mk = (mx: number, my: number) => {
              const dx = (mx - a.x) * 0.5
              const c1x = a.x, c1y = a.y + Math.max(10, Math.abs(dx)) * 0.15
              const c2x = mx, c2y = my - Math.max(10, Math.abs(dx)) * 0.15
              return `M ${a.x} ${a.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${mx} ${my}`
            }
            const onMove = (ev: MouseEvent) => {
              const mx = ev.clientX - base.left
              const my = ev.clientY - base.top
              tempPath!.setAttribute('d', mk(mx, my))
            }
            const onUp = (ev: MouseEvent) => {
              window.removeEventListener('mousemove', onMove)
              window.removeEventListener('mouseup', onUp)
              try {
                // Prefer direct hit on a port-in (under pointer)
                let hitPort: HTMLElement | null = null
                try { const els = document.elementsFromPoint(ev.clientX, ev.clientY) as HTMLElement[]; hitPort = (els.find(el => el.classList?.contains('port-in')) as HTMLElement) || null } catch {}
                let targetEl: HTMLElement | null = null
                if (hitPort) targetEl = hitPort
                else {
                  // Find nearest port-in within generous threshold
                  const ports = Array.from(canvas.querySelectorAll('.port-in')) as HTMLElement[]
                  const base2 = box.getBoundingClientRect()
                  let best: { el: HTMLElement; d2: number } | null = null
                  ports.forEach((pi) => {
                    const r = pi.getBoundingClientRect()
                    const cx = r.left - base2.left + r.width / 2
                    const cy = r.top - base2.top + r.height / 2
                    const dx = (ev.clientX - base2.left) - cx
                    const dy = (ev.clientY - base2.top) - cy
                    const d2 = dx*dx + dy*dy
                    if (!best || d2 < best.d2) best = { el: pi, d2 }
                  })
                  const TH = 44
                  if (best && Math.sqrt(best.d2) <= TH) targetEl = best.el
                }
                if (targetEl) {
                  const to = (targetEl.closest('.flow-node') as HTMLElement | null)?.getAttribute('data-node') || ''
                  if (to && to !== pending) {
                    const dst = g.nodes.find(x => x.id === to)
                    const src = g.nodes.find(x => x.id === pending)
                    if (dst && src && dst.kind !== 'trigger') {
                      if (!g.edges.find(e => e.from === pending && e.to === to)) g.edges.push({ from: pending, to })
                      saveAndRefresh()
                    }
                  }
                } else {
                  // kick (small shake on origin)
                  try { (originEl as HTMLElement).style.transition = 'transform .08s'; (originEl as HTMLElement).style.transform = 'translateX(-4px)'; setTimeout(()=>{ (originEl as HTMLElement).style.transform=''; }, 90) } catch {}
                }
              } finally {
                try { tempPath?.remove() } catch {}
                tempPath = null; pending = null
              }
            }
            window.addEventListener('mousemove', onMove)
            window.addEventListener('mouseup', onUp)
          }
          canvas.querySelectorAll('.flow-node .port-out').forEach((po) => {
            po.addEventListener('mousedown', (e) => { startDragLink(po as HTMLElement, e as MouseEvent) })
            po.addEventListener('click', (e) => { // fallback click-to-connect
              const n = (po.closest('.flow-node') as HTMLElement | null)?.getAttribute('data-node') || ''
              pending = n; e.stopPropagation()
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
          const addExpr = w.querySelector('.flow-add-expr') as HTMLElement | null
          const addCond = w.querySelector('.flow-add-cond') as HTMLElement | null
          const clearBtn = w.querySelector('.flow-clear') as HTMLElement | null
          addTrigger?.addEventListener('click', () => {
            g.nodes.push({ id: `n-${Date.now()}`, kind: 'trigger', type: 'manual', x: 24, y: 24, label: 'Manual Trigger' }); saveAndRefresh()
          })
          addAction?.addEventListener('click', () => {
            g.nodes.push({ id: `n-${Date.now()}`, kind: 'action', type: 'notify', x: 220, y: 140, label: 'Notify' }); saveAndRefresh()
          })
          addExpr?.addEventListener('click', () => {
            g.nodes.push({ id: `n-${Date.now()}`, kind: 'action', type: 'expr', x: 220, y: 220, label: 'Expr' }); saveAndRefresh()
          })
          addCond?.addEventListener('click', () => {
            g.nodes.push({ id: `n-${Date.now()}`, kind: 'action', type: 'condition', x: 420, y: 220, label: 'Condition' }); saveAndRefresh()
          })
          clearBtn?.addEventListener('click', () => {
            g.nodes = []; g.edges = []; saveAndRefresh()
          })
        }
        // run (view or edit both allowed)
        const logEl = w.querySelector('.flow-log') as HTMLElement | null
        const runBtn = w.querySelector('.flow-run') as HTMLElement | null
        // In hex field, keep flow simple: hide internal UI (nodes/edges view, run button, log).
        try {
          const isHex = !!w.closest('.hxw-widget')
          if (isHex) {
            const bodyWrap = w.querySelector('.flow-body') as HTMLElement | null
            if (bodyWrap) bodyWrap.style.display = 'none'
            if (runBtn) runBtn.style.display = 'none'
            if (logEl) logEl.style.display = 'none'
          }
        } catch {}
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
    if (m.type === 'clock' || m.type === 'clock-digital') {
      const box = w.querySelector('.clock-body') as HTMLElement | null
      if (box) {
        const key = `${pid}:${id}`
        const prev = clockTimers.get(key)
        if (prev) { try { clearInterval(prev) } catch {} clockTimers.delete(key) }
        try { const w = clockWatchers.get(key); if (w?.ro) w.ro.disconnect(); if (w?.raf) cancelAnimationFrame(w.raf); clockWatchers.delete(key) } catch {}
        const mode: 'digital' | 'analog' = (m.type === 'clock-digital') ? 'digital' : 'analog'
        // Special layout for "clock-digital": tri-hex faces using per-cell slots
        if (m.type === 'clock-digital') {
          const slotsWrap = w.querySelector('.hxw-cells') as HTMLElement | null
          if (slotsWrap) {
            const slots = Array.from(slotsWrap.querySelectorAll('.hxw-slot')) as HTMLElement[]
            if (slots.length >= 3) {
              // Map slots: left -> hours, right-top -> month/day, right-bottom -> minutes
              const pos = slots.map((s) => { const r = s.getBoundingClientRect(); const hostR = (w as HTMLElement).getBoundingClientRect(); return { s, x: r.left - hostR.left, y: r.top - hostR.top, w: r.width, h: r.height } })
              const left = pos.reduce((a, b) => (b.x < a.x ? b : a))
              const rights = pos.filter(p => p !== left).sort((a, b) => a.y - b.y)
              const top = rights[0], bottom = rights[1]
              // Helper to ensure a face container exists and returns its content root
              const ensureFace = (slot: HTMLElement, name: 'hh'|'md'|'mm'): HTMLElement => {
                const inner = slot.querySelector('.slot-inner') as HTMLElement
                let face = inner.querySelector('.dt-face') as HTMLElement | null
                if (!face) {
                  inner.innerHTML = '<div class="dt-face w-full h-full grid place-items-center"></div>'
                  face = inner.querySelector('.dt-face') as HTMLElement
                  // apply hex-like shape + border and base colors
                  face.style.clipPath = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
                  face.style.background = 'white'
                  face.style.color = 'black'
                  face.style.boxShadow = '0 0 0 2px #ef4444' // red border
                }
                face.setAttribute('data-kind', name)
                return face
              }
              const fcH = ensureFace(left.s, 'hh')
              const fcM = ensureFace(bottom.s, 'mm')
              const fcD = ensureFace(top.s, 'md')
              // Fit text sizes based on slot height
              const fit = () => {
                const setFs = (el: HTMLElement, ratio: number) => { const h = el.clientHeight || 1; el.style.fontSize = `${Math.max(12, Math.floor(h * ratio))}px` }
                setFs(fcH, 0.58); setFs(fcM, 0.58)
                setFs(fcD, 0.32)
              }
              fit()
              // Build static DOM for date face (two lines)
              if (!fcD.querySelector('.dt-mon')) {
                fcD.innerHTML = '<div class="text-center leading-tight"><div class="dt-mon font-semibold"></div><div class="dt-day font-semibold mt-1"></div></div>'
              }
              if (!fcH.querySelector('.dt-hh')) fcH.innerHTML = '<div class="dt-hh font-extrabold"></div>'
              if (!fcM.querySelector('.dt-mm')) fcM.innerHTML = '<div class="dt-mm font-extrabold"></div>'
              // tick updater
              const monAbbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
              const up = () => {
                const now = new Date()
                const hh = String(now.getHours()).padStart(2, '0')
                const mm = String(now.getMinutes()).padStart(2, '0')
                const mon = monAbbr[now.getMonth()]
                const day = String(now.getDate())
                const hEl = fcH.querySelector('.dt-hh') as HTMLElement | null
                const mEl = fcM.querySelector('.dt-mm') as HTMLElement | null
                const moEl = fcD.querySelector('.dt-mon') as HTMLElement | null
                const daEl = fcD.querySelector('.dt-day') as HTMLElement | null
                if (hEl) hEl.textContent = hh
                if (mEl) mEl.textContent = mm
                if (moEl) moEl.textContent = mon
                if (daEl) daEl.textContent = day
              }
              up()
              const tid = window.setInterval(up, 1000)
              clockTimers.set(key, tid as unknown as number)
              // Observe resize and refit sizes only (avoid DOM rebuild)
              try {
                const existed = clockWatchers.get(key)?.ro
                if (existed) existed.disconnect()
                const ro = new ResizeObserver(() => { try { fit() } catch {} })
                ro.observe(w)
                clockWatchers.set(key, { ro })
              } catch {}
              return // handled; skip legacy clock render below
            }
          }
        }
        let doFit: (() => void) | null = null
        const render = () => {
          const rect = box.getBoundingClientRect()
          const size = Math.max(64, Math.min(rect.width, rect.height))
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
            try {
              const prevW2 = clockWatchers.get(key) || {}
              clockWatchers.set(key, { ...prevW2, resize: () => { try { doFit && doFit() } catch {} } })
            } catch {}
          } else {
            const svgSize = Math.floor(size * 0.96)
            const ticks = [0, 60, 120, 180, 240, 300]
              .map((a) => {
                const r1 = 42, r2 = 47
                const rad = a * Math.PI / 180
                const x1 = 50 + Math.sin(rad) * r1; const y1 = 50 - Math.cos(rad) * r1
                const x2 = 50 + Math.sin(rad) * r2; const y2 = 50 - Math.cos(rad) * r2
                return `<line x1=\"${x1.toFixed(1)}\" y1=\"${y1.toFixed(1)}\" x2=\"${x2.toFixed(1)}\" y2=\"${y2.toFixed(1)}\" stroke=\"var(--clk-border)\" stroke-width=\"2\" stroke-linecap=\"round\" vector-effect=\"non-scaling-stroke\"/>`
              }).join('')
            // Hexスタイルのシンプルなダイヤル（外周はハニカムの背景で表現）
            box.innerHTML = `
              <div class=\"clk-analog\" style=\"--clk-border: var(--gh-border); --clk-major: var(--gh-contrast); --clk-minor: var(--gh-muted); --clk-sec: var(--gh-accent); color: var(--gh-contrast);\">
                <svg viewBox=\"0 0 100 100\" width=\"${svgSize}\" height=\"${svgSize}\" preserveAspectRatio=\"xMidYMid meet\" shape-rendering=\"geometricPrecision\">
                  ${ticks}
                  <line id=\"clk-h\" x1=\"50\" y1=\"50\" x2=\"50\" y2=\"34\" stroke=\"var(--clk-major)\" stroke-width=\"3.8\" stroke-linecap=\"round\" vector-effect=\"non-scaling-stroke\" />
                  <line id=\"clk-m\" x1=\"50\" y1=\"50\" x2=\"50\" y2=\"24\" stroke=\"var(--clk-minor)\" stroke-width=\"2.8\" stroke-linecap=\"round\" vector-effect=\"non-scaling-stroke\" />
                  <line id=\"clk-s\" x1=\"50\" y1=\"50\" x2=\"50\" y2=\"18\" stroke=\"var(--clk-sec)\" stroke-width=\"1.6\" stroke-linecap=\"round\" vector-effect=\"non-scaling-stroke\" />
                  <circle cx=\"50\" cy=\"50\" r=\"2.8\" fill=\"var(--clk-major)\" />
                </svg>
              </div>`
            try {
              const resizeAnalog = () => {
                const rect2 = box.getBoundingClientRect(); const sz = Math.max(64, Math.min(rect2.width, rect2.height))
                const svg = box.querySelector('svg') as SVGElement | null
                if (svg) { const s = Math.floor(sz * 0.96); svg.setAttribute('width', String(s)); svg.setAttribute('height', String(s)) }
              }
              resizeAnalog()
              const prevW2 = clockWatchers.get(key) || {}
              clockWatchers.set(key, { ...prevW2, resize: () => { try { resizeAnalog() } catch {} } })
            } catch {}
          }
        }
        // Defer first render to next frame to avoid 0-size reads during layout
        try { const prevRaf = clockWatchers.get(key)?.raf; if (prevRaf) cancelAnimationFrame(prevRaf) } catch {}
        const rafId = requestAnimationFrame(() => { render() })
        const prevW = clockWatchers.get(key) || {}
        clockWatchers.set(key, { ...prevW, raf: rafId })
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
            // Avoid re-fitting each tick to prevent flicker; ResizeObserver handles real size changes
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
        // Observe resize to keep analog dial stable when the widget scales (2D/3D or layout)
        try {
          const existed = clockWatchers.get(key)?.ro
          if (existed) existed.disconnect()
          const ro = new ResizeObserver(() => { try { const fn = clockWatchers.get(key)?.resize; fn && fn() } catch {} })
          ro.observe(box)
          const prev = clockWatchers.get(key) || {}
          clockWatchers.set(key, { ...prev, ro })
        } catch {}
        // no mode toggle in split widgets
      }
    }
    if (m.type === 'tasksum') {
      const box = w.querySelector('.tasksum-body') as HTMLElement | null
      if (box) {
        const slotsWrap = w.querySelector('.hxw-cells') as HTMLElement | null
        const render = (counts: Record<string, number>) => {
          if (slotsWrap) {
            const slots = Array.from(slotsWrap.querySelectorAll('.hxw-slot .slot-inner')) as HTMLElement[]
            const order: Array<[string,string]> = [['todo','TODO'],['doing','DOING'],['review','REVIEW'],['done','DONE']]
            slots.forEach(s => s.innerHTML = '')
            // 4つまで表示（余りスロットは空のまま）
            order.forEach(([key,label], idx) => {
              if (!slots[idx]) return
              const n = counts[key] || 0
              slots[idx].innerHTML = `<div class=\"grid place-items-center\">\n                <div class=\"text-[16px] md:text-[18px] font-semibold text-gray-100\">${label}</div>\n                <div class=\"text-[28px] md:text-[32px] font-bold text-emerald-400\">${n}</div>\n              </div>`
            })
            ;(box as HTMLElement).style.display = 'none'
            return
          }
          // スロットが無い場合のフォールバック（矩形レイアウト）
          box.innerHTML = `
            <div class="ts-grid h-full grid grid-cols-2 md:grid-cols-4 items-center text-sm text-gray-200">
              ${[['todo', 'TODO'], ['doing', 'DOING'], ['review', 'REVIEW'], ['done', 'DONE']]
                .map(([k, label]) => `
                  <div class=\"stat flex items-center justify-center gap-2\">\
                    <div class=\"ts-label text-gray-300\">${label}</div>\
                    <div class=\"ts-count text-emerald-300 font-semibold\">${counts[k] || 0}</div>\
                  </div>`
                ).join('')}
            </div>`
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
        const hxEl = w.closest('#hxwCanvas') as HTMLElement | null
        const edit = ((gridEl && gridEl.getAttribute('data-edit') === '1') || (hxEl && hxEl.getAttribute('data-edit') === '1'))
        const hasLink = !!(links && links[0] && links[0].url)
        const slotsWrap = w.querySelector('.hxw-cells') as HTMLElement | null
        if (slotsWrap) {
          // ハニカム: 非編集でも未設定なら＋ボタン操作のためにポインターを有効化
          ;(slotsWrap as HTMLElement).style.pointerEvents = (edit || !hasLink) ? 'auto' : 'none'
          // ハニカム内は円形に近い合成表現でプレビュー
          const content = w.querySelector('.wg-content') as HTMLElement | null
          let circle = w.querySelector('.lnk-hex-circle') as HTMLElement | null
          if (!circle && content) {
            circle = document.createElement('div')
            circle.className = 'lnk-hex-circle absolute inset-0 overflow-hidden'
            circle.style.left = '0'; circle.style.top = '0'; (circle.style as any).right = '0'; (circle.style as any).bottom = '0'
            circle.style.pointerEvents = 'auto'
            content.appendChild(circle)
          }
          if (circle) {
            if (edit && !(links && links[0] && links[0].url)) {
              circle.style.display = 'none'
            } else {
              circle.style.display = ''
              const l = links && links[0]
              if (l && l.url) {
                try { (window as any).requestIdleCallback ? (window as any).requestIdleCallback(() => hydrateLinkCircle(circle!, l.url)) : hydrateLinkCircle(circle!, l.url) } catch { circle.innerHTML = renderLinkPreview(l.url, true) }
              } else {
                circle.innerHTML = ``
                // 非編集モードでも未設定ならクリックで設定ポップを開く
                try {
                  if (!edit && !(circle as any)._bindAdd) {
                    (circle as any)._bindAdd = true
                    circle.style.cursor = 'pointer'
                    circle.addEventListener('click', (ev) => { ev.stopPropagation(); openLinkHexPopup(root, pid, id) })
                  }
                } catch {}
              }
            }
          }
          // スロットのひとつに＋ボタンを配置し、ポップ入力で編集できるようにする
          const slots = Array.from(slotsWrap.querySelectorAll('.hxw-slot .slot-inner')) as HTMLElement[]
          const addIdx = Math.min(1, Math.max(0, Math.floor(slots.length / 2)))
          const addSlot = slots[addIdx]
          if (addSlot && !hasLink && !addSlot.querySelector('.lnk-hex-add')) {
            const btn = document.createElement('button')
            btn.className = 'lnk-hex-add text-2xl md:text-3xl text-gray-100'
            btn.textContent = '＋'
            btn.addEventListener('click', (ev) => { ev.stopPropagation(); openLinkHexPopup(root, pid, id) })
            addSlot.appendChild(btn)
          }
          // リンク設定済みなら＋を消す
          if (addSlot && hasLink) {
            const ex = addSlot.querySelector('.lnk-hex-add') as HTMLElement | null
            if (ex) ex.remove()
          }
          // ハニカム時は従来ボックスは非表示
          if (box) (box as HTMLElement).style.display = 'none'
          // 編集時のフォームは通常表示
          const form = w.querySelector('.lnk-form') as HTMLElement | null
          const addBtn = w.querySelector('.lnk-add') as HTMLElement | null
          if (form) form.classList.add('hidden')
          // ハニカムでは常にテキストの「リンク追加」ボタンは非表示（＋ボタンで統一）
          if (addBtn) addBtn.classList.add('hidden')
          return
        }

        const form = w.querySelector('.lnk-form') as HTMLElement | null
        const contentWrap = w.querySelector('.wg-content') as HTMLElement | null
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
            // Center the form within the hex
            ;(form as HTMLElement).style.maxWidth = 'min(520px, 92%)'
            ;(form as HTMLElement).style.width = '100%'
            ;(form as HTMLElement).style.margin = '0 auto'
          }
          if (contentWrap) { contentWrap.setAttribute('data-center', '1'); contentWrap.style.display = 'grid'; (contentWrap as HTMLElement).style.alignItems = 'center'; (contentWrap as HTMLElement).style.justifyItems = 'center' }
        } else {
          // View mode: render unfurl card, hide form
          box.classList.remove('hidden')
          box.innerHTML = renderLinkCardsUnfurl(links, false)
          try { hydrateLinkCards(w) } catch { }
          if (form) form.classList.add('hidden')
          if (addBtn) addBtn.classList.add('hidden') // view mode never shows add
          if (contentWrap) { contentWrap.removeAttribute('data-center'); contentWrap.style.display = ''; (contentWrap as HTMLElement).style.alignItems = ''; (contentWrap as HTMLElement).style.justifyItems = '' }
        }
      }
    }
    if (m.type === 'calendar') {
      const box = w.querySelector('.cal-body') as HTMLElement | null
      if (box) {
        const url = calGet(pid, id)
        const gridEl = w.closest('#widgetGrid') as HTMLElement | null
        const hxEl = w.closest('#hxwCanvas') as HTMLElement | null
        const edit = ((gridEl && gridEl.getAttribute('data-edit') === '1') || (hxEl && hxEl.getAttribute('data-edit') === '1'))
        const slotsWrap = w.querySelector('.hxw-cells') as HTMLElement | null
        if (slotsWrap) {
          // ハニカム: 非編集時はスロット層のポインターを無効化（プレビューやリンクの操作を阻害しない）
          ;(slotsWrap as HTMLElement).style.pointerEvents = edit ? 'auto' : 'none'
          // ハニカム：常にプレビュー + ＋ボタン（ポップで編集）。フォームは常に非表示
          if (box) { box.classList.remove('hidden'); box.innerHTML = url ? renderCalendarFrame(url) : `<div class=\"h-full grid place-items-center text-gray-400\">カレンダーが設定されていません</div>` }
          const slots = Array.from(slotsWrap.querySelectorAll('.hxw-slot .slot-inner')) as HTMLElement[]
          const idx = Math.min(1, Math.max(0, Math.floor(slots.length / 2)))
          const target = slots[idx]
          if (target && edit && !url && !target.querySelector('.cal-hex-add')) {
            const b = document.createElement('button')
            b.className = 'cal-hex-add text-2xl md:text-3xl text-gray-100'
            b.textContent = '＋'
            b.addEventListener('click', (ev) => { ev.stopPropagation(); openCalHexPopup(root, pid, id) })
            target.appendChild(b)
          }
          // 編集モードでない、またはURL設定済みなら＋を消す
          if (target && (!edit || url)) {
            const ex = target.querySelector('.cal-hex-add') as HTMLElement | null
            if (ex) ex.remove()
          }
          const form = w.querySelector('.cal-form') as HTMLElement | null
          const addBtn = w.querySelector('.cal-add') as HTMLElement | null
          if (form) form.classList.add('hidden')
          if (addBtn) addBtn.classList.add('hidden')
          const contentWrap = w.querySelector('.wg-content') as HTMLElement | null
          if (contentWrap) { contentWrap.removeAttribute('data-center'); contentWrap.style.display = ''; (contentWrap as HTMLElement).style.alignItems = ''; (contentWrap as HTMLElement).style.justifyItems = '' }
          return
        }
        // ハニカムでない場合の従来動作
        const form = w.querySelector('.cal-form') as HTMLElement | null
        const contentWrap = w.querySelector('.wg-content') as HTMLElement | null
        const addBtn = w.querySelector('.cal-add') as HTMLElement | null
        if (edit) {
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
          if (box) { box.classList.remove('hidden'); box.innerHTML = url ? renderCalendarFrame(url) : `<div class=\"h-full grid place-items-center text-gray-400\">カレンダーが設定されていません</div>` }
          if (form) form.classList.add('hidden')
          if (addBtn) addBtn.classList.add('hidden')
          if (contentWrap) { contentWrap.removeAttribute('data-center'); contentWrap.style.display = ''; (contentWrap as HTMLElement).style.alignItems = ''; (contentWrap as HTMLElement).style.justifyItems = '' }
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

// ---- Hex pop editors for Links/Calendar ----
function openLinkHexPopup(root: HTMLElement, pid: string, id: string): void {
  const overlay = document.createElement('div')
  overlay.className = 'fixed inset-0 z-[90] bg-black/50 grid place-items-center'
  const cur = mdGetLinks(pid, id)[0] || { title: '', url: '' }
  overlay.innerHTML = `
    <div class="w-[min(520px,92vw)] rounded-lg bg-neutral-900 ring-2 ring-neutral-600 p-3 text-gray-100">
      <div class="text-sm mb-2">リンクを設定</div>
      <div class="grid grid-cols-1 gap-2">
        <input id="hxlnk-title" class="rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100" placeholder="タイトル(任意)" value="${escHtml(cur.title || '')}" />
        <input id="hxlnk-url" class="rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100" placeholder="URL (https://...)" value="${escHtml(cur.url || '')}" />
        <div class="flex justify-end gap-2">
          <button id="hxlnk-save" class="rounded bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1">保存</button>
          <button id="hxlnk-cancel" class="rounded ring-2 ring-neutral-600 px-3 py-1 hover:bg-neutral-800">キャンセル</button>
        </div>
        <p id="hxlnk-err" class="text-xs text-red-400 hidden"></p>
      </div>
    </div>`
  document.body.appendChild(overlay)
  const urlEl = overlay.querySelector('#hxlnk-url') as HTMLInputElement
  const titleEl = overlay.querySelector('#hxlnk-title') as HTMLInputElement
  const errEl = overlay.querySelector('#hxlnk-err') as HTMLElement
  const close = () => overlay.remove()
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#hxlnk-cancel')?.addEventListener('click', close)
  overlay.querySelector('#hxlnk-save')?.addEventListener('click', () => {
    let url = (urlEl.value || '').trim(); const title = (titleEl.value || '').trim()
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`
    try { if (url) new URL(url) } catch { errEl.textContent = 'URLが正しくありません'; errEl.classList.remove('hidden'); return }
    mdSetLinks(pid, id, url ? [{ title, url }] : [])
    try { refreshDynamicWidgets(root, pid) } catch { }
    close()
  })
  setTimeout(() => urlEl.focus(), 0)
}

function openCalHexPopup(root: HTMLElement, pid: string, id: string): void {
  const overlay = document.createElement('div')
  overlay.className = 'fixed inset-0 z-[90] bg-black/50 grid place-items-center'
  const cur = calGet(pid, id)
  overlay.innerHTML = `
    <div class="w-[min(560px,92vw)] rounded-lg bg-neutral-900 ring-2 ring-neutral-600 p-3 text-gray-100">
      <div class="text-sm mb-2">カレンダーURLを設定</div>
      <div class="grid grid-cols-1 gap-2">
        <input id="hxcal-url" class="rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100" placeholder="埋め込みURL (https://calendar.google.com/calendar/embed?...)" value="${escHtml(cur || '')}" />
        <div class="flex justify-end gap-2">
          <button id="hxcal-save" class="rounded bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1">保存</button>
          <button id="hxcal-cancel" class="rounded ring-2 ring-neutral-600 px-3 py-1 hover:bg-neutral-800">キャンセル</button>
        </div>
        <p id="hxcal-err" class="text-xs text-red-400 hidden"></p>
      </div>
    </div>`
  document.body.appendChild(overlay)
  const urlEl = overlay.querySelector('#hxcal-url') as HTMLInputElement
  const errEl = overlay.querySelector('#hxcal-err') as HTMLElement
  const close = () => overlay.remove()
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#hxcal-cancel')?.addEventListener('click', close)
  overlay.querySelector('#hxcal-save')?.addEventListener('click', () => {
    let url = (urlEl.value || '').trim(); if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`
    try { if (url) new URL(url) } catch { errEl.textContent = 'URLが正しくありません'; errEl.classList.remove('hidden'); return }
    calSet(pid, id, url)
    try { refreshDynamicWidgets(root, pid) } catch { }
    close()
  })
  setTimeout(() => urlEl.focus(), 0)
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
  return `<div class=\"h-full min-h-[220px] overflow-hidden\"><iframe class=\"w-full h-full\" style=\"${iframeStyle}\" src=\"${escHtml(safe)}\" sandbox=\"allow-scripts allow-same-origin allow-forms allow-popups\" referrerpolicy=\"no-referrer\"></iframe></div>`
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
const clockWatchers = new Map<string, { ro?: ResizeObserver; raf?: number; resize?: () => void }>()

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
function flowModeKey(pid: string, id: string): string { return `pj-flow-mode-${pid}-${id}` }
function flowModeGet(pid: string, id: string): 'logic'|'design' { try { const v = localStorage.getItem(flowModeKey(pid, id)) || 'logic'; return (v === 'design' ? 'design' : 'logic') } catch { return 'logic' } }
function flowModeSet(pid: string, id: string, v: 'logic'|'design'): void { try { localStorage.setItem(flowModeKey(pid, id), v) } catch {} }

// ---- Expression DSL (safe, tiny) ----
type DslToken = { t: 'num'|'str'|'ident'|'op'|'lpar'|'rpar'|'comma'|'bool'|'null'|'eof'; v?: any }
function dslTokens(src: string): DslToken[] {
  const s = src || ''
  const out: DslToken[] = []
  let i = 0
  const isWS = (c: string) => /\s/.test(c)
  const isIdStart = (c: string) => /[A-Za-z_]/.test(c)
  const isId = (c: string) => /[A-Za-z0-9_\.]/.test(c)
  while (i < s.length) {
    const c = s[i]
    if (isWS(c)) { i++; continue }
    if (c === '(') { out.push({ t:'lpar' }); i++; continue }
    if (c === ')') { out.push({ t:'rpar' }); i++; continue }
    if (c === ',') { out.push({ t:'comma' }); i++; continue }
    // operators (longest first)
    const two = s.slice(i, i+2)
    if (['>=','<=','==','!=','&&','||'].includes(two)) { out.push({ t:'op', v: two }); i += 2; continue }
    if ('+-*/%!><!'.includes(c)) { out.push({ t:'op', v: c }); i++; continue }
    if (c === '"' || c === '\'') {
      const q = c; i++
      let str = ''
      while (i < s.length) {
        const ch = s[i++]
        if (ch === q) break
        if (ch === '\\') { const nx = s[i++] || ''; const map: any = { 'n':'\n', 't':'\t', '\\':'\\', '\'':'\'', '"':'"' }; str += (map[nx] ?? nx) }
        else str += ch
      }
      out.push({ t: 'str', v: str })
      continue
    }
    if (/[0-9]/.test(c)) {
      let j = i+1; while (j < s.length && /[0-9_\.]/.test(s[j])) j++
      const raw = s.slice(i, j).replace(/_/g,'')
      out.push({ t:'num', v: Number(raw) })
      i = j; continue
    }
    if (isIdStart(c)) {
      let j = i+1; while (j < s.length && isId(s[j])) j++
      const id = s.slice(i, j)
      if (id === 'true' || id === 'false') out.push({ t:'bool', v: id === 'true' })
      else if (id === 'null') out.push({ t:'null' })
      else out.push({ t:'ident', v: id })
      i = j; continue
    }
    // unknown char
    out.push({ t:'op', v: c }); i++
  }
  out.push({ t:'eof' })
  return out
}
type DNode = any
function dslParse(src: string): DNode {
  const tk = dslTokens(src)
  let p = 0
  const peek = () => tk[p]
  const eat = () => tk[p++]
  const expect = (t: DslToken['t']) => { const x = eat(); if (x.t !== t) throw new Error(`expected ${t}`); return x }
  const parsePrimary = (): DNode => {
    const t = peek()
    if (t.t === 'num' || t.t === 'str' || t.t === 'bool' || t.t === 'null') { eat(); return { k:'lit', v: t.t === 'null' ? null : t.v } }
    if (t.t === 'ident') {
      const name = String(eat().v)
      if (peek().t === 'lpar') {
        eat() // (
        const args: DNode[] = []
        if (peek().t !== 'rpar') {
          while (true) { args.push(parseExpr()); if (peek().t === 'comma') { eat(); continue } break }
        }
        expect('rpar')
        return { k:'call', f: name, a: args }
      }
      return { k:'var', p: name }
    }
    if (t.t === 'lpar') { eat(); const e = parseExpr(); expect('rpar'); return e }
    if (t.t === 'op' && (t.v === '-' || t.v === '!')) { const op = String(eat().v); const e = parsePrimary(); return { k:'un', o: op, e } }
    throw new Error('syntax')
  }
  const prec = (op: string): number => ({ '||':1, '&&':2, '==':3, '!=':3, '>':4, '<':4, '>=':4, '<=':4, '+':5, '-':5, '*':6, '/':6, '%':6 }[op] ?? 0)
  const parseBin = (lhs: DNode, minPrec: number): DNode => {
    while (peek().t === 'op' && prec(String(peek().v)) >= minPrec) {
      const op = String(eat().v)
      let rhs = parsePrimary()
      while (peek().t === 'op' && prec(String(peek().v)) > prec(op)) {
        rhs = parseBin(rhs, prec(String(peek().v)))
      }
      lhs = { k:'bin', o: op, l: lhs, r: rhs }
    }
    return lhs
  }
  const parseExpr = (): DNode => parseBin(parsePrimary(), 1)
  const ast = parseExpr()
  if (peek().t !== 'eof') throw new Error('trailing')
  return ast
}
function getByPath(obj: any, path: string): any {
  const parts = (path || '').split('.')
  let cur = obj
  for (const k of parts) { if (cur == null) return undefined; cur = cur[k] }
  return cur
}
function assignByPath(obj: any, path: string, value: any): void {
  const parts = (path || '').split('.').filter(Boolean)
  if (!parts.length) return
  let cur = obj
  for (let i=0;i<parts.length-1;i++) { const k = parts[i]; if (typeof cur[k] !== 'object' || cur[k] == null) cur[k] = {}; cur = cur[k] }
  cur[parts[parts.length-1]] = value
}
function dslEval(ast: DNode, ctx: any): any {
  const fns: Record<string, (...a:any[])=>any> = {
    len: (x:any) => (x==null?0:(Array.isArray(x)||typeof x==='string'?x.length:Object.keys(x).length)),
    lower: (s:any) => String(s||'').toLowerCase(),
    upper: (s:any) => String(s||'').toUpperCase(),
    trim: (s:any) => String(s||'').trim(),
    contains: (h:any, n:any) => (String(h||'')).includes(String(n||'')),
    startsWith: (s:any, p:any) => String(s||'').startsWith(String(p||'')),
    endsWith: (s:any, p:any) => String(s||'').endsWith(String(p||'')),
    now: () => Date.now(),
    dateAdd: (t:any, unit:any, amt:any) => { const base = (t==null?Date.now(): (isNaN(Number(t))? Date.parse(String(t)) : Number(t))); const a = Number(amt||0); const d = new Date(base); const u = String(unit||'days'); if (u.startsWith('day')) d.setDate(d.getDate()+a); else if (u.startsWith('hour')) d.setHours(d.getHours()+a); else if (u.startsWith('min')) d.setMinutes(d.getMinutes()+a); else d.setSeconds(d.getSeconds()+a); return d.getTime() },
    formatDate: (t:any, fmt:any) => { const d = new Date(isNaN(Number(t))? Date.parse(String(t)) : Number(t)); const z = (n:number,len=2)=>String(n).padStart(len,'0'); const map: Record<string,string> = { 'YYYY': String(d.getFullYear()), 'MM': z(d.getMonth()+1), 'DD': z(d.getDate()), 'HH': z(d.getHours()), 'mm': z(d.getMinutes()), 'ss': z(d.getSeconds()) }; return String(fmt||'YYYY-MM-DD').replace(/YYYY|MM|DD|HH|mm|ss/g, m=>map[m]) },
    toNumber: (x:any) => Number(x), toString: (x:any) => String(x), toBool: (x:any) => !!x,
    // Extra: arrays/math/json/condition/helpers
    sum: (...args:any[]) => { const a = (args.length===1 && Array.isArray(args[0]))? args[0] : args; return a.map(Number).reduce((s:number,v:number)=>s+(isNaN(v)?0:v),0) },
    avg: (arr:any) => { const a = Array.isArray(arr)? arr.map(Number) : []; const n=a.filter(v=>!isNaN(v)).length; return n? a.filter(v=>!isNaN(v)).reduce((s,v)=>s+v,0)/n : 0 },
    minVal: (arr:any) => { const a=Array.isArray(arr)?arr.map(Number).filter(v=>!isNaN(v)):[]; return a.length? Math.min(...a) : 0 },
    maxVal: (arr:any) => { const a=Array.isArray(arr)?arr.map(Number).filter(v=>!isNaN(v)):[]; return a.length? Math.max(...a) : 0 },
    join: (arr:any, sep:any=',') => Array.isArray(arr)? arr.join(String(sep)) : '',
    split: (s:any, sep:any=',') => String(s||'').split(String(sep)),
    nth: (arr:any, i:any) => { const a=Array.isArray(arr)?arr:[]; const n=Number(i)||0; return (n>=0&&n<a.length)?a[n]:undefined },
    jsonParse: (s:any) => { try { return JSON.parse(String(s||'')) } catch { return null } },
    jsonStringify: (x:any) => { try { return JSON.stringify(x) } catch { return '' } },
    coalesce: (a:any,b:any) => (a!=null && a!=='')? a : b,
    iif: (cond:any, a:any, b:any) => (!!cond? a : b),
    get: (path:any) => getByPath((globalThis as any).__flowCtx || {}, String(path||'')),
  }
  const ev = (node: DNode): any => {
    switch (node?.k) {
      case 'lit': return node.v
      case 'var': return getByPath(ctx, node.p)
      case 'call': {
        const fn = fns[node.f]; if (!fn) throw new Error(`fn:${node.f}`)
        try { (globalThis as any).__flowCtx = ctx } catch {}
        return fn(...node.a.map(ev))
      }
      case 'un': { const v = ev(node.e); if (node.o === '-') return -Number(v); if (node.o === '!') return !v; throw new Error('op') }
      case 'bin': {
        const l = ev(node.l), r = ev(node.r)
        switch (node.o) {
          case '+': return Number(l) + Number(r)
          case '-': return Number(l) - Number(r)
          case '*': return Number(l) * Number(r)
          case '/': return Number(l) / Number(r)
          case '%': return Number(l) % Number(r)
          case '>': return l > r
          case '<': return l < r
          case '>=': return l >= r
          case '<=': return l <= r
          case '==': return l == r
          case '!=': return l != r
          case '&&': return l && r
          case '||': return l || r
        }
        throw new Error('op')
      }
      default: throw new Error('ast')
    }
  }
  return ev(ast)
}
function safeEvalExpr(src: string, ctx: any): { ok: boolean; value?: any; error?: string } {
  try { const ast = dslParse(src); const v = dslEval(ast, ctx); return { ok: true, value: v } } catch (e: any) { return { ok: false, error: String(e?.message||e) } }
}
function flowTpl(s: string, ctx: any): string {
  // Expand ${...} with DSL
  return String(s||'').replace(/\$\{([^}]+)\}/g, (_m, ex) => {
    const { ok, value } = safeEvalExpr(String(ex), ctx)
    return ok ? String(value) : ''
  })
}
function formatLogVal(v: any): string { try { if (typeof v === 'object') return JSON.stringify(v); return String(v) } catch { return String(v) } }

function widgetTitle(type: string): string {
  switch (type) {
    case 'custom': return 'カスタム'
    case 'flow': return 'フロー'
    case 'readme': return 'README'
    case 'overview': return 'Overview'
    case 'contrib': return 'Contributions'
    case 'markdown': return 'Markdown'
    case 'tasksum': return 'タスクサマリー'
    case 'committers': return 'Top Committers'
    case 'links': return 'クイックリンク'
    case 'calendar': return 'カレンダー'
    case 'clock': return '時計'
    case 'clock-digital': return 'デジタル時計'
    case 'spacer': return 'スペーサー'
    case 'tabnew': return '新規タブ'
    case 'tabbar': return 'タブ切替'
    case 'invite': return 'メンバー追加'
    case 'account': return 'ユーザー設定'
    case 'skin': return '着せ替え'
    default: return 'Widget'
  }
}

function buildWidgetBody(type: string): string {
  switch (type) {
    case 'custom':
      return `<div class=\"h-full text-sm text-gray-200\"><div class=\"text-xs text-gray-400 mb-1\">Custom</div><div class=\"text-gray-200\">ここにコンテンツを追加できます</div></div>`
    case 'readme': return readmeSkeleton()
    case 'overview': return overviewSkeleton()
    case 'contrib': return contributionWidget()
    case 'markdown': return markdownWidget()
    case 'tasksum': return `<div class=\"tasksum-body h-full text-sm text-gray-200\"></div>`
    case 'milestones': return `<ul class=\"text-sm text-gray-200 space-y-2\"><li>企画 <span class=\"text-gray-400\">(完了)</span></li><li>実装 <span class=\"text-gray-400\">(進行中)</span></li><li>リリース <span class=\"text-gray-400\">(未着手)</span></li></ul>`
    case 'spacer': return `<div class=\"h-full\"></div>`
    case 'tabnew': return `<div class=\"tn-body h-full\"></div>`
    case 'skin': return `<div class=\"skin-body h-full\"></div>`
    case 'tabbar': return `<div class=\"h-full\"></div>`
    case 'invite': return `<div class=\"iv-body h-full\"></div>`
    case 'account': return `<div class=\"acc-body h-full\"></div>`
    case 'links': return `
      <div class=\"links-body h-full flex flex-col gap-3 text-sm text-gray-200\"></div>
      <div class=\"mt-2 text-xs edit-only\">
        <button class=\"lnk-add rounded ring-2 ring-neutral-600 px-2 py-0.5 hover:bg-neutral-800\">リンク追加</button>
      </div>
      <div class=\"lnk-form mt-2 p-2 rounded ring-2 ring-neutral-600 hidden edit-only\">
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
    case 'calendar': return `
      <div class=\"cal-body h-full overflow-hidden\"></div>
      <div class=\"mt-2 text-xs edit-only\">
        <button class=\"cal-add rounded ring-2 ring-neutral-600 px-2 py-0.5 hover:bg-neutral-800\">カレンダーを設定</button>
      </div>
      <div class=\"cal-form mt-2 p-2 rounded ring-2 ring-neutral-600 hidden edit-only\">
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
    case 'clock-digital': return `<div class=\"clock-wrap relative h-full\"><div class=\"clock-body absolute inset-0 grid place-items-center text-gray-100\"></div></div>`
    case 'flow': return flowWidget()
    case 'committers': return barSkeleton()
    default: return `<div class=\"h-40 grid place-items-center text-gray-400\">Mock</div>`
  }
}

function flowWidget(): string {
  return `
    <div class="flow-wrap relative h-full">
      <div class="flow-body absolute inset-0">
        <div class="flow-canvas absolute inset-0"></div>
        <svg class="flow-svg absolute inset-0 w-full h-full pointer-events-none"></svg>
      </div>
      <div class="absolute top-1 left-1 right-1 flex items-center gap-2">
        <div class="flow-mode edit-only bg-neutral-900/70 ring-1 ring-neutral-600 rounded px-1 py-1 inline-flex">
          <button data-mode="logic" class="px-2 py-0.5 text-xs rounded bg-neutral-800/80 text-gray-100">機能</button>
          <button data-mode="design" class="ml-1 px-2 py-0.5 text-xs rounded text-gray-300 hover:text-gray-100">見た目</button>
        </div>
        <div class="flow-palette ml-2 edit-only bg-neutral-900/70 ring-1 ring-neutral-600 rounded px-2 py-1 inline-flex items-center gap-2">
          <button class="flow-add-tr text-xs rounded bg-emerald-700 hover:bg-emerald-600 text-white px-2 py-0.5">トリガー</button>
          <button class="flow-add-ac text-xs rounded bg-sky-700 hover:bg-sky-600 text-white px-2 py-0.5">アクション</button>
          <button class="flow-add-expr text-xs rounded bg-fuchsia-700 hover:bg-fuchsia-600 text-white px-2 py-0.5">式</button>
          <button class="flow-add-cond text-xs rounded bg-amber-700 hover:bg-amber-600 text-white px-2 py-0.5">条件</button>
          <button class="flow-clear text-xs rounded ring-1 ring-neutral-600 px-2 py-0.5 hover:bg-neutral-800">クリア</button>
        </div>
        <div class="flow-design ml-2 hidden edit-only bg-neutral-900/70 ring-1 ring-neutral-600 rounded px-2 py-1 inline-flex items-center gap-2">
          <div class="text-xs text-gray-300">色</div>
          <div id="fld-colors" class="inline-flex items-center gap-1.5"></div>
          <label class="ml-2 text-xs text-gray-300">濃さ <input id="fld-alpha" type="range" min="0.20" max="0.70" step="0.02" value="0.38" class="align-middle ml-1"></label>
          <div class="ml-2 text-xs text-gray-300">形</div>
          <button id="fld-t1" class="text-xs rounded ring-1 ring-neutral-600 px-2 py-0.5 hover:bg-neutral-800">1</button>
          <button id="fld-t3" class="text-xs rounded ring-1 ring-neutral-600 px-2 py-0.5 hover:bg-neutral-800">3</button>
          <button id="fld-t4" class="text-xs rounded ring-1 ring-neutral-600 px-2 py-0.5 hover:bg-neutral-800">4</button>
          <button id="fld-t7" class="text-xs rounded ring-1 ring-neutral-600 px-2 py-0.5 hover:bg-neutral-800">7</button>
        </div>
      </div>
      <div class="absolute bottom-1 left-1 right-1 flex items-center gap-2">
        <button class="flow-run rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5">実行</button>
        <div class="flow-log flex-1 h-16 overflow-auto rounded bg-neutral-900/60 ring-1 ring-neutral-600 text-[11px] text-gray-300 px-2 py-1"></div>
      </div>
    </div>
  `
}

// ------- Markdown widget -------
function markdownWidget(): string {
  // Minimal body; whole widget acts as a button in view mode
  return `<div class=\"h-full\"></div>`
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

// Richer Markdown renderer approximating GFM + Qiita extensions used in the cheat sheet
function mdRenderQiita(src: string): string {
  const escapeHtml = (t: string) => (t || '').replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c] as string))
  const escapeNoQuotes = (t: string) => (t || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
  const lines = (src || '').replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  let inFence = false, fence = '', fenceInfo = ''
  let list: null | 'ul' | 'ol' | 'task' = null
  let inQuote = false
  let inTable = false, align: string[] = []
  let inNote = false

  const flushList = () => { if (list) { out.push(list === 'ol' ? '</ol>' : '</ul>'); list = null } }
  const flushQuote = () => { if (inQuote) { out.push('</blockquote>'); inQuote = false } }
  const flushTable = () => { if (inTable) { out.push('</tbody></table>'); inTable = false; align = [] } }
  const flushNote = () => { if (inNote) { out.push('</div>'); inNote = false } }

  const inline = (s: string): string => {
    const stash: string[] = []
    s = s.replace(/(`+)([\s\S]*?)\1/g, (_m, _t: string, body: string) => { stash.push(`<code class=\"bg-neutral-900 px-1 rounded\">${escapeHtml(body)}</code>`); return `\u0000C${stash.length - 1};` })
    s = s.replace(/\[([^\]]+)\]\(([^\s\)]+)(?:\s+\"([^\"]*)\")?\)/g, (_m, text, url, title) => {
      const t = title ? ` title=\"${escapeHtml(title)}\"` : ''
      return `<a href=\"${escapeHtml(url)}\" target=\"_blank\" class=\"text-sky-400 hover:text-sky-300\"${t}>${escapeHtml(text)}</a>`
    })
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    s = s.replace(/\*(.*?)\*/g, '<em>$1</em>')
    s = s.replace(/\u0000C(\d+);/g, (_m, idx) => {
      const html = stash[Number(idx)] || ''
      const m = html.match(/<code[^>]*>([\s\S]*)<\/code>/)
      const val = m ? m[1] : ''
      const pat = /^(#(?:[0-9a-fA-F]{3,8})|rgb\([^\)]+\)|rgba\([^\)]+\)|hsl\([^\)]+\)|hsla\([^\)]+\))$/
      if (val && pat.test(val)) {
        const chip = `<span class=\"inline-block align-middle w-3 h-3 rounded-sm ml-1\" style=\"background:${escapeNoQuotes(val)}\"></span>`
        return html.replace('</code>', `</code>${chip}`)
      }
      return html
    })
    return s
  }

  while (i < lines.length) {
    const line = lines[i]
    if (!inFence && /^:::note(\s+(info|warn|alert))?\s*$/.test(line)) {
      flushList(); flushQuote(); flushTable(); flushNote()
      const m = line.match(/^:::note(?:\s+(info|warn|alert))?\s*$/)!
      const kind = m[1] || ''
      const cls = kind ? ` md-note-${kind}` : ''
      out.push(`<div class=\"md-note${cls} p-3 rounded border border-neutral-600 bg-neutral-900/60\">`)
      inNote = true; i++; continue
    }
    if (inNote && line.trim() === ':::') { out.push('</div>'); inNote = false; i++; continue }

    const fs = line.match(/^(```|~~~)\s*([^\s]*)[^$]*$/)
    if (!inFence && fs) {
      flushList(); flushQuote(); flushTable()
      inFence = true; fence = fs[1]; fenceInfo = fs[2] || ''
      let lang = '', meta = ''
      if (fenceInfo) { const parts = fenceInfo.split(':'); lang = parts[0] || ''; meta = parts.slice(1).join(':') }
      const buf: string[] = []
      i++
      while (i < lines.length && !new RegExp(`^${fence}\\s*$`).test(lines[i])) { buf.push(lines[i]); i++ }
      if (i < lines.length) i++
      inFence = false
      const code = escapeHtml(buf.join('\n'))
      const metaHtml = (lang || meta) ? `<div class=\"text-[11px] text-gray-400 px-2 py-1 border-b border-neutral-700\">${escapeNoQuotes([lang, meta].filter(Boolean).join(':'))}</div>` : ''
      out.push(`<div class=\"md-code rounded bg-neutral-900 ring-2 ring-neutral-600 overflow-hidden\">${metaHtml}<pre class=\"p-3 overflow-auto\"><code class=\"lang-${escapeNoQuotes(lang)}\">${code}</code></pre></div>`)
      continue
    }

    let m: RegExpMatchArray | null
    if (!inFence && (m = line.match(/^######\s?(.*)$/))) { flushList(); flushQuote(); flushTable(); out.push(`<h6 class=\"text-xs font-semibold mt-2\">${inline(escapeNoQuotes(m[1]))}</h6>`); i++; continue }
    if (!inFence && (m = line.match(/^#####\s?(.*)$/))) { flushList(); flushQuote(); flushTable(); out.push(`<h5 class=\"text-sm font-semibold mt-2\">${inline(escapeNoQuotes(m[1]))}</h5>`); i++; continue }
    if (!inFence && (m = line.match(/^####\s?(.*)$/))) { flushList(); flushQuote(); flushTable(); out.push(`<h4 class=\"text-base font-semibold mt-3\">${inline(escapeNoQuotes(m[1]))}</h4>`); i++; continue }
    if (!inFence && (m = line.match(/^###\s?(.*)$/))) { flushList(); flushQuote(); flushTable(); out.push(`<h3 class=\"text-lg font-semibold mt-3\">${inline(escapeNoQuotes(m[1]))}</h3>`); i++; continue }
    if (!inFence && (m = line.match(/^##\s?(.*)$/))) { flushList(); flushQuote(); flushTable(); out.push(`<h2 class=\"text-xl font-semibold mt-4\">${inline(escapeNoQuotes(m[1]))}</h2>`); i++; continue }
    if (!inFence && (m = line.match(/^#\s?(.*)$/))) { flushList(); flushQuote(); flushTable(); out.push(`<h1 class=\"text-2xl font-semibold mt-4\">${inline(escapeNoQuotes(m[1]))}</h1>`); i++; continue }

    const t = line.trim()
    if (!inFence && (/^(\*\s?){3,}$/.test(t) || /^(-\s?){3,}$/.test(t) || /^_{3,}$/.test(t))) { flushList(); flushQuote(); flushTable(); out.push('<hr class=\"my-3 border-neutral-700\"/>'); i++; continue }

    if (!inFence && /^>\s?/.test(line)) {
      if (!inQuote) { flushList(); flushTable(); out.push('<blockquote class=\"border-l-4 border-neutral-600 pl-3 my-2 text-gray-300\">'); inQuote = true }
      out.push(`<p class=\"my-1\">${inline(escapeNoQuotes(line.replace(/^>\s?/, '')))}</p>`)
      i++; continue
    } else { flushQuote() }

    const parseRow = (r: string) => r.split('|').map(c => c.trim())
    if (!inFence && !inTable && line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*[:\-\s|]+\s*\|?\s*$/.test(lines[i + 1])) {
      flushList(); flushQuote(); flushTable()
      const header = parseRow(line)
      const al = parseRow(lines[i + 1])
      align = al.map(x => x.includes(':-') && x.includes('-:') ? 'center' : (x.trim().startsWith(':') ? 'left' : (x.trim().endsWith(':') ? 'right' : 'left')))
      out.push('<table class=\"md-table my-3 border-collapse\"><thead><tr>')
      header.forEach((h, idx) => out.push(`<th class=\"px-2 py-1 border border-neutral-700 text-gray-200\" style=\"text-align:${align[idx] || 'left'}\">${inline(escapeNoQuotes(h))}</th>`))
      out.push('</tr></thead><tbody>')
      inTable = true; i += 2; continue
    }
    if (inTable) {
      if (line.trim() === '' || !line.includes('|')) { flushTable(); i++; continue }
      const cells = parseRow(line)
      out.push('<tr>')
      cells.forEach((c, idx) => out.push(`<td class=\"px-2 py-1 border border-neutral-700\" style=\"text-align:${align[idx] || 'left'}\">${inline(escapeNoQuotes(c))}</td>`))
      out.push('</tr>')
      i++; continue
    }

    let lm: RegExpMatchArray | null
    if (!inFence && (lm = line.match(/^\s*\d+\.\s+(.*)$/))) {
      if (list !== 'ol') { flushList(); out.push('<ol class=\"ml-5 list-decimal\">'); list = 'ol' }
      out.push(`<li>${inline(escapeNoQuotes(lm[1]))}</li>`)
      i++; continue
    }
    if (!inFence && (lm = line.match(/^\s*[-\*\+]\s+\[( |x|X)\]\s+(.*)$/))) {
      if (list !== 'task') { flushList(); out.push('<ul class=\"ml-5 md-task\">'); list = 'task' }
      const checked = (lm[1] || '').toLowerCase() === 'x'
      out.push(`<li class=\"md-task-item\"><label><input type=\"checkbox\" disabled ${checked ? 'checked' : ''}/> ${inline(escapeNoQuotes(lm[2]))}</label></li>`)
      i++; continue
    }
    if (!inFence && (lm = line.match(/^\s*[-\*\+]\s+(.*)$/))) {
      if (list !== 'ul') { flushList(); out.push('<ul class=\"ml-5 list-disc\">'); list = 'ul' }
      out.push(`<li>${inline(escapeNoQuotes(lm[1]))}</li>`)
      i++; continue
    }
    if (list && line.trim() === '') { flushList(); i++; continue }

    if (line.trim() === '') { flushList(); flushQuote(); flushTable(); flushNote(); out.push(''); i++; continue }
    if (line.trim().startsWith('<')) { out.push(line); i++; continue }
    out.push(`<p class=\"my-2\">${inline(escapeNoQuotes(line))}</p>`)
    i++
  }
  flushList(); flushQuote(); flushTable(); flushNote()
  return out.join('\n')
}

// ---- Popups for README / Markdown ----
function openReadmeModal(root: HTMLElement): void {
  // Ensure single instance
  document.getElementById('rdModal')?.remove()
  const overlay = document.createElement('div')
  overlay.id = 'rdModal'
  overlay.className = 'fixed inset-0 z-[86] bg-black/60 backdrop-blur-[1px] grid place-items-center fade-overlay'
  overlay.innerHTML = `
    <div class="relative w-[min(980px,95vw)] max-h-[86vh] overflow-hidden rounded-xl bg-neutral-900 ring-2 ring-neutral-600 text-gray-100 pop-modal modal-fixed flex flex-col">
      <header class="h-11 flex items-center px-4 border-b border-neutral-600"><div class="text-sm font-medium">README</div><button class="ml-auto text-2xl text-neutral-300 hover:text-white" data-close>×</button></header>
      <section class="flex-1 overflow-auto p-4 text-sm" id="rd-body"><div class="text-gray-400">読み込み中...</div></section>
    </div>`
  const close = () => overlay.remove()
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('[data-close]')?.addEventListener('click', close)
  document.body.appendChild(overlay)
  // Try cached value; otherwise fetch
  const body = overlay.querySelector('#rd-body') as HTMLElement
  const cached = (root as any)._readmeText as string | undefined
  const render = (txt: string) => { body.innerHTML = mdRenderQiita(txt || 'README not found') }
  if (cached != null) render(cached)
  else {
    const full = (root as HTMLElement).getAttribute('data-repo-full') || ''
    if (!full) { render('リンクされたリポジトリがありません'); return }
    const token = localStorage.getItem('apiToken')
    fetch(`/api/github/readme?full_name=${encodeURIComponent(full)}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      .then((r) => r.text())
      .then((t) => { try { (root as any)._readmeText = t } catch {}; render(t) })
      .catch(() => render('読み込みに失敗しました'))
  }
}

function openMarkdownModal(root: HTMLElement, pid: string, id: string): void {
  document.getElementById('mdModal')?.remove()
  const map = mdGetMap(pid)
  const text = map[id] || ''
  const overlay = document.createElement('div')
  overlay.id = 'mdModal'
  overlay.className = 'fixed inset-0 z-[86] bg-black/60 backdrop-blur-[1px] grid place-items-center fade-overlay'
  overlay.innerHTML = `
    <div class="relative w-[min(980px,95vw)] max-h-[86vh] overflow-hidden rounded-xl bg-neutral-900 ring-2 ring-neutral-600 text-gray-100 pop-modal modal-fixed flex flex-col">
      <header class="h-11 flex items-center px-3 border-b border-neutral-600 gap-2">
        <div class="text-sm font-medium">Markdown</div>
        <div class="ml-3 inline-flex items-center gap-1 bg-neutral-800/70 ring-1 ring-neutral-600 rounded p-0.5" role="tablist">
          <button id="mdTabView" role="tab" aria-selected="true" class="px-2 py-1 text-xs rounded bg-neutral-700 text-gray-100">表示</button>
          <button id="mdTabEdit" role="tab" aria-selected="false" class="px-2 py-1 text-xs rounded text-gray-300 hover:text-white">記入</button>
        </div>
        <button class="ml-auto text-2xl text-neutral-300 hover:text-white" data-close>×</button>
      </header>
      <section class="flex-1 overflow-hidden">
        <div id="mdView" class="w-full h-full overflow-auto p-4 text-sm"></div>
        <div id="mdEdit" class="hidden w-full h-full p-3">
          <textarea id="mdText" class="w-full h-[calc(86vh-120px)] min-h-[320px] rounded bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-2 text-gray-100 font-mono text-[13px] leading-5" placeholder="ここにMarkdownを書いてください"></textarea>
          <div class="mt-2 flex items-center justify-end gap-2">
            <button id="mdSave" class="rounded bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 text-sm">保存</button>
          </div>
        </div>
      </section>
    </div>`
  const close = () => overlay.remove()
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('[data-close]')?.addEventListener('click', close)
  document.body.appendChild(overlay)
  const view = overlay.querySelector('#mdView') as HTMLElement
  const edit = overlay.querySelector('#mdEdit') as HTMLElement
  const ta = overlay.querySelector('#mdText') as HTMLTextAreaElement
  const tabView = overlay.querySelector('#mdTabView') as HTMLButtonElement
  const tabEdit = overlay.querySelector('#mdTabEdit') as HTMLButtonElement
  const saveBtn = overlay.querySelector('#mdSave') as HTMLButtonElement
  // init
  view.innerHTML = mdRenderQiita(text || 'ここにMarkdownを書いてください')
  ta.value = text || ''
  const setTab = (which: 'view' | 'edit') => {
    const onView = which === 'view'
    view.classList.toggle('hidden', !onView)
    edit.classList.toggle('hidden', onView)
    tabView.setAttribute('aria-selected', onView ? 'true' : 'false')
    tabEdit.setAttribute('aria-selected', onView ? 'false' : 'true')
    tabView.classList.toggle('bg-neutral-700', onView)
    tabView.classList.toggle('text-gray-100', onView)
    tabEdit.classList.toggle('bg-neutral-700', !onView)
    tabEdit.classList.toggle('text-gray-100', !onView)
    if (!onView) setTimeout(() => ta.focus(), 0)
  }
  tabView.addEventListener('click', () => setTab('view'))
  tabEdit.addEventListener('click', () => setTab('edit'))
  saveBtn.addEventListener('click', () => {
    const txt = ta.value || ''
    try { mdSet(pid, id, txt) } catch {}
    view.innerHTML = mdRenderQiita(txt || 'ここにMarkdownを書いてください')
    setTab('view')
  })
}

// ---- Simple runner modal for custom/flow widgets ----
function openWidgetRunModal(root: HTMLElement, pid: string, id: string, type: string, name?: string): void {
  document.getElementById('wrModal')?.remove()
  const overlay = document.createElement('div')
  overlay.id = 'wrModal'
  overlay.className = 'fixed inset-0 z-[86] bg-black/60 backdrop-blur-[1px] grid place-items-center fade-overlay'
  const title = name && name.trim() ? name.trim() : (type === 'flow' ? 'フロー' : 'カスタム')
  overlay.innerHTML = `
    <div class="relative w-[min(620px,92vw)] max-h-[86vh] overflow-hidden rounded-xl bg-neutral-900 ring-2 ring-neutral-600 text-gray-100 pop-modal modal-fixed flex flex-col">
      <header class="h-11 flex items-center px-4 border-b border-neutral-600">
        <div class="text-sm font-medium">${title}</div>
        <button class="ml-auto text-2xl text-neutral-300 hover:text-white" data-close>×</button>
      </header>
      <section class="flex-1 overflow-auto p-4 text-sm" id="wr-body">
        <div class="text-gray-300">実行を開始しました。</div>
        <div class="text-xs text-gray-400 mt-1">ウィジェットID: ${id}</div>
      </section>
      <footer class="h-11 border-t border-neutral-600 px-4 py-2 flex items-center justify-end gap-2">
        <button class="rounded ring-2 ring-neutral-600 px-3 py-1 hover:bg-neutral-800" data-close>閉じる</button>
      </footer>
    </div>`
  const close = () => overlay.remove()
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelectorAll('[data-close]')?.forEach((el) => el.addEventListener('click', close))
  document.body.appendChild(overlay)
}

// ---- Experimental: Widget Creator Modal (Node flow + DSL placeholder) ----
function openWidgetCreatorModal(root: HTMLElement, pid: string): void {
  // Ensure single top-most creator is present
  document.getElementById('wcModal')?.remove()
  const overlay = document.createElement('div')
  overlay.id = 'wcModal'
  overlay.className = 'fixed inset-0 z-[70] bg-black/70 backdrop-blur-[2px] grid place-items-center fade-overlay'
  overlay.innerHTML = `
    <div class="relative w-[min(1200px,96vw)] h-[min(88vh,900px)] overflow-hidden rounded-xl bg-neutral-900 ring-2 ring-neutral-600 shadow-2xl text-gray-100 pop-modal modal-fixed">
      <header class="h-12 flex items-center gap-3 px-5 border-b border-neutral-600">
        <h3 class="text-lg font-semibold">ウィジェット作成</h3>
        <div class="inline-flex items-center gap-1 bg-neutral-800/60 ring-1 ring-neutral-600 rounded">
          <button data-tab="logic" class="px-3 py-1 text-sm rounded bg-neutral-800/80 text-gray-100">機能</button>
          <button data-tab="design" class="px-3 py-1 text-sm rounded text-gray-300 hover:text-gray-100">見た目</button>
        </div>
        <input id="wc-name" class="ml-3 min-w-[200px] rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-1.5 text-gray-100" placeholder="名前（任意）" />
        <button id=\"wc-close\" class=\"ml-auto text-2xl text-neutral-300 hover:text-white\">×</button>
      </header>
      <div class="flex h-[calc(100%-3rem)]">
        <aside class="w-72 shrink-0 border-r border-neutral-600 p-3 overflow-y-auto">
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
        <section class="flex-1 relative">
          <div class="absolute inset-0 flex flex-col">
            <div id="wc-design-bar" class="shrink-0 p-3 border-b border-neutral-700 flex items-center gap-3">
              <div class="ml-auto flex items-center gap-2">
                <div class="text-xs text-gray-300">色</div>
                <div id="wc-colors" class="flex items-center gap-1.5"></div>
                <label class="ml-3 text-xs text-gray-300">濃さ
                  <input id="wc-alpha" type="range" min="0.20" max="0.70" step="0.02" value="0.38" class="align-middle ml-1">
                </label>
              </div>
            </div>
            <div class="flex-1 relative">
              <div id="wc-board" class="absolute inset-0 overflow-hidden"></div>
              <div id="wcl-wrap" class="absolute inset-0 hidden">
                <div class="wcl-canvas absolute inset-0"></div>
                <svg class="wcl-svg absolute inset-0 w-full h-full pointer-events-none"></svg>
              </div>
              <div id="wc-shape-tools" class="absolute left-3 bottom-3 flex items-center gap-2">
                <button id="wc-clear" class="rounded bg-neutral-800/60 ring-2 ring-neutral-600 text-gray-200 text-xs font-medium px-2 py-1">クリア</button>
                <button id="wc-t1" class="rounded bg-neutral-800/60 ring-2 ring-neutral-600 text-gray-200 text-xs font-medium px-2 py-1">1セル</button>
                <button id="wc-t3" class="rounded bg-neutral-800/60 ring-2 ring-neutral-600 text-gray-200 text-xs font-medium px-2 py-1">3セル</button>
                <button id="wc-t4" class="rounded bg-neutral-800/60 ring-2 ring-neutral-600 text-gray-200 text-xs font-medium px-2 py-1">4セル</button>
                <button id="wc-t7" class="rounded bg-neutral-800/60 ring-2 ring-neutral-600 text-gray-200 text-xs font-medium px-2 py-1">7セル</button>
              </div>
              <div class="absolute right-3 bottom-3 flex items-center gap-2">
                <button id="wc-save" class="inline-flex items-center gap-2 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed" disabled>保存して追加</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  `
  const close = () => { overlay.remove(); const c = +(document.body.getAttribute('data-lock') || '0'); const n = Math.max(0, c - 1); if (n === 0) { (document.body.style as any).overflow = ''; } document.body.setAttribute('data-lock', String(n)) }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#wc-close')?.addEventListener('click', close)
  // Append + lock
  const c = +(document.body.getAttribute('data-lock') || '0')
  const n = c + 1
  if (n === 1) { (document.body.style as any).overflow = 'hidden' }
  document.body.setAttribute('data-lock', String(n))
  document.body.appendChild(overlay)

  // Tabs
  const tabBtns = Array.from(overlay.querySelectorAll('[data-tab]')) as HTMLElement[]
  const designBar = overlay.querySelector('#wc-design-bar') as HTMLElement | null
  const boardWrap = overlay.querySelector('#wc-board') as HTMLElement | null
  const shapeTools = overlay.querySelector('#wc-shape-tools') as HTMLElement | null
  const logicWrap = overlay.querySelector('#wcl-wrap') as HTMLElement | null
  const aside = overlay.querySelector('aside') as HTMLElement | null
  const setTab = (tab: 'logic'|'design') => {
    const onLogic = tab === 'logic'
    aside?.classList.toggle('hidden', !onLogic)
    designBar?.classList.toggle('hidden', onLogic)
    boardWrap?.classList.toggle('hidden', onLogic)
    shapeTools?.classList.toggle('hidden', onLogic)
    logicWrap?.classList.toggle('hidden', !onLogic)
    tabBtns.forEach((b) => {
      const on = (b.getAttribute('data-tab') === tab)
      b.classList.toggle('bg-neutral-800/80', on)
      b.classList.toggle('text-gray-100', on)
      b.classList.toggle('text-gray-300', !on)
    })
    // When switching to design, re-render to center the field with actual size
    if (tab === 'design') {
      try { requestAnimationFrame(() => { try { renderBoard() } catch {} }) } catch {}
    }
  }
  setTab('logic')
  tabBtns.forEach((b) => b.addEventListener('click', () => setTab((b.getAttribute('data-tab') as any)||'logic')))

  // Interactive: hex board and color palette（デザインタブ）
  const board = overlay.querySelector('#wc-board') as HTMLElement
  const nameInput = overlay.querySelector('#wc-name') as HTMLInputElement
  const saveBtn = overlay.querySelector('#wc-save') as HTMLButtonElement
  const clearBtn = overlay.querySelector('#wc-clear') as HTMLButtonElement
  const t1Btn = overlay.querySelector('#wc-t1') as HTMLButtonElement
  const t3Btn = overlay.querySelector('#wc-t3') as HTMLButtonElement
  const t4Btn = overlay.querySelector('#wc-t4') as HTMLButtonElement
  const t7Btn = overlay.querySelector('#wc-t7') as HTMLButtonElement
  const alphaInput = overlay.querySelector('#wc-alpha') as HTMLInputElement
  const colorsWrap = overlay.querySelector('#wc-colors') as HTMLElement

  const palette: Array<[number,number,number]> = [
    [59,130,246],[16,185,129],[239,68,68],[168,85,247],[251,146,60],[234,179,8],[99,102,241],[20,184,166],[14,165,233]
  ]
  let colorIdx = 1 // emerald by default
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

  // Larger tiles for better visibility in design tab
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
    // compute bounding rect to center the grid roughly
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
        // Allow removal only if it keeps the shape contiguous and is not the center (0,0)
        const canRemove = (() => {
          const k = key(ax, az)
          if (k === '0,0') return false
          if (!sel.has(k)) return false
          // Check connectivity after removing k
          const nbrs: Array<[number,number]> = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]]
          const rest = new Set<string>(Array.from(sel))
          rest.delete(k)
          if (!rest.size) return false
          // BFS from center 0,0 (must exist)
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
          // Central delete button
          const del = document.createElement('button')
          del.type = 'button'
          del.title = '削除'
          del.textContent = '×'
          del.style.position = 'absolute'
          del.style.inset = '0'
          del.style.display = 'grid'
          ;(del.style as any).placeItems = 'center'
          // transparent background to avoid overlaying a semi-transparent rectangle look
          del.style.background = 'transparent'
          del.style.border = 'none'
          del.style.borderRadius = '6px'
          del.style.color = 'rgba(255,255,255,0.95)'
          del.style.fontSize = `${Math.round(TILE*0.38)}px`
          del.style.lineHeight = '1'
          del.style.cursor = 'pointer'
          del.style.zIndex = '3'
          // ensure click lands on the button and not the hex container
          del.addEventListener('mousedown', (e) => { e.stopPropagation() })
          del.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); sel.delete(key(ax,az)); renderBoard(); updateSave() })
          hex.appendChild(del)
        }
      } else {
        // Hint tile: use the empty SVG look, grayscale and very transparent
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
    // Draw current selection and only the valid neighbor positions as hints
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
  // Ensure centering after layout settles
  try { requestAnimationFrame(() => { try { renderBoard() } catch {} }) } catch {}
  try { const ro = new ResizeObserver(() => { try { renderBoard() } catch {} }); ro.observe(board) } catch {}

  // Default name: ウィジェットN（Nはcustom/flow数+1）
  try {
    const meta = hxwGetMeta(pid)
    let count = 0
    Object.values(meta || {}).forEach((m: any) => { if (m && (m.type === 'custom' || m.type === 'flow')) count++ })
    const def = `ウィジェット${count + 1}`
    if (nameInput && !(nameInput.value || '').trim()) { nameInput.value = def; updateSave() }
  } catch {}
  clearBtn.addEventListener('click', () => { sel.clear(); renderBoard(); updateSave() })
  t1Btn.addEventListener('click', () => setShape([[0,0]]))
  t3Btn.addEventListener('click', () => setShape([[0,0],[1,0],[0,1]]))
  t4Btn.addEventListener('click', () => setShape([[0,0],[1,0],[0,1],[1,1]]))
  t7Btn.addEventListener('click', () => {
    // small flower shape
    setShape([[0,0],[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]])
  })
  alphaInput.addEventListener('input', () => renderBoard())
  window.addEventListener('resize', () => renderBoard())

  // Logic minimal editor inside creator
  type WcNode = { id: string; kind: 'trigger'|'action'; type: string; x: number; y: number; label?: string }
  type WcEdge = { from: string; to: string }
  const g: { nodes: WcNode[]; edges: WcEdge[] } = { nodes: [], edges: [] }
  const lCanvas = overlay.querySelector('.wcl-canvas') as HTMLElement
  const lSvg = overlay.querySelector('.wcl-svg') as SVGSVGElement
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
      const headCls = visualKind === 'trigger' ? 'bg-emerald-700' : (visualKind === 'transform' ? 'bg-fuchsia-700' : 'bg-sky-700')
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
      // drag
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
      head?.addEventListener('mousedown', (ev) => startDragNode(ev as MouseEvent))
      el.addEventListener('mousedown', (ev) => { const t = ev.target as HTMLElement; if (t.closest('.port-in, .port-out, .fn-bar')) return; startDragNode(ev as MouseEvent) })
      // delete
      el.querySelector('.fn-del')?.addEventListener('click', () => { g.nodes = g.nodes.filter(x => x.id !== n.id); g.edges = g.edges.filter(e => e.from!==n.id && e.to!==n.id); drawNodes(); drawEdges() })
    })
    // drag-to-connect + click fallback
    let pending: string | null = null
    let temp: SVGPathElement | null = null
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
          try { const els = document.elementsFromPoint(ev.clientX, ev.clientY) as HTMLElement[]; target = (els.find(el => el.classList?.contains('port-in')) as HTMLElement) || null } catch {}
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
      po.addEventListener('click', (e) => { const id = (po.closest('.flow-node') as HTMLElement | null)?.getAttribute('data-node') || ''; pending = id; e.stopPropagation() })
    })
    lCanvas.querySelectorAll('.port-in').forEach((pi) => { pi.addEventListener('click', () => { if (!pending) return; const to = (pi.closest('.flow-node') as HTMLElement | null)?.getAttribute('data-node') || ''; if (!to || to===pending) { pending=null; return } if (!g.edges.find(e=>e.from===pending && e.to===to)) g.edges.push({ from: pending, to }); pending=null; drawEdges() }) })
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
  // Add from left palette
  overlay.querySelectorAll('[data-node]')?.forEach((btn) => {
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

  saveBtn.addEventListener('click', (e) => {
    e.preventDefault()
    if (sel.size === 0) return
    const shape: Array<[number,number]> = Array.from(sel).map(s => s.split(',').map(n => parseInt(n,10)) as [number,number])
    const rgb = palette[colorIdx]
    const alpha = parseFloat(alphaInput.value) || 0.38
    const name = (nameInput?.value || '').trim()
    const wantFlow = g.nodes.length > 0
    const entry: LibEntry = { id: `lib-${Date.now()}`, type: wantFlow ? 'flow' : 'custom', name, shape, rgb: [rgb[0], rgb[1], rgb[2]], alpha, flowGraph: wantFlow ? { nodes: g.nodes, edges: g.edges } : undefined }
    try { const list = wpLibGet(pid); list.push(entry); wpLibSet(pid, list) } catch {}
    try { close() } catch {}
    // Refresh the picker overlay to show honeycomb shape entries
    try { (document.getElementById('wp-close') as HTMLButtonElement | null)?.click() } catch {}
    try { setTimeout(() => { try { openWidgetPickerModal(root, pid) } catch {} }, 0) } catch {}
  })
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
  const render = () => { prev.innerHTML = mdRenderQiita(txt.value || '') }
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

function detailLayout(ctx: { id: number; name: string; fullName: string; owner?: string; repo?: string }, opts?: { entryHidden?: boolean }): string {
  const hideWrap = opts?.entryHidden === true
  return `
    <div class="min-h-screen gh-canvas text-gray-100">
      <div class="relative">
        <!-- Top-left breadcrumb (repo / projects) with tabs below -->
        <div class="fixed left-3 top-3 z-[19]">
          <div class="flex items-baseline gap-2">
            <a href="#/project" class="text-gray-300 hover:text-white truncate max-w-[10rem] align-middle text-2xl font-semibold" id="topPathUser" title="${ctx.owner ?? ''}">${ctx.owner ?? ''}</a>
            <span class="text-gray-500 text-2xl">/</span>
            <span class="text-gray-300 text-2xl font-semibold" id="topPathRepo" title="${ctx.repo ?? ''}">${ctx.repo ?? ''}</span>
          </div>
          <div class="mt-2 flex items-center gap-0">
            <button id="topGoSummary" class="px-6 py-1.5 text-white text-xs font-medium drop-shadow-sm hover:bg-sky-600 bg-sky-700 transition select-none" style="clip-path: polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%); -webkit-clip-path: polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%);">概要</button>
            <button id="topGoBoard" class="px-6 py-1.5 text-white text-xs font-medium drop-shadow-sm hover:bg-emerald-600 bg-emerald-700 transition select-none" style="clip-path: polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%); -webkit-clip-path: polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%); margin-left:-12px;">ボード</button>
          </div>
        </div>
        <!-- Content -->
        <div class="flex-1 min-w-0">
          <main class="p-0">
            <section class="space-y-3" id="tab-summary" data-tab="summary">
              <!-- Honeycomb widget field: full-screen behind left rail -->
              <div id="hxwHost" class="fixed inset-0 z-0">
                <section class="hxw-wrap" id="hxwWrap"${hideWrap ? ' style="visibility:hidden;opacity:0"' : ''}>
                  <div class="hxw-stage" id="hxwStage">
                    <div class="hxw-canvas hxw-base" id="hxwBase" style="width:2000px; height:1400px"></div>
                    <div class="hxw-canvas" id="hxwCanvas" style="width:2000px; height:1400px"></div>
                  </div>
                </section>
              </div>
              <!-- Shortcuts rail (peek from left; expands on hover) -->
              <div id="hxwShortcuts" class="hxw-sc-rail flex flex-col"></div>
              <!-- Capacity bar (bottom-left) - show only in edit mode -->
              <div id="hxwCap" class="hxw-cap hidden"></div>
              <!-- Minimap (top-right) -->
              <div class="hxw-mini"${hideWrap ? ' style=\"visibility:hidden\"' : ''}><canvas id="hxwMini" width="120" height="120"></canvas></div>
              <!-- Info panel (bottom, edit mode only) -->
              <aside id="hxwInfo" class="fixed inset-x-0 bottom-0 z-[18] hidden">
                <div class="mx-auto w-[min(560px,94vw)]">
                  <!-- Collapse handle (prominent, animated chevrons) -->
                  <button id="hxwInfoHandle" class="block mx-auto info-handle mb-1" aria-expanded="true" title="しまう">
                    <span class="ih-ico" aria-hidden="true">
                      <svg width="48" height="28" viewBox="0 0 24 16" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                        <g class="up">
                          <!-- two upward chevrons with wider spacing -->
                          <polyline class="chev1" points="3,7 12,3 21,7" />
                          <polyline class="chev2" points="3,13 12,9 21,13" />
                        </g>
                        <g class="down">
                          <!-- two downward chevrons with wider spacing -->
                          <polyline class="chev1" points="3,3 12,7 21,3" />
                          <polyline class="chev2" points="3,9 12,13 21,9" />
                        </g>
                      </svg>
                    </span>
                  </button>
                  <div id="hxwInfoPanel" class="rounded-t-xl rounded-b-none border-2 border-neutral-600 border-b-0 bg-neutral-950/70 backdrop-blur px-4 py-2 text-gray-100 shadow-xl">
                    <div class="flex items-center gap-2 mb-1">
                      <div class="text-sm font-semibold">選択中のウィジェット</div>
                    </div>
                  <div id="hxwInfoBody" class="text-sm leading-tight space-y-1">
                    <div class="text-gray-400">ウィジェットをクリックで選択</div>
                  </div>
                  <!-- Shortcuts control -->
                  <div id="hxwScCtl" class="mt-2 flex items-center gap-2"></div>
                  <div class="mt-2 flex items-center justify-end gap-2">
                    <button id="hxwDel" class="hidden rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-medium px-3 py-1">削除</button>
                  </div>
                  </div>
                </div>
              </aside>
              <!-- Hexagon Actions (bottom-right) -->
              <div class="hxw-hex-ctl" aria-label="Actions">
                <!-- 3D toggle (purple) -->
                <button id="hxwView3d" class="ctl-hex ctl-hex-violet ctl-pos-3d" title="2D/3D 切替" aria-label="2D/3D 切替">
                  <span class="ctl-label">3D</span>
                </button>
                <!-- Edit toggle (orange) -->
                <button id="wgEditToggle" class="ctl-hex ctl-hex-orange ctl-pos-edit" title="編集モード" aria-label="編集モード">
                  <span class="ctl-label">編集</span>
                </button>
                <!-- Add widget (green single) - shown only in edit mode -->
                <button id="hxwFab" class="ctl-hex ctl-hex-green ctl-pos-add" style="display:none" title="ウィジェットを追加" aria-label="ウィジェットを追加">
                  <span class="ctl-label plus">＋</span>
                </button>
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
      // Also clear any "新規タブ" widget association pointing to this tab (server state)
      try {
        const meta = hxwGetMeta(pid)
        Object.entries(meta).forEach(([wid, m]) => {
          if ((m as any)?.type === 'tabnew') {
            const k = `tabnew:${wid}`
            const st = wsGet(pid, k)
            if (st && st.id === id) wsSet(pid, k, null)
          }
        })
      } catch {}
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
  const tabBar = root.querySelector('#tabBar') as HTMLElement | null
  let btn: HTMLElement | null = null
  let lock: HTMLElement | null = null
  let menu: HTMLElement | null = null
  if (tabBar) {
    const newBtn = tabBar.querySelector('[data-tab="new"]') as HTMLElement | null
    // wrapper to host delete button
    const wrap = document.createElement('span')
    wrap.className = 'tab-row group relative flex w-full items-center gap-2 rounded-md hover:bg-neutral-600/60 pr-1 -mr-1'
    btn = document.createElement('button')
    // Use symmetric spacing to keep label centered under the active underline
    btn.className = 'tab-btn w-full text-left px-3 py-2 rounded-md text-gray-100 text-[15px]'
    btn.setAttribute('data-tab', id)
    btn.textContent = preTitle || tabTitle(type)
    lock = document.createElement('button')
    lock.className = 'tab-lock opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-300 hover:text-gray-100'
    lock.setAttribute('data-for', id)
    lock.title = 'ロック切替'
    // Inline SVG icon
    lock.innerHTML = LOCK_SVG
    // menu (three-dots) button
    menu = document.createElement('button')
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
  }

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

  if (btn) {
    btn.addEventListener('click', () => {
      root.querySelectorAll('section[data-tab]').forEach((sec) => (sec as HTMLElement).classList.toggle('hidden', sec.getAttribute('data-tab') !== id))
      root.querySelectorAll('#tabBar .tab-btn').forEach((b) => {
        b.classList.remove('border-emerald-500', 'ring-2', 'ring-neutral-600', 'bg-neutral-800/60', 'border-l-2', 'border-b-2', 'border-orange-500')
        const active = b === btn
        const wrap = (b as HTMLElement).closest('.tab-row') as HTMLElement | null
        if (wrap) wrap.classList.toggle('bg-neutral-500/50', active)
        b.classList.toggle('text-gray-100', active)
        b.classList.toggle('text-gray-400', !active)
      })
    })
  }

  // Double-click rename disabled (use context menu instead)

  // context menu
  if (btn) btn.addEventListener('contextmenu', (e) => { e.preventDefault(); openTabContextMenu(root, pid, { kind: 'custom', id, btn: btn!, type }) })
  // click three-dots to open menu (guard if menu exists)
  menu?.addEventListener('click', (e) => { e.stopPropagation(); openTabContextMenu(root, pid, { kind: 'custom', id, btn: btn || (e.currentTarget as HTMLElement), type }) })

  if (persist) {
    const saved = JSON.parse(localStorage.getItem(`tabs-${pid}`) || '[]') as Array<{ id: string; type: TabTemplate; title?: string }>
    saved.push({ id, type, title: (btn?.textContent) || preTitle || tabTitle(type) })
    localStorage.setItem(`tabs-${pid}`, JSON.stringify(saved))
  }
  // Activate the new tab panel only when creating a brand-new tab (persist=true)
  if (persist) {
    if (btn) (btn as HTMLButtonElement).click()
    else {
      // No #tabBar in DOM; show the panel directly
      root.querySelectorAll('section[data-tab]').forEach((sec) => (sec as HTMLElement).classList.toggle('hidden', (sec as HTMLElement).getAttribute('data-tab') !== id))
    }
  }

  // Initialize lock visual from saved state
  try {
    if (lock) {
      const scoped = `${pid}:${id}`
      const on = localStorage.getItem(`wg-edit-${scoped}`) === '1'
      lock.innerHTML = on ? LOCK_OPEN_RIGHT_SVG : LOCK_SVG
      lock.setAttribute('aria-pressed', on ? 'true' : 'false')
    }
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

// ---------------- Honeycomb Widgets (Detail Summary) ----------------

type HexWLayout = {
  scale: number
  tile: number
  width: number
  height: number
  offsetX: number
  offsetY: number
  inited?: boolean
  nodes?: Array<{ q: number; r: number; x: number; y: number }>
}

function hxwEnsureDefs(): SVGDefsElement {
  let root = document.getElementById('hxw-defs-root') as SVGSVGElement | null
  if (!root) {
    root = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
    root.id = 'hxw-defs-root'
    root.setAttribute('width', '0'); root.setAttribute('height', '0')
    ;(root.style as any).position = 'absolute'
    ;(root.style as any).width = '0px'; (root.style as any).height = '0px'
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    defs.id = 'hxw-defs'
    root.appendChild(defs)
    document.body.appendChild(root)
  }
  let defs = root.querySelector('#hxw-defs') as SVGDefsElement | null
  if (!defs) { defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs') as SVGDefsElement; defs.id = 'hxw-defs'; root.appendChild(defs) }
  return defs
}

function hxwKey(pid: string): string { return `pj-hx-widgets-${pid}` }

// Keep hex-field radius stable across zoom by persisting a preferred radius.
// Global (app-wide) so all projects use the same baseline cell count unless a larger
// radius is required to contain existing widgets, in which case we raise it.
function hxwRadiusKey(): string { return 'hxw-radius-v1' }
const HXW_DEFAULT_RADIUS = 15
function hxwGetPreferredRadius(): number | null {
  try {
    const v = localStorage.getItem(hxwRadiusKey())
    if (!v) return null
    const n = parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch { return null }
}
function hxwSetPreferredRadius(n: number): void {
  try { if (Number.isFinite(n) && n > 0) localStorage.setItem(hxwRadiusKey(), String(Math.floor(n))) } catch {}
}
function hxwGetMeta(pid: string): Record<string, { type: string; q: number; r: number }> {
  try {
    const raw = JSON.parse(localStorage.getItem(hxwKey(pid)) || '{}') as Record<string, { type: string; q: number; r: number }>
    // Filter out deprecated or disabled widget types
    const meta: Record<string, { type: string; q: number; r: number }> = {}
    Object.entries(raw).forEach(([id, m]) => {
      const t = (m?.type || '')
      // Keep 'flow' widgets (created by the Widget Creator) for the hex field
      if (t === 'calendar') return // calendar widget retired
      if (t === 'tabbar') return // tab switch widget retired; replaced by tabnew behavior
      meta[id] = m
    })
    if (Object.keys(meta).length !== Object.keys(raw).length) { try { hxwSetMeta(pid, meta) } catch {} }
    return meta
  } catch { return {} }
}
function hxwSetMeta(pid: string, meta: Record<string, { type: string; q: number; r: number }>): void {
  localStorage.setItem(hxwKey(pid), JSON.stringify(meta))
}

// ---- Picker library for saved custom/flow widgets ----
type LibEntry = { id: string; type: 'custom'|'flow'; name: string; shape: Array<[number,number]>; rgb?: [number,number,number]; alpha?: number; flowGraph?: any }
function wpLibKey(pid: string): string { return `pj-wp-lib-${pid}` }
function wpLibGet(pid: string): LibEntry[] { try { const v = JSON.parse(localStorage.getItem(wpLibKey(pid))||'[]') as LibEntry[]; return Array.isArray(v)? v: [] } catch { return [] } }
function wpLibSet(pid: string, list: LibEntry[]): void { try { localStorage.setItem(wpLibKey(pid), JSON.stringify(list)) } catch {} }
function userLibKey(uid: number): string { return `pj-wp-lib-user-${uid}` }
function userLibGet(uid: number): LibEntry[] { try { const v = JSON.parse(localStorage.getItem(userLibKey(uid))||'[]') as LibEntry[]; return Array.isArray(v)? v: [] } catch { return [] } }
function userLibSet(uid: number, list: LibEntry[]): void { try { localStorage.setItem(userLibKey(uid), JSON.stringify(list)) } catch {} }
function wpLibGlobalKey(): string { return 'pj-wp-lib-global' }
function wpLibGlobalGet(): LibEntry[] { try { const v = JSON.parse(localStorage.getItem(wpLibGlobalKey())||'[]') as LibEntry[]; return Array.isArray(v)? v: [] } catch { return [] } }
function wpLibGlobalSet(list: LibEntry[]): void { try { localStorage.setItem(wpLibGlobalKey(), JSON.stringify(list)) } catch {} }
function wpLibAll(pid: string): Array<LibEntry & { __src?: 'global'|'pid' }> {
  const g = wpLibGlobalGet().map((x) => ({ ...x, __src: 'global' as const }))
  const p = wpLibGet(pid).map((x) => ({ ...x, __src: 'pid' as const }))
  return g.concat(p)
}
function renderPickerLibrary(pid: string): void {
  const field = document.querySelector('#wp-field') as HTMLElement | null
  if (!field) return
  let wrap = field.querySelector('#wp-lib') as HTMLElement | null
  if (!wrap) { wrap = document.createElement('div'); wrap.id = 'wp-lib'; field.appendChild(wrap) }
  wrap.style.position = 'absolute'; wrap.style.left = '8px'; wrap.style.right = '8px'; wrap.style.bottom = '8px'
  wrap.style.display = 'flex'; wrap.style.gap = '8px'; wrap.style.flexWrap = 'wrap'
  wrap.style.zIndex = '20'
  const list = wpLibAll(pid)
  wrap.innerHTML = ''
  list.forEach((en) => {
    const item = document.createElement('div')
    item.style.display = 'inline-flex'
    item.style.alignItems = 'center'
    item.style.gap = '6px'
    const btn = document.createElement('button')
    btn.className = 'wp-lib-item'
    btn.title = en.name || (en.type === 'flow' ? 'フロー' : 'カスタム')
    btn.style.padding = '4px 8px'
    btn.style.borderRadius = '8px'
    btn.style.background = 'rgba(24,24,24,.85)'
    btn.style.border = '1px solid rgba(96,96,96,.8)'
    btn.style.color = '#e5e7eb'
    btn.style.fontSize = '12px'
    btn.textContent = en.name || (en.type === 'flow' ? 'フロー' : 'カスタム')
    btn.addEventListener('click', () => {
      ;(window as any)._hxwPending = { shape: en.shape, rgb: en.rgb, alpha: en.alpha, name: en.name, flowGraph: en.flowGraph }
      const root = (window as any)._hxwPickerRoot as HTMLElement | null
      const pid2 = (window as any)._hxwPickerPid as string | null
      if (root && pid2) { try { hxwStartPlacement(root, pid2, en.type) } catch {} }
    })
    const del = document.createElement('button')
    del.title = '削除'
    del.textContent = '×'
    del.style.color = '#f43f5e' // rose-500
    del.style.background = 'transparent'
    del.style.border = 'none'
    del.style.fontSize = '14px'
    del.style.lineHeight = '1'
    del.style.padding = '0 2px'
    del.addEventListener('click', (ev) => {
      ev.stopPropagation()
      const src = (en as any).__src
      if (src === 'global') {
        const nextG = wpLibGlobalGet().filter(x => x.id !== en.id)
        wpLibGlobalSet(nextG)
      } else {
        const nextP = wpLibGet(pid).filter(x => x.id !== en.id)
        wpLibSet(pid, nextP)
      }
      try { showMiniToast('ウィジェットを削除しました', { variant: 'danger' }) } catch {}
      // Reopen picker to rebuild field honeycomb with lib items removed
      try { (document.getElementById('wp-close') as HTMLButtonElement | null)?.click() } catch {}
      try { const root = (window as any)._hxwPickerRoot as HTMLElement | null; const pid2 = (window as any)._hxwPickerPid as string | null; if (root && pid2) setTimeout(()=>openWidgetPickerModal(root, pid2!),0) } catch {}
    })
    item.appendChild(btn)
    item.appendChild(del)
    wrap.appendChild(item)
  })
}

// ---- Hex widgets: per-widget custom config (shape/color/name) ----
type HexCustomConf = { shape?: Array<[number, number]>; rgb?: [number, number, number]; alpha?: number; name?: string }
function hxwCustomKey(pid: string): string { return `pj-hxw-custom-${pid}` }
function hxwCustomAll(pid: string): Record<string, HexCustomConf> {
  try { return JSON.parse(localStorage.getItem(hxwCustomKey(pid)) || '{}') as Record<string, HexCustomConf> } catch { return {} }
}
function hxwCustomSave(pid: string, map: Record<string, HexCustomConf>): void { try { localStorage.setItem(hxwCustomKey(pid), JSON.stringify(map)) } catch {} }
function hxwCustomGet(pid: string, id: string): HexCustomConf | undefined { const m = hxwCustomAll(pid); return m[id] }
function hxwCustomSet(pid: string, id: string, conf: HexCustomConf): void { const m = hxwCustomAll(pid); m[id] = conf; hxwCustomSave(pid, m) }
function hxwCustomDelete(pid: string, id: string): void { const m = hxwCustomAll(pid); if (id in m) { delete m[id]; hxwCustomSave(pid, m) } }
// Resolve relative hex shape (axial offsets) for a widget, allowing per-id override
function hxwRelFor(pid: string, id: string, type: string): Array<[number, number]> {
  const conf = hxwCustomGet(pid, id)
  if (conf && Array.isArray(conf.shape) && conf.shape.length) return conf.shape as Array<[number, number]>
  return hxwShapeFor(type)
}

// ---- Shortcuts (hex widgets) ----
function scKey(pid: string): string { return `pj-hxw-sc-${pid}` }
function scGet(pid: string): string[] {
  try { const a = JSON.parse(localStorage.getItem(scKey(pid)) || '[]') as string[]; return Array.isArray(a) ? a : [] } catch { return [] }
}
function scSet(pid: string, ids: string[]): void { try { localStorage.setItem(scKey(pid), JSON.stringify(Array.from(new Set(ids)))) } catch {} }
function scAdd(pid: string, id: string): void { const a = scGet(pid); if (!a.includes(id)) { a.push(id); scSet(pid, a) } }
function scRemove(pid: string, id: string): void { const a = scGet(pid).filter(x => x !== id); scSet(pid, a); try { scNameDelete(pid, id) } catch {} }
function scNameKey(pid: string): string { return `pj-hxw-sc-name-${pid}` }
function scNameMap(pid: string): Record<string, string> { try { return JSON.parse(localStorage.getItem(scNameKey(pid)) || '{}') as Record<string, string> } catch { return {} } }
function scNameSet(pid: string, id: string, name: string): void { const m = scNameMap(pid); m[id] = name; localStorage.setItem(scNameKey(pid), JSON.stringify(m)) }
function scNameGet(pid: string, id: string): string { try { const m = scNameMap(pid); return m[id] || '' } catch { return '' } }
function scNameDelete(pid: string, id: string): void { const m = scNameMap(pid); if (id in m) { delete m[id]; localStorage.setItem(scNameKey(pid), JSON.stringify(m)) } }
function hxwFocusWidget(root: HTMLElement, pid: string, id: string): void {
  const wrap = root.querySelector('#hxwWrap') as HTMLElement | null
  const canvas = root.querySelector('#hxwCanvas') as HTMLElement | null
  if (!wrap || !canvas) return
  const st: any = (wrap as any)._hxw
  const host = canvas.querySelector(`.hxw-widget[data-widget="${id}"]`) as HTMLElement | null
  if (!host || !st) return
  const left = parseFloat(host.getAttribute('data-left') || '0')
  const top = parseFloat(host.getAttribute('data-top') || '0')
  const w = parseFloat(host.getAttribute('data-w') || '0')
  const h = parseFloat(host.getAttribute('data-h') || '0')
  const cx = left + w / 2
  const cy = top + h / 2
  // Desired zoom when focusing via shortcut
  const Z_MAX = 2.4
  const minScale = Math.max((wrap.clientWidth / (st.width || 1)), (wrap.clientHeight / (st.height || 1)))
  const target = 1.35
  const destScale = Math.max(minScale, Math.min(Z_MAX, target))
  // Smoothly animate scale and pan to keep continuity
  const s0 = st.scale || 1
  const vw = wrap.clientWidth
  const vh = wrap.clientHeight
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) // easeInOutCubic
  const dur = 420
  let raf = 0
  try { if ((wrap as any)._hxwAnim) cancelAnimationFrame((wrap as any)._hxwAnim) } catch {}
  const t0 = performance.now()
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / dur)
    const k = ease(p)
    const s = s0 + (destScale - s0) * k
    st.scale = s
    st.offsetX = Math.round(vw / 2 - cx * s)
    st.offsetY = Math.round(vh / 2 - cy * s)
    try { hxwApplyTransform(wrap, canvas, st) } catch {}
    if (p < 1) { (wrap as any)._hxwAnim = requestAnimationFrame(step) } else { (wrap as any)._hxwAnim = 0 }
  }
  ;(wrap as any)._hxwAnim = requestAnimationFrame(step)
  // Blink a dashed outline around the focused widget (fallback: also set inline animation on path)
  const flash = () => {
    try {
      host.classList.add('hxw-flash')
      const path = host.querySelector('svg.hxw-outline path') as SVGPathElement | null
      if (path) {
        path.style.stroke = 'var(--gh-contrast)'
        path.style.strokeWidth = '3'
        path.style.strokeDasharray = '9 7'
        path.style.animation = 'hxwDashBlink .42s ease-in-out 4'
        setTimeout(() => { try { path.style.animation = '' } catch {} }, 2000)
      }
      setTimeout(() => { try { host.classList.remove('hxw-flash') } catch {} }, 2000)
    } catch {}
  }
  // if outline not yet mounted, retry briefly
  if (host.querySelector('svg.hxw-outline path')) flash()
  else setTimeout(flash, 50)
}
function hxwRenderShortcuts(root: HTMLElement, pid: string): void {
  const rail = root.querySelector('#hxwShortcuts') as HTMLElement | null
  const wrap = root.querySelector('#hxwWrap') as HTMLElement | null
  const canvas = root.querySelector('#hxwCanvas') as HTMLElement | null
  if (!rail || !wrap || !canvas) return
  const metaHex = hxwGetMeta(pid)
  const raw = scGet(pid)
  // normalize / prune
  const normalized: string[] = []
  raw.forEach((s) => {
    if (s.startsWith('gd:')) {
      // keep grid shortcuts of same pid
      const parts = s.split(':')
      if (parts.length >= 4 && parts[1] === String(pid)) normalized.push(s)
    } else {
      if (metaHex[s]) normalized.push(s)
    }
  })
  if (normalized.length !== raw.length) scSet(pid, normalized)
  rail.innerHTML = ''
  const palette: Array<[string, string]> = [
    ['#22d3ee', '#3b82f6'], // cyan → blue
    ['#f59e0b', '#ef4444'], // amber → red
    ['#10b981', '#84cc16'], // emerald → lime
    ['#a855f7', '#ec4899'], // violet → pink
    ['#f97316', '#f43f5e'], // orange → rose
    ['#06b6d4', '#8b5cf6'], // cyan → violet
  ]
  normalized.forEach((key, idx) => {
    let label = 'Widget'
    let onClick: () => void = () => {}
    if (key.startsWith('gd:')) {
      const [, p, scope, wid] = key.split(':')
      const scoped = `${p}:${scope}`
      const metaG = getWidgetMeta(scoped)
      const type = (metaG[wid]?.type || 'widget')
      try { label = scNameGet(pid, key) || widgetTitle(type) } catch { label = scNameGet(pid, key) || 'Widget' }
      onClick = () => {
        // show target tab
        const sec = root.querySelector(`section[data-tab="${scope}"]`) as HTMLElement | null
        if (sec) {
          root.querySelectorAll('section[data-tab]').forEach((s) => (s as HTMLElement).classList.toggle('hidden', s !== sec))
          // scroll widget into view
          const el = sec.querySelector(`.widget[data-widget="${wid}"]`) as HTMLElement | null
          if (el) {
            try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }) } catch { el.scrollIntoView() }
            try { el.classList.add('widget-flash'); setTimeout(() => el.classList.remove('widget-flash'), 1800) } catch {}
          }
        }
      }
    } else {
      const type = (metaHex[key]?.type || 'widget')
      try { label = scNameGet(pid, key) || widgetTitle(type) } catch { label = scNameGet(pid, key) || 'Widget' }
      onClick = () => hxwFocusWidget(root, pid, key)
    }
    const btn = document.createElement('button')
    btn.className = 'hxw-shortcut'
    btn.title = label
    btn.textContent = label.slice(0, 2)
    // assign gradient colors via CSS variables for visual variety
    const [c1, c2] = palette[idx % palette.length]
    try { btn.style.setProperty('--hxw-sc-a', c1); btn.style.setProperty('--hxw-sc-b', c2) } catch {}
    btn.addEventListener('click', (ev) => {
      try { onClick() } finally {
        // Auto-collapse the rail by removing focus so :focus-within no longer applies
        try { (ev.currentTarget as HTMLElement)?.blur() } catch {}
        try {
          const active = document.activeElement as HTMLElement | null
          if (active && rail.contains(active)) active.blur()
        } catch {}
      }
    })
    rail.appendChild(btn)
  })
}

// Capacity bar (usage fill: used/total)
function hxwRenderCapacityBar(root: HTMLElement, pid: string): void {
  const wrap = root.querySelector('#hxwWrap') as HTMLElement | null
  const barHost = root.querySelector('#hxwCap') as HTMLElement | null
  if (!wrap || !barHost) return
  const mask: Set<string> = (wrap as any)._hxwMask || new Set<string>()
  const occ: Set<string> = (wrap as any)._hxwOcc || new Set<string>()
  const total = mask.size
  const used = occ.size
  const remain = Math.max(0, total - used)
  if (total === 0) { barHost.innerHTML = ''; return }
  if (!barHost.firstChild) {
    const textEl = document.createElement('div')
    textEl.className = 'cap-text'
    const wrapEl = document.createElement('div')
    wrapEl.className = 'cap-wrap'
    const fillEl = document.createElement('div')
    fillEl.className = 'cap-fill'
    barHost.appendChild(textEl)
    wrapEl.appendChild(fillEl)
    barHost.appendChild(wrapEl)
  }
  // Invert to show usage growing towards full instead of remaining like HP
  const usedPct = total > 0 ? used / total : 0
  const fill = barHost.querySelector('.cap-fill') as HTMLElement | null
  const text = barHost.querySelector('.cap-text') as HTMLElement | null
  if (fill) {
    fill.style.width = `${Math.round(usedPct * 100)}%`
    const setGrad = (a: string, b: string) => { try { fill!.style.setProperty('--cap-a', a); fill!.style.setProperty('--cap-b', b) } catch {} }
    // Color thresholds by usage: <= 1/3 green, <= 2/3 orange, > 2/3 red
    if (usedPct <= (1/3)) setGrad('#10b981', '#84cc16') // green
    else if (usedPct <= (2/3)) setGrad('#f59e0b', '#f97316') // amber
    else setGrad('#ef4444', '#f43f5e') // red
  }
  if (text) text.textContent = `現在 ${used} / ${total}`
}

// Parity-independent shapes using axial coordinates
type Ax = { x: number; z: number }
const AX_DIRS: Ax[] = [ { x: +1, z: 0 }, { x: +1, z: -1 }, { x: 0, z: -1 }, { x: -1, z: 0 }, { x: -1, z: +1 }, { x: 0, z: +1 } ]
function oddqToAxial(q: number, r: number): Ax { return { x: q, z: r - ((q - (q & 1)) >> 1) } }
function axialToOddq(x: number, z: number): { q: number; r: number } { const q = x; const r = z + ((q - (q & 1)) >> 1); return { q, r } }
// Row-offset(odd-r) → axial（フィールドシルエットを90°回したい時に使用）
function oddrToAxialR(q: number, r: number): Ax { const x = q - ((r - (r & 1)) >> 1); const z = r; return { x, z } }
function axGrow(count: number): Array<[number, number]> {
  const seen = new Set<string>()
  const out: Array<[number, number]> = []
  const q: Array<[number, number]> = [[0, 0]]
  const key = (a: number, b: number) => `${a},${b}`
  seen.add(key(0, 0))
  while (q.length && out.length < count) {
    const cur = q.shift()!
    out.push(cur)
    for (const d of AX_DIRS) {
      const nx = cur[0] + d.x, nz = cur[1] + d.z
      const k = key(nx, nz)
      if (!seen.has(k)) { seen.add(k); q.push([nx, nz]) }
      if (out.length + q.length >= count) break
    }
  }
  return out
}
function hxwShapeFor(type: string): Array<[number, number]> {
  switch (type) {
    case 'custom': return [[0,0]] as any
    case 'flow': return axGrow(7)
    case 'clock': return axGrow(7)
    // Digital clock: compact tri-hex layout (left hour, top-right month/day, bottom-right minute)
    case 'clock-digital': return [[0,0],[1,0],[1,-1]] as any
    case 'readme': return [[0, 0]] as any
    case 'contrib': return axGrow(7)
    case 'committers': return axGrow(7)
    case 'markdown': return [[0, 0]] as any
    case 'spacer': return [[0, 0]] as any
    case 'links': return axGrow(4)
    case 'tasksum': return [[0,0],[1,0],[0,1],[1,1]] as any
    case 'calendar': return axGrow(12)
    case 'tabnew': return [[0, 0]] as any
    case 'skin': return [[0, 0]] as any
    case 'tabbar': return axGrow(7)
    case 'invite': return [[0, 0]] as any
    case 'account': return [[0, 0]] as any
    default: return axGrow(6)
  }
}

function hxwApplyTransform(wrap: HTMLElement, canvas: HTMLElement, st: HexWLayout): void {
  const iso = wrap.classList.contains('hxw-iso')
  // Keep scale consistent; 3D depth is controlled by --hxw-elev instead of shrinking
  const sc = st.scale
  // Stage handles rotation/elevation so panning stays parallel to plane
  const stage = document.getElementById('hxwStage') as HTMLElement | null
  if (stage) {
    // Make the transition feel smooth and predictable
    let pivot = (wrap as any)._hxwPivot as [number, number] | undefined
    if (iso && !pivot) {
      // default to viewport center if not set yet
      pivot = [Math.round(wrap.clientWidth / 2), Math.round(wrap.clientHeight / 2)]
      ;(wrap as any)._hxwPivot = pivot
    }
    stage.style.transformOrigin = iso && pivot ? `${pivot[0]}px ${pivot[1]}px` : '0 0'
    stage.style.transition = 'transform .22s ease'
    stage.style.transform = iso ? 'rotateX(var(--hxw-rot-x, 46deg)) rotateZ(var(--hxw-rot-z, 0deg)) translateZ(calc(-1 * var(--hxw-elev, 140px)))' : ''
  }
  const move = `translate(${st.offsetX}px, ${st.offsetY}px) scale(${sc})`
  canvas.style.transform = move
  const base = document.getElementById('hxwBase') as HTMLElement | null
  if (base) base.style.transform = move
  // update minimap
  try { hxwDrawMini(wrap, st) } catch { }
}

function hxwEnsureContentInView(wrap: HTMLElement, canvas: HTMLElement, st: HexWLayout): void {
  try {
    const nodes = (wrap as any)._hxw?.nodes as Array<{ x: number; y: number }> | undefined
    if (!nodes || nodes.length === 0) return
    const vw = wrap.clientWidth
    const vh = wrap.clientHeight
    const tW = st.tile
    const tH = Math.round(st.tile * 0.866)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const n of nodes) {
      if (n.x < minX) minX = n.x
      if (n.y < minY) minY = n.y
      if (n.x + tW > maxX) maxX = n.x + tW
      if (n.y + tH > maxY) maxY = n.y + tH
    }
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return
    // current viewport in world coordinates (use base scale so it matches offsets)
    const cxBase = (-st.offsetX) / (st.scale || 1) + vw / (st.scale || 1) / 2
    const cyBase = (-st.offsetY) / (st.scale || 1) + vh / (st.scale || 1) / 2
    const wBase = vw / (st.scale || 1)
    const hBase = vh / (st.scale || 1)
    const vx0 = cxBase - wBase / 2
    const vy0 = cyBase - hBase / 2
    const vx1 = cxBase + wBase / 2
    const vy1 = cyBase + hBase / 2
    const ov = !(vx1 < minX || vx0 > maxX || vy1 < minY || vy0 > maxY)
    if (ov) return
    // recentre to content
    const ccx = (minX + maxX) / 2
    const ccy = (minY + maxY) / 2
    st.offsetX = Math.round(vw / 2 - ccx * (st.scale || 1))
    st.offsetY = Math.round(vh / 2 - ccy * (st.scale || 1))
  } catch { }
}

function hxwDrawMini(wrap: HTMLElement, st: HexWLayout): void {
  const mini = document.getElementById('hxwMini') as HTMLCanvasElement | null
  if (!mini) return
  const ctx = mini.getContext('2d')!
  const W = mini.width, H = mini.height
  ctx.clearRect(0, 0, W, H)
  ctx.save()
  // Clip to circle so content matches project list minimap
  try { ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) / 2 - 3, 0, Math.PI * 2); ctx.clip() } catch { }
  const pad = 2
  const sx = (W - pad * 2) / (st.width || 1)
  const sy = (H - pad * 2) / (st.height || 1)
  const s = Math.max(sx, sy) * 1.15
  // Effective scale reflects 3D elevation so minimap stays in sync
  const iso = wrap.classList.contains('hxw-iso')
  const elev = (function(){ try { const v = getComputedStyle(wrap).getPropertyValue('--hxw-elev').trim(); const n = parseFloat(v.replace('px','')); return isNaN(n) ? 140 : n } catch { return 140 } })()
  const isoFactor = iso ? (140 / Math.max(1, elev)) : 1
  const eff = st.scale * isoFactor
  // Anchor the world center using the base scale so pinch-elevation doesn't make the center jump
  const bx = (-st.offsetX) / st.scale
  const by = (-st.offsetY) / st.scale
  const bw = wrap.clientWidth / st.scale
  const bh = wrap.clientHeight / st.scale
  const cxBase = bx + bw / 2
  const cyBase = by + bh / 2
  const ox = W / 2 - cxBase * s
  const oy = H / 2 - cyBase * s
  const t = st.tile || 200
  const hw = t * 0.25 * s, hh = (t * 0.866) * s
  const drawHex = (x: number, y: number, fill: string) => {
    ctx.beginPath()
    const px = ox + x * s, py = oy + y * s
    ctx.moveTo(px + hw, py)
    ctx.lineTo(px + hw * 3, py)
    ctx.lineTo(px + hw * 4, py + hh / 2)
    ctx.lineTo(px + hw * 3, py + hh)
    ctx.lineTo(px + hw, py + hh)
    ctx.lineTo(px + 0, py + hh / 2)
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
  }
  const isLight = (document.documentElement.getAttribute('data-theme') || 'dark') !== 'dark'
  const emptyFill = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'
  const nodes = (wrap as any)._hxw?.nodes as Array<{ x: number; y: number; q: number; r: number }>
  if (nodes) nodes.forEach(n => drawHex(n.x, n.y, emptyFill))
  try {
    const canvasEl = document.getElementById('hxwCanvas') as HTMLElement | null
    const cells = Array.from(canvasEl?.querySelectorAll('[data-hxw-cell]') || []) as HTMLElement[]
    cells.forEach((c) => {
      const x = parseFloat((c.getAttribute('data-x') || '0'))
      const y = parseFloat((c.getAttribute('data-y') || '0'))
      const rgb = (c.getAttribute('data-rgb') || '').trim()
      const fill = rgb ? `rgba(${rgb},0.55)` : (isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)')
      drawHex(x, y, fill)
    })
  } catch { }
  ctx.restore()
}

// --- 2D/3D toggle: keep the same world point under the screen center ---
function hxwReadElev(wrap: HTMLElement): number {
  try {
    const v = getComputedStyle(wrap).getPropertyValue('--hxw-elev').trim()
    const n = parseFloat(v.replace('px', ''))
    return isNaN(n) ? 140 : n
  } catch {
    return 140
  }
}

function hxwEffectiveScale(wrap: HTMLElement, st: HexWLayout): number {
  const iso = wrap.classList.contains('hxw-iso')
  const elev = hxwReadElev(wrap)
  const isoFactor = iso ? (140 / Math.max(1, elev)) : 1
  return st.scale * isoFactor
}

function hxwToggleIsoKeepCenter(wrap: HTMLElement, canvas: HTMLElement, st: HexWLayout, toIso: boolean): void {
  const vw = wrap.clientWidth
  const vh = wrap.clientHeight
  // world coords at current screen center using current effective scale
  const effBefore = hxwEffectiveScale(wrap, st)
  const wx = (vw / 2 - st.offsetX) / (effBefore || 1)
  const wy = (vh / 2 - st.offsetY) / (effBefore || 1)
  // toggle class
  wrap.classList.toggle('hxw-iso', toIso)
  // ensure default angles present (can be customized via CSS vars)
  try { if (toIso) { const rs = wrap.style; if (!rs.getPropertyValue('--hxw-rot-x')) rs.setProperty('--hxw-rot-x', '46deg'); if (!rs.getPropertyValue('--hxw-rot-z')) rs.setProperty('--hxw-rot-z', '0deg'); if (!rs.getPropertyValue('--hxw-elev')) rs.setProperty('--hxw-elev', '140px') } } catch {}
  // recompute offsets with base scale so画面中心のワールド点を維持
  const sc = st.scale || 1
  st.offsetX = Math.round(vw / 2 - wx * sc)
  st.offsetY = Math.round(vh / 2 - wy * sc)
  // Clamp offsets using effective size so切替直後に場外へ飛ばないようにする
  try {
    const W = (st.width || 0) * (st.scale || 1)
    const H = (st.height || 0) * (st.scale || 1)
    const iso = wrap.classList.contains('hxw-iso')
    // Widen horizontal margin to allow more side panning
    let mX = 320, mY = 120
    if (iso) {
      const parseDeg = (v: string, d: number) => { const n = parseFloat(v.replace('deg','')); return isNaN(n) ? d : n }
      let rx = 46, rz = -22
      try {
        const cs = getComputedStyle(wrap)
        rx = parseDeg(cs.getPropertyValue('--hxw-rot-x') || '', rx)
        rz = parseDeg(cs.getPropertyValue('--hxw-rot-z') || '', rz)
      } catch {}
      const rxRad = rx * Math.PI / 180
      const rzRad = rz * Math.PI / 180
      const extraX = Math.abs(H * Math.sin(rxRad) * 0.65) + Math.abs(W * Math.sin(rzRad) * 0.25)
      const extraY = Math.abs(H * Math.sin(rxRad) * 0.25) + Math.abs(W * Math.sin(rzRad) * 0.65)
      mX += Math.round(extraX)
      mY += Math.round(extraY)
    }
    const minX = (vw - W) - mX
    const maxX = mX
    const minY = (vh - H) - mY
    const maxY = mY
    if (W + 2 * mX <= vw) st.offsetX = Math.round((vw - W) / 2)
    else st.offsetX = Math.max(minX, Math.min(maxX, st.offsetX))
    if (H + 2 * mY <= vh) st.offsetY = Math.round((vh - H) / 2)
    else st.offsetY = Math.max(minY, Math.min(maxY, st.offsetY))
  } catch {}
  // If content is out of view after mode switch, recentre to the content bounds
  try { hxwEnsureContentInView(wrap, canvas, st) } catch {}
  // set rotation pivot to the world point under screen center AFTER offset adjustment
  try { (wrap as any)._hxwPivot = [ Math.round(st.offsetX + wx * st.scale), Math.round(st.offsetY + wy * st.scale) ] } catch {}
  hxwApplyTransform(wrap, canvas, st)
}

// Adjust elevation while keeping the world point under (clientX, clientY) fixed on screen
function hxwSetElevAt(wrap: HTMLElement, canvas: HTMLElement, st: HexWLayout, clientX: number, clientY: number, nextElevPx: number): void {
  const rect = wrap.getBoundingClientRect()
  const cx = clientX - rect.left
  const cy = clientY - rect.top
  const effBefore = hxwEffectiveScale(wrap, st)
  const wx = (cx - st.offsetX) / (effBefore || 1)
  const wy = (cy - st.offsetY) / (effBefore || 1)
  wrap.style.setProperty('--hxw-elev', `${Math.round(nextElevPx)}px`)
  const effAfter = hxwEffectiveScale(wrap, st)
  st.offsetX = Math.round(cx - wx * (effAfter || 1))
  st.offsetY = Math.round(cy - wy * (effAfter || 1))
  hxwApplyTransform(wrap, canvas, st)
}

// Keep viewport center fixed while changing elevation (3D)
function hxwSetElevCenter(wrap: HTMLElement, canvas: HTMLElement, st: HexWLayout, nextElevPx: number): void {
  const rect = wrap.getBoundingClientRect()
  const cx = rect.left + wrap.clientWidth / 2
  const cy = rect.top + wrap.clientHeight / 2
  hxwSetElevAt(wrap, canvas, st, cx, cy, nextElevPx)
}

function hxwBindInteractions(root: HTMLElement, wrap: HTMLElement, canvas: HTMLElement, st: HexWLayout): void {
  if ((canvas as any)._hxwBound) return
  ; (canvas as any)._hxwBound = true
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
  const Z_MAX = 2.4
  // Allow further zoom-out so the entire field can fit on large screens
  // Use a "contain" scale with a slight margin, and clamp to a sensible floor
  const getMin = () => {
    const contain = Math.min((wrap.clientWidth / (st.width || 1)), (wrap.clientHeight / (st.height || 1)))
    const margin = 0.88 // allow a bit more zoom-out than strict contain
    return Math.max(0.2, contain * margin)
  }
  const enforceBounds = () => {
    const vw = wrap.clientWidth
    const vh = wrap.clientHeight
    // Use base scale for clamping. 3Dの見かけサイズ変化（elev）ではパン制限を厳しくしない
    const W = (st.width || 0) * (st.scale || 1)
    const H = (st.height || 0) * (st.scale || 1)
    if (!isFinite(vw) || !isFinite(vh)) return
    const iso = wrap.classList.contains('hxw-iso')
    // Widen horizontal pan allowance vs vertical
    let mX = 320, mY = 120
    if (iso) {
      // Increase bounds in 3D to compensate perspective skew so右下にも十分に移動できる
      const parseDeg = (v: string, d: number) => { const n = parseFloat(v.replace('deg','')); return isNaN(n) ? d : n }
      let rx = 46, rz = -22
      try {
        const cs = getComputedStyle(wrap)
        rx = parseDeg(cs.getPropertyValue('--hxw-rot-x') || '', rx)
        rz = parseDeg(cs.getPropertyValue('--hxw-rot-z') || '', rz)
      } catch {}
      const rxRad = rx * Math.PI / 180
      const rzRad = rz * Math.PI / 180
      const extraX = Math.abs(H * Math.sin(rxRad) * 0.65) + Math.abs(W * Math.sin(rzRad) * 0.25)
      const extraY = Math.abs(H * Math.sin(rxRad) * 0.25) + Math.abs(W * Math.sin(rzRad) * 0.65)
      mX += Math.round(extraX)
      mY += Math.round(extraY)
    }
    const minX = (vw - W) - mX
    const maxX = mX
    const minY = (vh - H) - mY
    const maxY = mY
    if (W + 2 * mX <= vw) st.offsetX = Math.round((vw - W) / 2)
    else st.offsetX = Math.max(minX, Math.min(maxX, st.offsetX))
    if (H + 2 * mY <= vh) st.offsetY = Math.round((vh - H) / 2)
    else st.offsetY = Math.max(minY, Math.min(maxY, st.offsetY))
  }
  let draggingStage = false, sx = 0, sy = 0, sox = 0, soy = 0, activePid: number | null = null
  let widgetDragging = false
  const DRAG_TOL = 4
  // Selection state (edit mode)
  let selId: string | null = null
  const getInfoEl = () => document.getElementById('hxwInfo') as HTMLElement | null
  const infoShow = (pid: string, id: string) => {
    const panel = getInfoEl(); if (!panel) return
    const body = panel.querySelector('#hxwInfoBody') as HTMLElement | null
    const del = panel.querySelector('#hxwDel') as HTMLButtonElement | null
    const scCtl = panel.querySelector('#hxwScCtl') as HTMLElement | null
    const meta = hxwGetMeta(pid)
    const m = meta[id]
    if (!m) { infoHide(); return }
    const rel = hxwRelFor(pid, id, m.type || 'mock')
    let name = ''
    try { const c = hxwCustomGet(pid, id); name = (c?.name || '') as string } catch {}
    const rows = [
      `<div><span class=\"text-gray-400\">ID:</span> ${id}</div>`,
      `<div><span class=\"text-gray-400\">Type:</span> ${m.type}</div>`,
      name ? `<div><span class=\"text-gray-400\">Name:</span> ${name}</div>` : '',
      `<div><span class=\"text-gray-400\">Anchor:</span> q=${m.q}, r=${m.r}</div>`,
      `<div><span class=\"text-gray-400\">Cells:</span> ${rel.length}</div>`
    ].filter(Boolean).join('')
    if (body) {
      body.innerHTML = rows
      // リンクウィジェット: 編集モードのinfoエリアでURL設定を可能にする
      if ((m.type || '').toLowerCase() === 'links') {
        try {
          const cur = (mdGetLinks(pid, id)[0] || { title: '', url: '' }) as { title: string; url: string }
          const html = `
            <hr class=\"my-2 border-neutral-700\" />
            <div class=\"text-xs text-gray-400 mb-1\">クイックリンク設定</div>
            <div class=\"flex items-center gap-2\">
              <input id=\"hxwLinkTitle\" class=\"flex-1 min-w-[80px] rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100 text-xs\" placeholder=\"タイトル(任意)\" value=\"${(cur.title || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\"/g,'&quot;')}\" />
              <input id=\"hxwLinkUrl\" class=\"flex-[2] min-w-[140px] rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100 text-xs\" placeholder=\"URL (https://...)\" value=\"${(cur.url || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\"/g,'&quot;')}\" />
              <button id=\"hxwLinkSave\" class=\"rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1\">保存</button>
              <button id=\"hxwLinkClear\" class=\"rounded ring-1 ring-neutral-600 hover:bg-neutral-800 text-xs px-3 py-1\">削除</button>
            </div>
            <p id=\"hxwLinkErr\" class=\"mt-1 text-xs text-rose-400 hidden\"></p>`
          body.insertAdjacentHTML('beforeend', html)
          const save = panel.querySelector('#hxwLinkSave') as HTMLButtonElement | null
          const clear = panel.querySelector('#hxwLinkClear') as HTMLButtonElement | null
          const ttl = panel.querySelector('#hxwLinkTitle') as HTMLInputElement | null
          const urlEl = panel.querySelector('#hxwLinkUrl') as HTMLInputElement | null
          const err = panel.querySelector('#hxwLinkErr') as HTMLElement | null
          save?.addEventListener('click', () => {
            try {
              const t = (ttl?.value || '').trim()
              let u = (urlEl?.value || '').trim()
              if (u && !(u.toLowerCase().startsWith('http://') || u.toLowerCase().startsWith('https://'))) u = 'https://' + u
              if (u) { try { new URL(u) } catch { if (err) { err.textContent = 'URLが正しくありません'; err.classList.remove('hidden') }; return } }
              if (!u) { mdSetLinks(pid, id, []); try { refreshDynamicWidgets(root, pid) } catch {}; infoShow(pid, id); return }
              mdSetLinks(pid, id, [{ title: t, url: u }])
              try { refreshDynamicWidgets(root, pid) } catch {}
              infoShow(pid, id)
            } catch {}
          })
          clear?.addEventListener('click', () => { try { mdSetLinks(pid, id, []); refreshDynamicWidgets(root, pid) } catch {}; infoShow(pid, id) })
        } catch {}
      }
    }
    // Shortcuts control (add/remove + optional name)
    if (scCtl) {
      const inSc = scGet(pid).includes(id)
      const curName = (function(){ try { return scNameGet(pid, id) || name || '' } catch { return name || '' } })()
      scCtl.innerHTML = inSc
        ? `<input id="hxwScName" class="flex-1 min-w-[120px] max-w-[60%] rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100 text-xs" placeholder="ショートカット名（任意）" value="${(curName || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\"/g,'&quot;')}" />
            <button id="hxwScSave" class="rounded bg-sky-700 hover:bg-sky-600 text-white text-xs font-medium px-3 py-1">名前を保存</button>
            <button id="hxwScDel" class="rounded ring-1 ring-neutral-600 hover:bg-neutral-800 text-xs px-3 py-1">ショートカットから削除</button>`
        : `<input id="hxwScName" class="flex-1 min-w-[120px] max-w-[60%] rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100 text-xs" placeholder="ショートカット名（任意）" value="${(curName || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\"/g,'&quot;')}" />
            <button id="hxwScAdd" class="rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1">ショートカットに追加</button>`
      const nameInput = panel.querySelector('#hxwScName') as HTMLInputElement | null
      const addBtn = panel.querySelector('#hxwScAdd') as HTMLButtonElement | null
      const delBtn = panel.querySelector('#hxwScDel') as HTMLButtonElement | null
      const saveBtn = panel.querySelector('#hxwScSave') as HTMLButtonElement | null
      addBtn?.addEventListener('click', () => {
        try { scAdd(pid, id); const v = (nameInput?.value || '').trim(); if (v) scNameSet(pid, id, v) } catch {}
        try { hxwRenderShortcuts(root, pid) } catch {}
        try { showMiniToast('ショートカットに追加しました') } catch {}
        // re-render panel UI to reflect new state
        infoShow(pid, id)
      })
      saveBtn?.addEventListener('click', () => {
        try { const v = (nameInput?.value || '').trim(); scNameSet(pid, id, v) } catch {}
        try { hxwRenderShortcuts(root, pid) } catch {}
      })
      delBtn?.addEventListener('click', () => {
        try { scRemove(pid, id) } catch {}
        try { hxwRenderShortcuts(root, pid) } catch {}
        try { showMiniToast('ショートカットを削除しました', { variant: 'danger' }) } catch {}
        infoShow(pid, id)
      })
    }
    if (del) {
      del.classList.remove('hidden')
      del.onclick = () => {
        const ok = confirm('このウィジェットを削除しますか？')
        if (!ok) return
        try { delete meta[id]; hxwSetMeta(pid, meta); try { hxwCustomDelete(pid, id) } catch {} } catch {}
        selId = null; infoHide(); hxwPlaceWidgets(root, pid, st); try { hxwRecolorBackground(root, pid) } catch {} ; try { refreshDynamicWidgets(root, pid) } catch {}; try { hxwRehydrate(root, pid) } catch {}
        try { showMiniToast('ウィジェットを削除しました', { variant: 'danger' }) } catch {}
      }
    }
    panel.classList.remove('hidden')
    // Bind collapse/expand handle once
    if (!(panel as any)._infoBarBound) {
      (panel as any)._infoBarBound = true
      const handle = panel.querySelector('#hxwInfoHandle') as HTMLButtonElement | null
      const cont = panel.querySelector('#hxwInfoPanel') as HTMLElement | null
      // Remember user's intended expanded/collapsed state across auto-hides
      if ((panel as any)._infoWantedCollapsed === undefined) (panel as any)._infoWantedCollapsed = false
      const applyCollapsed = (on: boolean) => {
        try {
          if (!cont || !handle) return
          handle.setAttribute('aria-expanded', on ? 'false' : 'true')
          handle.title = on ? '展開' : 'しまう'
          if (on) {
            // collapse with animation
            const h = cont.scrollHeight
            cont.style.maxHeight = h + 'px' // set current
            // force reflow before collapsing to 0
            void cont.offsetHeight
            cont.style.maxHeight = '0px'
            cont.style.opacity = '0'
            cont.style.transform = 'translateY(8px)'
            cont.style.pointerEvents = 'none'
            panel.setAttribute('data-collapsed', '1')
          } else {
            // expand with animation to measured height
            const target = cont.scrollHeight || 1
            cont.style.maxHeight = target + 'px'
            cont.style.opacity = '1'
            cont.style.transform = 'translateY(0)'
            cont.style.pointerEvents = ''
            panel.removeAttribute('data-collapsed')
          }
        } catch {}
      }
      handle?.addEventListener('click', () => {
        const collapsed = panel.getAttribute('data-collapsed') === '1'
        const next = !collapsed
        ;(panel as any)._infoWantedCollapsed = next
        applyCollapsed(next)
      })
      // default: expanded when first shown (animate from 0)
      try {
        cont!.style.maxHeight = '0px'
        cont!.style.opacity = '0'
        cont!.style.transform = 'translateY(8px)'
        cont!.style.pointerEvents = 'none'
      } catch {}
      requestAnimationFrame(() => {
        // On first show, expand by default and record desired state
        applyCollapsed(false)
        ;(panel as any)._infoWantedCollapsed = false
      })
      ;(panel as any)._infoCollapse = applyCollapsed
      }
    // Restore previous desired expand/collapse state after auto-hide
    try {
      const desired = (panel as any)._infoWantedCollapsed
      const collapse = (panel as any)._infoCollapse as ((on: boolean) => void) | undefined
      if (typeof desired === 'boolean' && collapse) collapse(desired)
    } catch {}
    }
  const infoHide = () => {
    const panel = getInfoEl(); if (!panel) return
    try {
      const collapse = (panel as any)._infoCollapse as (on: boolean) => void | undefined
      if (collapse) {
        // Animate hide by collapsing, but preserve user's intended state
        // The intended state is stored in _infoWantedCollapsed and restored on next show
        collapse(true)
        setTimeout(() => panel.classList.add('hidden'), 300)
      } else panel.classList.add('hidden')
    } catch { panel.classList.add('hidden') }
  }
  const setSelected = (pid: string, id: string | null) => {
    // Clear previous highlight (revert bg effects)
    Array.from(canvas.querySelectorAll('.hxw-widget.hxw-selected')).forEach((el) => {
      (el as HTMLElement).classList.remove('hxw-selected')
      const bg = el.querySelector('.hxw-bg') as HTMLElement | null
      if (bg) { bg.style.filter = ''; bg.style.boxShadow = '' }
    })
    selId = id
    if (id) {
      const host = canvas.querySelector(`.hxw-widget[data-widget="${id}"]`) as HTMLElement | null
      if (host) {
        host.classList.add('hxw-selected')
        const bg = host.querySelector('.hxw-bg') as HTMLElement | null
        if (bg) {
          // Stronger color change: increase saturation/brightness/contrast and slight hue shift
          bg.style.filter = 'saturate(1.85) brightness(1.38) contrast(1.18) hue-rotate(8deg)'
          // Emphasize with brighter outer glow (no outline line)
          bg.style.boxShadow = '0 0 42px rgba(255,200,120,.62)'
        }
      }
      infoShow(pid, id)
    } else {
      infoHide()
    }
  }
  wrap.addEventListener('pointerdown', (e) => {
    if ((wrap as any)._placing) return
    // Do not start background panning when grabbing a widget in edit mode
    const isEdit = canvas.getAttribute('data-edit') === '1'
    const target = e.target as HTMLElement
    if (isEdit && target && target.closest('.hxw-widget')) return
    activePid = e.pointerId
    draggingStage = false
    sx = e.clientX; sy = e.clientY; sox = st.offsetX; soy = st.offsetY
  })
  window.addEventListener('pointerup', (e) => { if (activePid === null || e.pointerId === activePid) { draggingStage = false; activePid = null; sx = 0; sy = 0 } })
  window.addEventListener('pointermove', (e) => {
    if ((wrap as any)._placing) return
    if (widgetDragging) return
    if (activePid === null || e.pointerId !== activePid) return
    if ((e.buttons === 0) && !draggingStage) return
    const dx = e.clientX - sx, dy = e.clientY - sy
    if (!draggingStage && Math.hypot(dx, dy) > DRAG_TOL) {
      draggingStage = true
      try { document.getElementById('hxwScMenu')?.remove() } catch {}
    }
    if (!draggingStage) return
    st.offsetX = sox + dx; st.offsetY = soy + dy; enforceBounds(); hxwApplyTransform(wrap, canvas, st)
  })
  let _menuWheelAccum = 0
  let _menuWheelTimer: any
  wrap.addEventListener('wheel', (e) => {
    if (widgetDragging) return
    // If the wheel event is over a scrollable element inside a widget, allow native scroll
    const t = e.target as HTMLElement
    const isScrollableEl = (el: HTMLElement): boolean => {
      const cs = getComputedStyle(el)
      const canY = (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight
      const canX = (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth
      return canY || canX
    }
    let cur: HTMLElement | null = t
    let overScrollable = false
    while (cur && cur !== wrap) { if (isScrollableEl(cur)) { overScrollable = true; break } cur = cur.parentElement }
    // Only close menu on wheel if we're actually panning/zooming the field (not when scrolling inside a widget)
    if (!e.ctrlKey && overScrollable) return
    const menuOpen = !!document.getElementById('hxwScMenu')
    if (menuOpen) {
      // accumulate wheel delta; close after small threshold so微小スクロールでは維持
      _menuWheelAccum += Math.abs((e as WheelEvent).deltaX || 0) + Math.abs((e as WheelEvent).deltaY || 0)
      clearTimeout(_menuWheelTimer as any)
      _menuWheelTimer = setTimeout(() => { _menuWheelAccum = 0 }, 180)
      if (_menuWheelAccum > 60) { try { document.getElementById('hxwScMenu')?.remove() } catch {}; _menuWheelAccum = 0 }
    }
    const zoomAt = (clientX: number, clientY: number, nextScale: number) => {
      const iso = wrap.classList.contains('hxw-iso')
      const ns = clamp(nextScale, getMin(), Z_MAX)
      if (iso) { st.scale = ns; enforceBounds(); hxwApplyTransform(wrap, canvas, st); return }
      const rect = wrap.getBoundingClientRect()
      const prev = st.scale
      const cx = clientX - rect.left
      const cy = clientY - rect.top
      const wx = (cx - st.offsetX) / prev
      const wy = (cy - st.offsetY) / prev
      st.scale = ns
      st.offsetX = cx - wx * ns
      st.offsetY = cy - wy * ns
      enforceBounds(); hxwApplyTransform(wrap, canvas, st)
    }
    const getPxVar = (name: string, def: number): number => {
      try {
        const v = getComputedStyle(wrap).getPropertyValue(name).trim()
        const n = parseFloat(v.replace('px',''))
        return isNaN(n) ? def : n
      } catch { return def }
    }
    const setElev = (px: number) => wrap.style.setProperty('--hxw-elev', `${Math.round(px)}px`)
    const E_MIN = 60, E_MAX = 5000
    if (e.ctrlKey) {
      e.preventDefault()
      const iso = wrap.classList.contains('hxw-iso')
      // Much higher sensitivity; 3D > 2D. In 3D invert direction (pinch out -> closer)
      const ds2d = Math.exp(-e.deltaY * 0.0055)
      const ds3d = Math.exp(e.deltaY * 0.0100)
      if (iso) {
        const cur = getPxVar('--hxw-elev', 140)
        const next = Math.max(E_MIN, Math.min(E_MAX, cur * ds3d))
        setElev(next); hxwApplyTransform(wrap, canvas, st)
      } else {
        const prev = st.scale
        zoomAt(e.clientX, e.clientY, prev * ds2d)
      }
    } else {
      e.preventDefault()
      const inv = (wrap.getAttribute('data-scroll-dir') === 'invert') ? -1 : 1
      st.offsetX -= e.deltaX * inv
      st.offsetY -= e.deltaY * inv
      enforceBounds(); hxwApplyTransform(wrap, canvas, st)
    }
    // 配置モード中はスクロール後にゴーストを再計算
    try { const rf = (wrap as any)._placeRefresh as (()=>void)|undefined; if (rf) rf() } catch {}
  }, { passive: false })
  // pinch zoom
  const pts = new Map<number, { x: number; y: number }>()
  const dist = () => { const a = Array.from(pts.values()); if (a.length < 2) return 0; const dx = a[0].x - a[1].x, dy = a[0].y - a[1].y; return Math.hypot(dx, dy) }
  let startDist = 0, startScale = st.scale
  wrap.addEventListener('pointerdown', (e) => { if ((wrap as any)._placing) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }) })
  wrap.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pts.size === 2) {
      const d = dist()
      if (startDist === 0) { startDist = d; startScale = st.scale }
      if (d > 0 && startDist > 0) {
        const ratio = d / startDist
        const iso = wrap.classList.contains('hxw-iso')
        const s = iso ? Math.pow(ratio, -2.7) : Math.pow(ratio, 1.9) // 3D inverted (out -> closer), 2D higher sensitivity
        if (iso) {
          const cur = (function(){ try { const v = getComputedStyle(wrap).getPropertyValue('--hxw-elev').trim(); const n = parseFloat(v.replace('px','')); return isNaN(n) ? 140 : n } catch { return 140 } })()
          const next = Math.max(60, Math.min(E_MAX, cur * s))
          wrap.style.setProperty('--hxw-elev', `${Math.round(next)}px`)
          hxwApplyTransform(wrap, canvas, st)
        } else {
          const a = Array.from(pts.values())
          const midX = (a[0].x + a[1].x) / 2
          const midY = (a[0].y + a[1].y) / 2
          const ns = clamp(startScale * s, getMin(), Z_MAX)
          const rect = wrap.getBoundingClientRect()
          const cx = midX - rect.left
          const cy = midY - rect.top
          const wx = (cx - st.offsetX) / st.scale
          const wy = (cy - st.offsetY) / st.scale
          st.scale = ns
          st.offsetX = cx - wx * ns
          st.offsetY = cy - wy * ns
          enforceBounds(); hxwApplyTransform(wrap, canvas, st)
        }
      }
    }
  })
  window.addEventListener('pointerup', (e) => { pts.delete(e.pointerId); if (pts.size < 2) startDist = 0 })

  // Edit mode drag of widgets with ghost preview
  let editOn = false
  const setEdit = (on: boolean) => {
    editOn = on
    canvas.setAttribute('data-edit', on ? '1' : '0')
    // Toggle capacity bar and add (FAB) visibility with edit mode
    try { (root.querySelector('#hxwCap') as HTMLElement | null)?.classList.toggle('hidden', !on) } catch {}
    try { const fab = root.querySelector('#hxwFab') as HTMLElement | null; if (fab) fab.style.display = on ? '' : 'none' } catch {}
    const btn = root.querySelector('#wgEditToggle') as HTMLElement | null
    if (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false')
      btn.setAttribute('title', on ? '編集中' : '編集モード')
      const lab = btn.querySelector('.ctl-label') as HTMLElement | null
      if (lab) lab.textContent = on ? '編集中' : '編集'
    }
    try {
      const pid = canvas.getAttribute('data-pid') || '0'
      hxwPlaceWidgets(root, pid, st)
      hxwApplyTransform(wrap, canvas, st)
      // Re-render widgets that depend on local data (e.g., Task Summary)
      try { refreshDynamicWidgets(root, pid) } catch {}
      // Rehydrate dynamic contents (e.g., committers slots) after layout rebuild
      try { hxwRehydrate(root, pid) } catch { }
    } catch {}
    // Disable inner content interactions while editing (buttons/links/forms inside widgets)
    try {
      canvas.querySelectorAll('.hxw-widget .wg-content, .hxw-widget .hxw-body, .hxw-widget .slot-inner, .hxw-widget .hxw-cells').forEach((el) => {
        (el as HTMLElement).style.pointerEvents = on ? 'none' : ''
      })
    } catch {}
    // Route pointer events in edit mode so only hex body (.hxw-bg) receives clicks (precise hit testing)
    try {
      Array.from(canvas.querySelectorAll('.hxw-widget')).forEach((el) => {
        const host = el as HTMLElement
        const bg = host.querySelector('.hxw-bg') as HTMLElement | null
        if (on) {
          host.style.pointerEvents = 'none'
          if (bg) bg.style.pointerEvents = 'auto'
        } else {
          host.style.pointerEvents = ''
          if (bg) bg.style.pointerEvents = ''
        }
      })
    } catch {}
    // Clear selection and hide info when leaving edit mode
    if (!on) { selId = null; try { setSelected(canvas.getAttribute('data-pid') || '0', null) } catch {} }
    // toggle edit-only elements inside hex widgets
    // ただし、links/cal のフォームはハニカムでは常に非表示（ポップで編集）
    try {
      canvas.querySelectorAll('.edit-only').forEach((el) => {
        const w = (el as HTMLElement).closest('.hxw-widget') as HTMLElement | null
        const t = (w?.getAttribute('data-type') || '').toLowerCase()
        if (t === 'links' || t === 'calendar' || t === 'custom' || t === 'flow') { (el as HTMLElement).classList.add('hidden'); return }
        (el as HTMLElement).classList.toggle('hidden', !on)
      })
    } catch {}
    // (Shortcut icons removed; use contextual menu instead)
  }
  ; (canvas as any)._setEdit = setEdit

  // In edit mode, handle selection on capture-click.
  // - Click inside any widget: select and show info (stop propagation so it isn't cleared elsewhere)
  // - Click outside: allow event to bubble to wrap's handler which clears selection
  canvas.addEventListener('click', (e) => {
    if (!editOn) return
    const host = (e.target as HTMLElement).closest('.hxw-widget') as HTMLElement | null
    if (host) {
      const pidCur = canvas.getAttribute('data-pid') || '0'
      const id = host.getAttribute('data-widget') || ''
      if (id) setSelected(pidCur, id)
      e.stopPropagation(); e.preventDefault()
    }
  }, true)

  const stepX = () => Math.round((st.tile || 200) * 0.75)
  const stepY = () => Math.round((st.tile || 200) * 0.866)

  const toCanvasXY = (clientX: number, clientY: number): { x: number; y: number } => {
    const rect = wrap.getBoundingClientRect()
    const x = (clientX - rect.left - st.offsetX) / st.scale
    const y = (clientY - rect.top - st.offsetY) / st.scale
    return { x, y }
  }
  const toCell = (cx: number, cy: number): { q: number; r: number } => {
    const sx = stepX(), sy = stepY()
    const q = Math.round(cx / sx)
    const r = Math.round(cy / sy - (q % 2 ? 0.5 : 0))
    return { q, r }
  }
  // Capture phase: suppress browser default menu but let our handler run
  wrap.addEventListener('contextmenu', (e) => {
    const t = e.target as HTMLElement
    if (!t.closest('.hxw-widget')) return
    // Only prevent default; allow event to propagate so our canvas handler can open the menu
    e.preventDefault()
  }, true)
  const canPlace = (cells: Array<{ q: number; r: number }>, ignore: Set<string>): boolean => {
    const mask: Set<string> = (wrap as any)._hxwMask || new Set<string>()
    const inBounds = (q: number, r: number) => mask.size ? mask.has(`${q},${r}`) : (q >= 0 && r >= 0 && q < ((wrap as any)._hxwCols || 0) && r < ((wrap as any)._hxwRows || 0))
    for (const c of cells) {
      if (!inBounds(c.q, c.r)) return false
      const k = `${c.q},${c.r}`
      if (!ignore.has(k) && (wrap as any)._hxwOcc?.has(k)) return false
    }
    return true
  }
  const ensureGhost = (): HTMLElement => {
    let g = document.getElementById('hxwGhost') as HTMLElement | null
    if (g) return g
    g = document.createElement('div')
    g.id = 'hxwGhost'
    g.className = 'hxw-ghost'
    g.style.position = 'absolute'
    g.style.left = '0px'
    g.style.top = '0px'
    g.style.pointerEvents = 'none'
    canvas.appendChild(g)
    return g
  }
  const drawGhost = (g: HTMLElement, cells: Array<{ x: number; y: number }>, fill = 'rgba(251,191,36,0.28)', stroke = 'rgba(251,191,36,0.85)') => {
    g.innerHTML = ''
    const W = st.tile, H = Math.round((st.tile) * 0.866)
    for (const c of cells) {
      const hex = document.createElement('div')
      hex.className = 'hxw-hex'
      hex.style.left = `${c.x}px`
      hex.style.top = `${c.y}px`
      hex.style.width = `${W}px`
      hex.style.height = `${H}px`
      const clip = document.createElement('div')
      clip.className = 'hxw-clip'
      clip.style.background = fill
      clip.style.border = `2px dashed ${stroke}`
      hex.appendChild(clip)
      g.appendChild(hex)
    }
    g.style.display = 'block'
  }
  const hideGhost = () => { const g = document.getElementById('hxwGhost') as HTMLElement | null; if (g) g.style.display = 'none' }

  let draggingWid: HTMLElement | null = null
  let dragId = ''
  let startCells = new Set<string>()
  // drag state for widgets
  let wStartX = 0, wStartY = 0
  let didDrag = false
  let grabQ = 0, grabR = 0
  let startAnchorQ = 0, startAnchorR = 0
  canvas.addEventListener('pointerdown', (e) => {
    const el = (e.target as HTMLElement).closest('.hxw-widget') as HTMLElement | null
    if (!el) return
    // In edit mode, allow selection when clicking background hex OR
    // over the cells/content layer as long as it's not an interactive control
    if (editOn) {
      const t = e.target as HTMLElement
      let allow = false
      const bg = t.closest('.hxw-bg') as HTMLElement | null
      if (bg && el.contains(bg)) allow = true
      if (!allow) {
        const overCells = t.closest('.hxw-cells') as HTMLElement | null
        const overContent = t.closest('.wg-content') as HTMLElement | null
        const interactive = t.closest('input, textarea, select, button, a, [contenteditable], .lnk-form, .cal-form, .lnk-hex-add, .cal-hex-add') as HTMLElement | null
        if ((overCells || overContent) && !interactive) allow = true
      }
      if (!allow) return
      e.preventDefault(); e.stopPropagation()
      const pidCur = canvas.getAttribute('data-pid') || '0'
      const id = el.getAttribute('data-widget') || ''
      if (id) setSelected(pidCur, id)
    }
    if (!editOn) return
    // Avoid starting drag from interactive controls
    const t = e.target as HTMLElement
    if (t.closest('input, textarea, select, button, a, [contenteditable], .lnk-form, .cal-form')) return
    e.preventDefault(); e.stopPropagation()
    draggingWid = el
    dragId = el.getAttribute('data-widget') || ''
    widgetDragging = true
    try { (el as HTMLElement).style.zIndex = '4'; (el as HTMLElement).style.cursor = 'grabbing' } catch {}
    // remember current occupied cells for self-ignore
    startCells = new Set<string>()
    Array.from(el.querySelectorAll('[data-hxw-cell]')).forEach((n) => {
      startCells.add((n as HTMLElement).getAttribute('data-kr') || '')
    })
    // set grab references to keep relative offset while dragging
    wStartX = (e as PointerEvent).clientX; wStartY = (e as PointerEvent).clientY; didDrag = false
    const { x, y } = toCanvasXY((e as PointerEvent).clientX, (e as PointerEvent).clientY)
    const cell = toCell(x, y); grabQ = cell.q; grabR = cell.r
    try {
      const pid = canvas.getAttribute('data-pid') || '0'
      const meta = hxwGetMeta(pid)
      const cur = meta[dragId]
      if (cur) { startAnchorQ = cur.q; startAnchorR = cur.r }
      else { startAnchorQ = grabQ; startAnchorR = grabR }
    } catch { startAnchorQ = grabQ; startAnchorR = grabR }
    try { (e as PointerEvent).pointerId && el.setPointerCapture((e as PointerEvent).pointerId) } catch {}
  })
  canvas.addEventListener('pointermove', (e) => {
    if (!draggingWid || !editOn) return
    const dx = Math.abs(e.clientX - wStartX), dy = Math.abs(e.clientY - wStartY)
    const moveEnough = Math.hypot(dx, dy) > DRAG_TOL
    if (!didDrag && !moveEnough) return
    didDrag = true
    const { x, y } = toCanvasXY(e.clientX, e.clientY)
    const at = toCell(x, y)
    // keep relative offset from the grabbed cell to the widget's anchor
    const dq = grabQ - startAnchorQ
    const dr = grabR - startAnchorR
    const q = at.q - dq
    const r = at.r - dr
    const shape = (function(){ const id = draggingWid.getAttribute('data-widget') || ''; const t = draggingWid.getAttribute('data-type') || 'mock'; const pid2 = canvas.getAttribute('data-pid') || '0'; return hxwRelFor(pid2, id, t) })()
    const sx = stepX(), sy = stepY()
    const anc = oddqToAxial(q, r)
    const relCells = shape.map(([ax, az]) => axialToOddq(anc.x + ax, anc.z + az))
    const ignore = new Set<string>(startCells)
    const ok = canPlace(relCells, ignore)
    const g = ensureGhost()
    const pxCells = relCells.map(c => ({ x: c.q * sx, y: Math.round((c.r + (c.q % 2 ? 0.5 : 0)) * sy) }))
    const fill = ok ? 'rgba(251,191,36,0.28)' : 'rgba(244,63,94,0.28)'
    const stroke = ok ? 'rgba(251,191,36,0.85)' : 'rgba(244,63,94,0.85)'
    drawGhost(g, pxCells, fill, stroke)
  })
  canvas.addEventListener('pointerup', (e) => {
    if (!draggingWid || !editOn) return
    const el = draggingWid
    draggingWid = null
    widgetDragging = false
    try { (el as HTMLElement).style.zIndex = ''; (el as HTMLElement).style.cursor = '' } catch {}
    if (!didDrag) { hideGhost(); return }
    const { x, y } = toCanvasXY(e.clientX, e.clientY)
    const at = toCell(x, y)
    const dq = grabQ - startAnchorQ
    const dr = grabR - startAnchorR
    const q = at.q - dq
    const r = at.r - dr
    const type = el.getAttribute('data-type') || 'mock'
    const shape = (function(){ const id = el.getAttribute('data-widget') || ''; const pid2 = canvas.getAttribute('data-pid') || '0'; return hxwRelFor(pid2, id, type) })()
    const sx = stepX(), sy = stepY()
    const anc = oddqToAxial(q, r)
    const relCells = shape.map(([ax, az]) => axialToOddq(anc.x + ax, anc.z + az))
    const ignore = new Set<string>(startCells)
    // If dropped outside field mask, delete the widget
    const mask: Set<string> = (wrap as any)._hxwMask || new Set<string>()
    const inBounds = (cq: number, cr: number) => mask.size ? mask.has(`${cq},${cr}`) : (cq >= 0 && cr >= 0 && cq < ((wrap as any)._hxwCols || 0) && cr < ((wrap as any)._hxwRows || 0))
    const outside = relCells.some(c => !inBounds(c.q, c.r))
    const pid = (canvas.getAttribute('data-pid') || '0')
    const meta = hxwGetMeta(pid)
    if (outside) {
      try { delete meta[dragId] } catch {}
      try { hxwCustomDelete(pid, dragId) } catch {}
      try { hxwSetMeta(pid, meta) } catch {}
      // If the deleted widget was selected, clear selection and close info
      try { if (selId && selId === dragId) setSelected(pid, null) } catch {}
      hxwPlaceWidgets(root, pid, st)
      try { hxwRecolorBackground(root, pid) } catch {}
      try { hxwSyncEditPointerEvents(root) } catch {}
      try { refreshDynamicWidgets(root, pid) } catch {}
      try { hxwRehydrate(root, pid) } catch { }
      try { showMiniToast('ウィジェットを削除しました', { variant: 'danger' }) } catch {}
      hideGhost(); didDrag = false; return
    }
    // If cannot place due to collisions, cancel (do not delete)
    if (!canPlace(relCells, ignore)) { hideGhost(); return }
    // update meta
    meta[dragId] = { type, q, r }
    hxwSetMeta(pid, meta)
    // rebuild occupancy and reposition element
    hxwPlaceWidgets(root, pid, st)
    try { hxwRecolorBackground(root, pid) } catch {}
    try { hxwSyncEditPointerEvents(root) } catch {}
    try { refreshDynamicWidgets(root, pid) } catch {}
    try { hxwRehydrate(root, pid) } catch { }
    hideGhost()
    didDrag = false
  })
  window.addEventListener('resize', () => hxwApplyTransform(wrap, canvas, st))
  // Click on empty area clears selection in edit mode
  wrap.addEventListener('click', (e) => {
    if (!editOn) return
    const t = e.target as HTMLElement
    if (!t.closest('.hxw-widget')) { setSelected(canvas.getAttribute('data-pid') || '0', null) }
  })

  // Delegated clicks for widgets inside hex field (links/calendar forms/custom/flow runner)
  canvas.addEventListener('click', (e) => {
    const host = (e.target as HTMLElement).closest('.hxw-widget') as HTMLElement | null
    if (!host) return
    const type = (host.getAttribute('data-type') || '').toLowerCase()
    // Make custom/flow act as a big button; do nothing else.
    if (type === 'custom' || type === 'flow') {
      // In edit mode, clicking should not invoke
      if (canvas.getAttribute('data-edit') === '1') return
      // Only react when clicking inside the hex area (bg layer)
      const inBg = (e.target as HTMLElement).closest('.hxw-bg') as HTMLElement | null
      if (!inBg || !host.contains(inBg)) return
      e.stopPropagation()
      // Prefer running flow via existing button if present; then show a simple result modal
      if (type === 'flow') {
        const btn = host.querySelector('.flow-run') as HTMLButtonElement | null
        if (btn) { try { btn.click() } catch {} }
        const pid2 = canvas.getAttribute('data-pid') || '0'
        const wid = host.getAttribute('data-widget') || ''
        try { openWidgetRunModal(root, pid2, wid, 'flow') } catch {}
      } else {
        const pid2 = canvas.getAttribute('data-pid') || '0'
        const wid = host.getAttribute('data-widget') || ''
        const name = (function(){ try { const c = hxwCustomGet(pid2, wid); return (c?.name || scNameGet(pid2, wid) || '') } catch { return '' } })()
        try { openWidgetRunModal(root, pid2, wid, 'custom', name) } catch {}
      }
    }
  })
  canvas.addEventListener('contextmenu', (e) => {
    const hostHx = (e.target as HTMLElement).closest('.hxw-widget') as HTMLElement | null
    if (!hostHx) return
    // Disable context menu for custom/flow (non-editable)
    try { const t = (hostHx.getAttribute('data-type') || '').toLowerCase(); if (t === 'custom' || t === 'flow') return } catch {}
    try { (e as any).stopImmediatePropagation?.() } catch {}
    e.preventDefault(); e.stopPropagation()
    const pid2 = canvas.getAttribute('data-pid') || '0'
    const wid = hostHx.getAttribute('data-widget') || ''
    const on = scGet(pid2).includes(wid)
    document.getElementById('hxwScMenu')?.remove()
    const menu = document.createElement('div')
    menu.id = 'hxwScMenu'
    menu.className = 'fixed z-[70] rounded-md bg-neutral-900 ring-2 ring-neutral-600 shadow-lg p-2 text-sm text-gray-200'
    if (!on) {
      menu.innerHTML = `<div class=\"space-y-2\">\n        <input id=\"sc-name\" class=\"w-52 rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100\" placeholder=\"ショートカット名（任意）\" />\n        <div class=\"flex gap-2 justify-end\">\n          <button id=\"sc-add\" class=\"px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white\">追加</button>\n          <button id=\"sc-cancel\" class=\"px-3 py-1 rounded ring-1 ring-neutral-600 hover:bg-neutral-800\">キャンセル</button>\n        </div>\n      </div>`
    } else {
      menu.innerHTML = `<div class=\"p-1\"><button id=\"sc-del\" class=\"w-full text-left px-3 py-1.5 hover:bg-neutral-800 rounded\">ショートカットから削除</button></div>`
    }
    document.body.appendChild(menu)
    const x = (e as MouseEvent).clientX, y = (e as MouseEvent).clientY
    const w = menu.offsetWidth || 150, h = menu.offsetHeight || 38
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, x + 6))
    const top = Math.max(8, Math.min(window.innerHeight - h - 8, y + 6))
    menu.style.left = `${left}px`
    menu.style.top = `${top}px`
    const startX = x, startY = y
    const close = () => {
      try { document.removeEventListener('click', onDoc) } catch {}
      try { window.removeEventListener('mousemove', onMove) } catch {}
      try { window.removeEventListener('scroll', onScr, true) } catch {}
      try { window.removeEventListener('keydown', onKey) } catch {}
      menu.remove()
    }
    const onDoc = (ev: MouseEvent) => { if (!menu.contains(ev.target as Node)) close() }
    const onMove = (ev: MouseEvent) => {
      const r = menu.getBoundingClientRect(); const m = 12
      const inside = ev.clientX >= r.left - m && ev.clientX <= r.right + m && ev.clientY >= r.top - m && ev.clientY <= r.bottom + m
      if (!inside) close()
    }
    const onScr = () => {
      const sx = (window.pageXOffset || document.documentElement.scrollLeft || 0)
      const sy = (window.pageYOffset || document.documentElement.scrollTop || 0)
      if (Math.abs(sx - startSX) + Math.abs(sy - startSY) > 24) close()
    }
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') close() }
    setTimeout(() => {
      document.addEventListener('click', onDoc)
      window.addEventListener('mousemove', onMove)
      window.addEventListener('scroll', onScr, true)
      window.addEventListener('keydown', onKey)
    }, 0)
    // Actions
    const addBtn = menu.querySelector('#sc-add') as HTMLElement | null
    const cancelBtn = menu.querySelector('#sc-cancel') as HTMLElement | null
    const delBtn = menu.querySelector('#sc-del') as HTMLElement | null
    const nameInput = menu.querySelector('#sc-name') as HTMLInputElement | null
    addBtn?.addEventListener('click', () => {
      const name = (nameInput?.value || '').trim()
      scAdd(pid2, wid)
      if (name) scNameSet(pid2, wid, name)
      try { hxwRenderShortcuts(root, pid2) } catch {}
      try { showMiniToast('ショートカットに追加しました') } catch {}
      close()
    })
    cancelBtn?.addEventListener('click', close)
    delBtn?.addEventListener('click', () => { scRemove(pid2, wid); try { hxwRenderShortcuts(root, pid2) } catch {}; try { showMiniToast('ショートカットを削除しました', { variant: 'danger' }) } catch {}; close() })
    nameInput?.focus()
  })
  canvas.addEventListener('click', (e) => {
    const pid = canvas.getAttribute('data-pid') || '0'
    const pickW = (el: HTMLElement | null): HTMLElement | null => (el?.closest('.widget') as HTMLElement | null)
    // Whole-widget button in hex: open README/Markdown in view mode
    try {
      const edit = canvas.getAttribute('data-edit') === '1'
      if (!edit) {
        let host = (e.target as HTMLElement).closest('.hxw-widget') as HTMLElement | null
        if (!host) {
          try {
            const els = (document.elementsFromPoint(e.clientX, e.clientY) as HTMLElement[])
            for (const el of els) { const h = (el as HTMLElement).closest?.('.hxw-widget') as HTMLElement | null; if (h) { host = h; break } }
          } catch {}
        }
        if (host) {
          const type = (host.getAttribute('data-type') || '').toLowerCase()
          if (type === 'readme') { e.stopPropagation(); openReadmeModal(root); return }
          if (type === 'markdown') { const id = host.getAttribute('data-widget') || ''; e.stopPropagation(); openMarkdownModal(root, pid, id); return }
        }
      }
    } catch {}
    // Links add
    const add = (e.target as HTMLElement).closest('.lnk-add') as HTMLElement | null
    if (add) {
      const w = pickW(add); if (!w) return
      const form = w.querySelector('.lnk-form') as HTMLElement | null
      if (form) {
        form.classList.toggle('hidden')
        if (!form.classList.contains('hidden')) {
          const t = form.querySelector('.lnk-title') as HTMLInputElement | null
          const u = form.querySelector('.lnk-url') as HTMLInputElement | null
          const err = form.querySelector('.lnk-error') as HTMLElement | null
          if (t) t.value = ''
          if (u) u.value = ''
          if (err) { err.textContent = ''; err.classList.add('hidden') }
          u?.focus()
        }
      }
      return
    }
    // Links save
    const save = (e.target as HTMLElement).closest('.lnk-save') as HTMLElement | null
    if (save) {
      const w = pickW(save); if (!w) return
      const id = w.getAttribute('data-widget') || ''
      const form = w.querySelector('.lnk-form') as HTMLElement | null
      const titleEl = form?.querySelector('.lnk-title') as HTMLInputElement | null
      const urlEl = form?.querySelector('.lnk-url') as HTMLInputElement | null
      const err = form?.querySelector('.lnk-error') as HTMLElement | null
      const title = (titleEl?.value || '').trim()
      let url = (urlEl?.value || '').trim()
      if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`
      if (url) {
        try { new URL(url) } catch { if (err) { err.textContent = 'URLが正しくありません'; err.classList.remove('hidden') }; return }
      }
      if (!url) { mdSetLinks(pid, id, []); try { refreshDynamicWidgets(root, pid) } catch {}; return }
      mdSetLinks(pid, id, [{ title, url }])
      try { refreshDynamicWidgets(root, pid) } catch {}
      return
    }
    // Links cancel
    const cancel = (e.target as HTMLElement).closest('.lnk-cancel') as HTMLElement | null
    if (cancel) { const w = pickW(cancel); if (!w) return; const form = w.querySelector('.lnk-form') as HTMLElement | null; if (form) form.classList.add('hidden'); return }
    // Links delete
    const del = (e.target as HTMLElement).closest('.lnk-del') as HTMLElement | null
    if (del) { const w = pickW(del); if (!w) return; const id = w.getAttribute('data-widget') || ''; mdSetLinks(pid, id, []); try { refreshDynamicWidgets(root, pid) } catch {}; return }

    // Calendar add
    const calAdd = (e.target as HTMLElement).closest('.cal-add') as HTMLElement | null
    if (calAdd) {
      const w = pickW(calAdd); if (!w) return
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
    // Calendar save
    const calSave = (e.target as HTMLElement).closest('.cal-save') as HTMLElement | null
    if (calSave) {
      const w = pickW(calSave); if (!w) return
      const id = w.getAttribute('data-widget') || ''
      const form = w.querySelector('.cal-form') as HTMLElement | null
      const urlEl = form?.querySelector('.cal-url') as HTMLInputElement | null
      const err = form?.querySelector('.cal-error') as HTMLElement | null
      let url = (urlEl?.value || '').trim()
      if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`
      if (url) { try { new URL(url) } catch { if (err) { err.textContent = 'URLが正しくありません'; err.classList.remove('hidden') }; return } }
      if (!url) { calSet(pid, id, ''); try { refreshDynamicWidgets(root, pid) } catch {}; return }
      calSet(pid, id, url)
      try { refreshDynamicWidgets(root, pid) } catch {}
      return
    }
    const calCancel = (e.target as HTMLElement).closest('.cal-cancel') as HTMLElement | null
    if (calCancel) { const w = pickW(calCancel); if (!w) return; const form = w.querySelector('.cal-form') as HTMLElement | null; if (form) form.classList.add('hidden'); return }
    // README / Markdown popup buttons inside hex slots
    // README/Markdown buttons inside hex slots have direct handlers; no global handling here
  })
  // (single handler above handles contextmenu always)
}

function hxwPlaceWidgets(root: HTMLElement, pid: string, st: HexWLayout): void {
  const wrap = root.querySelector('#hxwWrap') as HTMLElement | null
  const canvas = root.querySelector('#hxwCanvas') as HTMLElement | null
  if (!wrap || !canvas) return
  // Background cells are built by renderHexWidgets using the hex mask; do not auto-seed a rectangle here.
  const meta = hxwGetMeta(pid)
  const sx = Math.round((st.tile) * 0.75)
  const sy = Math.round((st.tile) * 0.866)
  const occ = new Set<string>()
  ;(wrap as any)._hxwOcc = occ
  const existing = new Map<string, HTMLElement>()
  Array.from(canvas.querySelectorAll('.hxw-widget[data-widget]')).forEach((el) => {
    existing.set((el as HTMLElement).getAttribute('data-widget') || '', el as HTMLElement)
  })
  const upsertOne = (id: string, type: string, q: number, r: number) => {
    const relAx = hxwRelFor(pid, id, type)
    const anc = oddqToAxial(q, r)
    const cells = relAx.map(([ax, az]) => axialToOddq(anc.x + ax, anc.z + az))
    cells.forEach(c => occ.add(`${c.q},${c.r}`))
    const tileW = st.tile, tileH = Math.round(st.tile * 0.866)
    const pxCells = cells.map(c => ({ x: c.q * sx, y: Math.round((c.r + (c.q % 2 ? 0.5 : 0)) * sy) }))
    const minX = Math.min(...pxCells.map(c => c.x))
    const minY = Math.min(...pxCells.map(c => c.y))
    const maxX = Math.max(...pxCells.map(c => c.x))
    const maxY = Math.max(...pxCells.map(c => c.y))
    const boxW = (maxX - minX) + tileW
    const boxH = (maxY - minY) + tileH
    let host = existing.get(id)
    if (!host) {
      host = document.createElement('div')
      host.className = 'hxw-widget'
      host.setAttribute('data-widget', id)
      host.setAttribute('data-type', type)
      host.setAttribute('data-hex-native', '1')
      canvas.appendChild(host)
      // ensure a hidden body exists so that downstream clipping/background setup works
      const bodyInit = document.createElement('div')
      bodyInit.className = 'hxw-body'
      // Show the widget body by default so content renders as a normal card
      bodyInit.style.left = '0px'
      bodyInit.style.top = '0px'
      bodyInit.style.width = `${boxW}px`
      bodyInit.style.height = `${boxH}px`
      // mount widget skeleton markup so hydrators can find expected nodes
      const inner = widgetShell(id, widgetTitle(type), buildWidgetBody(type))
      bodyInit.innerHTML = inner
      host.appendChild(bodyInit)
    } else {
      existing.delete(id)
    }
    host!.style.left = `${minX}px`
    host!.style.top = `${minY}px`
    host!.style.width = `${boxW}px`
    host!.style.height = `${boxH}px`
    host!.setAttribute('data-left', String(minX))
    host!.setAttribute('data-top', String(minY))
    host!.setAttribute('data-w', String(boxW))
    host!.setAttribute('data-h', String(boxH))
    // prepare empty background layer; actual fill and clipping applied after clipPath is ready
    // also prune any previous cell markers to avoid stale coloring
    Array.from(host!.querySelectorAll('.hxw-bg')).forEach(n => n.remove())
    Array.from(host!.querySelectorAll('.hxw-hex.hxw-filled')).forEach(n => (n as HTMLElement).remove())
    const bg = document.createElement('div')
    bg.className = 'hxw-bg'
    host!.appendChild(bg)
    relAx.forEach(([ax, az]) => {
      const pos = axialToOddq(anc.x + ax, anc.z + az)
      const cq = pos.q, cr = pos.r
      const x = cq * sx
      const y = Math.round((cr + (cq % 2 ? 0.5 : 0)) * sy)
      const hex = document.createElement('div')
      hex.className = 'hxw-hex hxw-filled'
      hex.style.left = `${x - minX}px`
      hex.style.top = `${y - minY}px`
      hex.style.width = `${tileW}px`
      hex.style.height = `${tileH}px`
      hex.setAttribute('data-hxw-cell', '1')
      hex.setAttribute('data-kr', `${cq},${cr}`)
      // absolute canvas coordinates for minimap rendering
      hex.setAttribute('data-x', String(x))
      hex.setAttribute('data-y', String(y))
      // Keep as hidden markers so drag logic can ignore self-occupancy
      hex.style.display = 'none'
      host!.appendChild(hex)
    })

    // Apply clipping to the union of hex cells via global SVG defs
    const body = host!.querySelector('.hxw-body') as HTMLElement | null
    if (body) {
      // Ensure the body is visible (previously hidden for slot-only mode)
      body.style.display = ''
      // Keep a safe inset so rectangular content sits within the hex union
      const padX = Math.max(8, Math.round(Math.min(st.tile * 0.24, boxW * 0.14)))
      const padY = Math.max(6, Math.round(Math.min(st.tile * 0.18, boxH * 0.14)))
      body.style.padding = `${padY}px ${padX}px`
      body.style.boxSizing = 'border-box'
      const cid = `hxwcp-${(pid || '').replace(/[^a-zA-Z0-9_-]/g, '')}-${(id || '').replace(/[^a-zA-Z0-9_-]/g, '')}`
      const defs = hxwEnsureDefs()
      let clip = defs.querySelector(`#${cid}`) as SVGClipPathElement | null
      if (!clip) {
        clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath') as any
        clip.setAttribute('id', cid)
        clip.setAttribute('clipPathUnits', 'objectBoundingBox')
        defs.appendChild(clip)
      }
      // rebuild polygons normalized to 0..1
      Array.from(clip.childNodes).forEach(n => clip!.removeChild(n))
      const norm = (vx: number, vy: number) => `${(vx / boxW).toFixed(6)},${(vy / boxH).toFixed(6)}`
      relAx.forEach(([ax, az]) => {
        const pos = axialToOddq(anc.x + ax, anc.z + az)
        const cq = pos.q, cr = pos.r
        const px = cq * sx - minX
        const py = Math.round((cr + (cq % 2 ? 0.5 : 0)) * sy) - minY
        const pts = [
          norm(px + tileW * 0.25, py + 0),
          norm(px + tileW * 0.75, py + 0),
          norm(px + tileW * 1.00, py + tileH * 0.5),
          norm(px + tileW * 0.75, py + tileH * 1.0),
          norm(px + tileW * 0.25, py + tileH * 1.0),
          norm(px + tileW * 0.00, py + tileH * 0.5),
        ].join(' ')
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
        poly.setAttribute('points', pts)
        clip!.appendChild(poly)
      })
      // Keep content inside but allow scrolling within widgets like README
      body.style.overflow = 'auto'
      const padX2 = Math.max(8, Math.round(Math.min(st.tile * 0.24, boxW * 0.14)))
      const padY2 = Math.max(6, Math.round(Math.min(st.tile * 0.18, boxH * 0.14)))
      body.style.padding = `${padY2}px ${padX2}px`
      body.style.boxSizing = 'border-box'
      ;(body.style as any).clipPath = `url(#${cid})`
      ;(body.style as any).webkitClipPath = `url(#${cid})`
      // Build/update flat background layer clipped to the same shape (no seams)
      const themeBg = (document.documentElement.getAttribute('data-theme') || 'dark')
      const lightBg = themeBg !== 'dark'
      // Colorful palette using the same taste as project list
      const palette: Array<[number,number,number]> = [
        [59,130,246],   // blue
        [16,185,129],   // emerald
        [239,68,68],    // red
        [168,85,247],   // purple
        [251,146,60],   // orange
        [234,179,8],    // yellow/amber
        [99,102,241],   // indigo (close to list tone)
        [20,184,166],   // teal
        [14,165,233],   // sky
      ]
      // Stable per-widget color pick to increase variety
      const hsh = (s: string) => { let h = 0; for (let i=0;i<s.length;i++){ h = ((h<<5)-h) + s.charCodeAt(i); h|=0 } return Math.abs(h) }
      const conf = hxwCustomGet(pid, id)
      const rgb: [number,number,number] = (conf && Array.isArray(conf.rgb) && conf.rgb.length === 3)
        ? (conf.rgb as [number,number,number])
        : palette[hsh(type) % palette.length]
      const alpha = (conf && typeof conf.alpha === 'number') ? Math.max(0, Math.min(1, conf.alpha)) : (lightBg ? 0.42 : 0.38)
      const fillFlat = `rgba(${rgb[0]},${rgb[1]},${rgb[2]}, ${alpha})`
      host!.style.setProperty('--hxw-fill', fillFlat)
      // annotate each cell with base rgb so minimap can color-match
      try { Array.from(host!.querySelectorAll('.hxw-hex.hxw-filled')).forEach((n) => (n as HTMLElement).setAttribute('data-rgb', `${rgb[0]},${rgb[1]},${rgb[2]}`)) } catch {}
      let bgFlat = host!.querySelector('.hxw-bg') as HTMLElement | null
      if (!bgFlat) { bgFlat = document.createElement('div'); bgFlat.className = 'hxw-bg'; host!.insertBefore(bgFlat, body) }
      bgFlat.style.left = '0px'
      bgFlat.style.top = '0px'
      bgFlat.style.width = `${boxW}px`
      bgFlat.style.height = `${boxH}px`
      bgFlat.style.background = fillFlat
      ;(bgFlat.style as any).clipPath = `url(#${cid})`
      ;(bgFlat.style as any).webkitClipPath = `url(#${cid})`
      // Ensure pointer-event routing remains correct even after re-building during edit mode:
      // when editing, clicks should go to the hex background only (for selection/move),
      // and inner rectangular content should not intercept clicks.
      const editing = canvas.getAttribute('data-edit') === '1'
      try {
        if (editing) {
          // Route events to background layer only
          bgFlat.style.pointerEvents = 'auto'
          body.style.pointerEvents = 'none'
          const cellsWrapNow = host!.querySelector('.hxw-cells') as HTMLElement | null
          if (cellsWrapNow) cellsWrapNow.style.pointerEvents = 'none'
        } else {
          // Restore defaults when not editing
          bgFlat.style.pointerEvents = ''
          body.style.pointerEvents = ''
          const cellsWrapNow = host!.querySelector('.hxw-cells') as HTMLElement | null
          if (cellsWrapNow) cellsWrapNow.style.pointerEvents = ''
        }
      } catch { /* ignore */ }
    }

    // Apply custom name label (small floating chip) if configured
    try {
      const conf = hxwCustomGet(pid, id)
      const name = (conf && typeof conf.name === 'string' && conf.name.trim()) ? conf.name.trim() : ''
      let chip = host!.querySelector('.hxw-name') as HTMLElement | null
      if (!chip && name) { chip = document.createElement('div'); chip.className = 'hxw-name'; chip.style.position = 'absolute'; chip.style.left = '50%'; chip.style.top = '6px'; chip.style.transform = 'translateX(-50%)'; chip.style.zIndex = '5'; chip.style.pointerEvents = 'none'; chip.style.fontSize = '12px'; chip.style.fontWeight = '600'; chip.style.color = 'white'; chip.style.textShadow = '0 1px 2px rgba(0,0,0,.3)'; host!.appendChild(chip) }
      if (chip) { chip.textContent = name || ''; chip.style.display = name ? '' : 'none' }
    } catch {}

    // Make custom/flow widgets act like a single big button
    try {
      const t = (host!.getAttribute('data-type') || '').toLowerCase()
      if (t === 'custom' || t === 'flow') {
        host!.style.cursor = 'pointer'
        host!.setAttribute('role', 'button')
        host!.setAttribute('tabindex', '0')
        // Hover/press feedback when not editing (apply only to hex area via bg layer)
        const applyHover = (on: boolean) => {
          const editing = canvas.getAttribute('data-edit') === '1'
          if (editing) return
          const bg = host!.querySelector('.hxw-bg') as HTMLElement | null
          if (!bg) return
          bg.style.transition = 'transform .12s ease, filter .12s ease, box-shadow .12s ease'
          if (on) {
            bg.style.filter = 'brightness(1.07)'
            ;(bg.style as any).boxShadow = '0 10px 24px rgba(0,0,0,0.28)'
          } else {
            if (host!.classList.contains('hxw-selected')) {
              bg.style.filter = 'saturate(1.85) brightness(1.38) contrast(1.18) hue-rotate(8deg)'
              bg.style.boxShadow = '0 0 42px rgba(255,200,120,.62)'
            } else {
              bg.style.filter = ''
              ;(bg.style as any).boxShadow = ''
            }
          }
        }
        const bgEl = host!.querySelector('.hxw-bg') as HTMLElement | null
        if (bgEl) {
          bgEl.addEventListener('mouseenter', () => applyHover(true))
          bgEl.addEventListener('mouseleave', () => applyHover(false))
          bgEl.addEventListener('mousedown', () => {
            if (canvas.getAttribute('data-edit') === '1') return
            bgEl.style.transform = 'scale(0.997)'
          })
          bgEl.addEventListener('mouseup', () => {
            if (canvas.getAttribute('data-edit') === '1') return
            bgEl.style.transform = ''
          })
        }
      }
    } catch {}

    // Build per-cell slots container for hex-packed layout (above bg, below body)
    let cellsWrap = host!.querySelector('.hxw-cells') as HTMLElement | null
    if (!cellsWrap) { cellsWrap = document.createElement('div'); cellsWrap.className = 'hxw-cells'; host!.appendChild(cellsWrap) }
    cellsWrap.innerHTML = ''
    relAx.forEach(([ax, az]) => {
      const pos = axialToOddq(anc.x + ax, anc.z + az)
      const cq = pos.q, cr = pos.r
      const x = cq * sx
      const y = Math.round((cr + (cq % 2 ? 0.5 : 0)) * sy)
      const slot = document.createElement('div')
      slot.className = 'hxw-slot'
      slot.style.left = `${x - minX}px`
      slot.style.top = `${y - minY}px`
      slot.style.width = `${tileW}px`
      slot.style.height = `${tileH}px`
      slot.setAttribute('data-slot', `${cq},${cr}`)
      const clip = document.createElement('div')
      clip.className = 'hxw-clip'
      const inner = document.createElement('div')
      inner.className = 'slot-inner'
      clip.appendChild(inner)
      slot.appendChild(clip)
      cellsWrap!.appendChild(slot)
    })
    // While editing, ensure per-cell layer does not intercept clicks (selection should hit bg layer)
    try {
      const editing = canvas.getAttribute('data-edit') === '1'
      if (cellsWrap) cellsWrap.style.pointerEvents = editing ? 'none' : ''
    } catch {}
    // For widgets that should not use cell slots (inputs等)、スロット要素自体を除去して本体を優先
    try {
      const t = (host!.getAttribute('data-type') || '').toLowerCase()
      // NOTE: Links/Calendar/README/Markdown are slot-driven (popup buttons)
      // Custom/Flow are simple buttons after placement → remove per-cell slots
      const noSlots = t === 'flow' || t === 'custom'
      if (noSlots && cellsWrap) { cellsWrap.remove(); cellsWrap = null as any }
    } catch {}
    // Hide rectangular body only for compact slot-driven widgets (invite/account/tabnew/skin/clock-digital)
    try {
      const t = (host!.getAttribute('data-type') || '').toLowerCase()
      if (t === 'invite' || t === 'account' || t === 'tabnew' || t === 'skin' || t === 'clock-digital') {
        const body2 = host!.querySelector('.hxw-body') as HTMLElement | null
        if (body2) body2.style.display = 'none'
      }
    } catch {}

    // Draw outer outline only (no internal edges) using neighbor test
    try {
      const present = new Set<string>()
      cells.forEach(c => present.add(`${c.q},${c.r}`))
      const polyPts = (px: number, py: number) => ([
        [px + tileW * 0.25, py + 0],
        [px + tileW * 0.75, py + 0],
        [px + tileW * 1.00, py + tileH * 0.5],
        [px + tileW * 0.75, py + tileH * 1.0],
        [px + tileW * 0.25, py + tileH * 1.0],
        [px + tileW * 0.00, py + tileH * 0.5],
      ])
      const neighbor = (q: number, r: number, dir: number): { q: number; r: number } => {
        const odd = (q & 1) === 1
        switch (dir) {
          case 0: return { q, r: r - 1 } // N
          case 1: return odd ? { q: q + 1, r } : { q: q + 1, r: r - 1 } // NE
          case 2: return odd ? { q: q + 1, r: r + 1 } : { q: q + 1, r } // SE
          case 3: return { q, r: r + 1 } // S
          case 4: return odd ? { q: q - 1, r: r + 1 } : { q: q - 1, r } // SW
          case 5: return odd ? { q: q - 1, r } : { q: q - 1, r: r - 1 } // NW
          default: return { q, r }
        }
      }
      const segs: string[] = []
      cells.forEach(c => {
        const px = c.q * sx - minX
        const py = Math.round((c.r + (c.q % 2 ? 0.5 : 0)) * sy) - minY
        const P = polyPts(px, py)
        for (let i = 0; i < 6; i++) {
          const nb = neighbor(c.q, c.r, i)
          if (present.has(`${nb.q},${nb.r}`)) continue // internal edge, skip
          const A = P[i], B = P[(i + 1) % 6]
          segs.push(`M ${Math.round(A[0])} ${Math.round(A[1])} L ${Math.round(B[0])} ${Math.round(B[1])}`)
        }
      })
      let outline = host!.querySelector('svg.hxw-outline') as SVGSVGElement | null
      if (!outline) {
        outline = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
        outline.classList.add('hxw-outline')
        outline.style.position = 'absolute'; outline.style.left = '0'; outline.style.top = '0'
        outline.style.width = '100%'; outline.style.height = '100%'; outline.style.pointerEvents = 'none'; outline.style.zIndex = '6'
        host!.appendChild(outline)
      }
      outline.setAttribute('viewBox', `0 0 ${boxW} ${boxH}`)
      outline.setAttribute('width', String(boxW))
      outline.setAttribute('height', String(boxH))
      outline.innerHTML = ''
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', segs.join(' '))
      const col = fillFlat
      path.setAttribute('fill', 'none')
      // Hide outline stroke by default (selection is indicated via color change, not stroke)
      path.setAttribute('stroke', 'none')
      path.setAttribute('data-stk', col)
      path.setAttribute('stroke-width', '0')
      path.setAttribute('stroke-linejoin', 'round')
      path.setAttribute('stroke-linecap', 'round')
      outline.appendChild(path)
    } catch {}

    // (Shortcut UI moved to contextual menu; no persistent icon in widgets)
  }
  Object.entries(meta).forEach(([id, m]) => upsertOne(id, m.type, m.q, m.r))
  existing.forEach((el) => el.remove())
  try { const pid = (canvas.getAttribute('data-pid') || '0'); hxwRenderShortcuts(root, pid); hxwRenderCapacityBar(root, pid) } catch {}
}

// Ensure pointer-events routing for edit mode applies to newly created widgets
function hxwSyncEditPointerEvents(root: HTMLElement): void {
  const canvas = root.querySelector('#hxwCanvas') as HTMLElement | null
  if (!canvas) return
  const on = canvas.getAttribute('data-edit') === '1'
  try {
    Array.from(canvas.querySelectorAll('.hxw-widget')).forEach((el) => {
      const host = el as HTMLElement
      const bg = host.querySelector('.hxw-bg') as HTMLElement | null
      if (on) {
        host.style.pointerEvents = 'none'
        if (bg) bg.style.pointerEvents = 'auto'
      } else {
        host.style.pointerEvents = ''
        if (bg) bg.style.pointerEvents = ''
      }
    })
    // Disable inner content hit-testing while editing so hex background gets clicks
    canvas.querySelectorAll('.hxw-widget .wg-content, .hxw-widget .hxw-body, .hxw-widget .slot-inner, .hxw-widget .hxw-cells').forEach((el) => {
      (el as HTMLElement).style.pointerEvents = on ? 'none' : ''
    })
  } catch {}
}

// Recolor background hex cells to match current occupancy and tones
function hxwRecolorBackground(root: HTMLElement, pid: string): void {
  const wrap = root.querySelector('#hxwWrap') as HTMLElement | null
  const canvas = root.querySelector('#hxwCanvas') as HTMLElement | null
  if (!wrap || !canvas) return
  const isLightTheme = (document.documentElement.getAttribute('data-theme') || 'dark') !== 'dark'
  const pjColor = ((root as HTMLElement).getAttribute('data-pj-color') || 'blue') as string
  const toneFor = (c: string): string => {
    const a = isLightTheme ? 0.42 : 0.38
    switch (c) {
      case 'red': return `rgba(239,68,68,${a})`
      case 'green': return `rgba(16,185,129,${a})`
      case 'purple': return `rgba(168,85,247,${a})`
      case 'orange': return `rgba(251,146,60,${a})`
      case 'yellow': return `rgba(234,179,8,${a})`
      case 'gray': return isLightTheme ? 'rgba(120,120,128,0.38)' : 'rgba(120,120,128,0.35)'
      case 'black': return isLightTheme ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.55)'
      case 'white': return isLightTheme ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.10)'
      default: return `rgba(59,130,246,${a})` // blue
    }
  }
  const occTone = toneFor(pjColor)
  const emptyTone = isLightTheme ? 'rgba(120,120,128,0.26)' : 'rgba(120,120,128,0.22)'
  const facetsEmpty = deriveFacets(emptyTone)
  const occ: Set<string> = (wrap as any)._hxwOcc || new Set<string>()
  const bgHexes = Array.from(canvas.querySelectorAll('.hxw-hex[data-kind="bg"]')) as HTMLElement[]
  bgHexes.forEach((el) => {
    const q = parseInt(el.getAttribute('data-q') || '-1', 10)
    const r = parseInt(el.getAttribute('data-r') || '-1', 10)
    const k = `${q},${r}`
    const clip = el.querySelector('.hxw-clip') as HTMLElement | null
    if (!clip) return
    if (occ.has(k)) {
      // Find widget color for this cell if possible
      let col = occTone
      const marker = canvas.querySelector(`.hxw-hex.hxw-filled[data-kr="${q},${r}"]`) as HTMLElement | null
      if (marker) {
        const host = marker.closest('.hxw-widget') as HTMLElement | null
        const id = host?.getAttribute('data-widget') || ''
        const rgbStr = marker.getAttribute('data-rgb') || ''
        let a = isLightTheme ? 0.42 : 0.38
        try { const c = hxwCustomGet(pid, id); if (c && typeof (c as any).alpha === 'number') a = Math.max(0, Math.min(1, (c as any).alpha)) } catch {}
        if (rgbStr) {
          const [rr, gg, bb] = rgbStr.split(',').map((n) => parseInt(n, 10))
          if (Number.isFinite(rr) && Number.isFinite(gg) && Number.isFinite(bb)) col = `rgba(${rr},${gg},${bb}, ${a})`
        }
      }
      const f = deriveFacets(col)
      clip.innerHTML = honeyHexFilledSvg()
      clip.style.color = col
      ;(clip.style as any).setProperty('--hx-side', f.side)
      ;(clip.style as any).setProperty('--hx-hi', f.hi)
      ;(clip.style as any).setProperty('--hx-edge', f.side)
    } else {
      clip.innerHTML = honeyHexEmptySvg()
      clip.style.color = emptyTone
      ;(clip.style as any).setProperty('--hx-side', facetsEmpty.side)
      ;(clip.style as any).setProperty('--hx-hi', facetsEmpty.hi)
      ;(clip.style as any).setProperty('--hx-edge', facetsEmpty.side)
    }
  })
  // Remove any stale hosts not present in meta (ensures no ghost tiles remain)
  existing.forEach((el) => { try { el.remove() } catch {} })
}

export function renderHexWidgets(root: HTMLElement, pid: string): void {
  const wrap = root.querySelector('#hxwWrap') as HTMLElement | null
  const canvas = root.querySelector('#hxwCanvas') as HTMLElement | null
  if (!wrap || !canvas) return
  canvas.setAttribute('data-pid', pid)
  // state
  const prev = (wrap as any)._hxw as HexWLayout | undefined
  const st: HexWLayout = prev || { scale: 1, tile: 200, width: 0, height: 0, offsetX: 120, offsetY: 80 }
  const W = st.tile
  const H = Math.round(W * 0.866)
  const stepX = () => Math.round(W * 0.75)
  const stepY = () => H
  // Compute grid size from desired hex radius (strict hex field)
  const vw = Math.max(320, wrap.clientWidth)
  const vh = Math.max(240, wrap.clientHeight)
  // ensure grid also covers current widgets footprint
  const metaAll = hxwGetMeta(pid)
  let usedMinQ = 0, usedMaxQ = 0, usedMinR = 0, usedMaxR = 0, hasUse = false
  Object.entries(metaAll).forEach(([id, m]: any) => {
    const anc = oddqToAxial(m.q, m.r)
    const rel = hxwRelFor(pid, id, m.type || 'mock')
    rel.forEach(([ax, az]) => {
      const o = axialToOddq(anc.x + ax, anc.z + az)
      if (!hasUse) { usedMinQ = usedMaxQ = o.q; usedMinR = usedMaxR = o.r; hasUse = true }
      usedMinQ = Math.min(usedMinQ, o.q); usedMaxQ = Math.max(usedMaxQ, o.q)
      usedMinR = Math.min(usedMinR, o.r); usedMaxR = Math.max(usedMaxR, o.r)
    })
  })
  // Determine base strict radius: prefer a persisted preferred radius to avoid zoom-dependent changes
  // If none saved yet, derive from viewport once; afterwards we keep the persisted value stable.
  const viewCols = Math.max(3, Math.ceil(vw / stepX()))
  const viewRows = Math.max(3, Math.ceil(vh / stepY()))
  const R_VIEW = Math.max(1, Math.floor(Math.min(viewCols, viewRows) / 2) - 1)
  // フィールドが広すぎたため縮小: 以前の約8倍 → 約3倍に調整
  const RADIUS_SCALE = 5.0 // フィールドを広く確保（視界を拡大）
  const R_FROM_VIEW = Math.max(3, Math.floor(R_VIEW * RADIUS_SCALE))
  const R_PERSIST = hxwGetPreferredRadius()
  let R_STRICT = (R_PERSIST != null) ? R_PERSIST : HXW_DEFAULT_RADIUS
  // 既存ウィジェットの占有範囲を必ず内包するように半径を引き上げる
  try {
    const hexDist = (a: Ax, b: Ax): number => {
      const dx = a.x - b.x, dz = a.z - b.z, dy = -dx - dz
      return Math.floor((Math.abs(dx) + Math.abs(dy) + Math.abs(dz)) / 2)
    }
    const centerAx = oddqToAxial(R_STRICT, R_STRICT)
    let need = 0
    Object.entries(metaAll).forEach(([id, m]: any) => {
      const anc = oddqToAxial(m.q, m.r)
      const rel = hxwRelFor(pid, id, m.type || 'mock')
      for (const [ax, az] of rel) {
        const d = hexDist({ x: anc.x + ax, z: anc.z + az }, centerAx)
        if (d > need) need = d
      }
    })
    if (need > R_STRICT) R_STRICT = need
  } catch { /* fallback: ignore if any error */ }
  const COLS = 2 * R_STRICT + 1
  const ROWS = 2 * R_STRICT + 1
  const width = stepX() * (COLS - 1) + W
  const height = stepY() * (ROWS + 0.5)
  st.width = width; st.height = height
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  try { const base = document.getElementById('hxwBase') as HTMLElement | null; if (base) { base.style.width = `${width}px`; base.style.height = `${height}px` } } catch {}
  ; (wrap as any)._hxw = st
  ; (wrap as any)._hxwCols = COLS
  ; (wrap as any)._hxwRows = ROWS

  // Persist chosen radius to keep it stable across routes/zoom; only raise, never shrink automatically.
  try {
    const cur = hxwGetPreferredRadius()
    if (cur == null || R_STRICT > cur) hxwSetPreferredRadius(R_STRICT)
  } catch {}

  // build background nodes
  const nodes: Array<{ q: number; r: number; x: number; y: number }> = []
  canvas.innerHTML = ''
  // Tones: occupied cells follow project color; empty cells use black-ish neutral
  const pjColor = ((root as HTMLElement).getAttribute('data-pj-color') || 'blue') as string
  const themeId = (document.documentElement.getAttribute('data-theme') || 'dark')
  const isLightTheme = themeId === 'warm' || themeId === 'sakura'
  const toneFor = (c: string): string => {
    const alpha = isLightTheme ? 0.42 : 0.38
    switch (c) {
      case 'red': return `rgba(239,68,68,${alpha})`
      case 'green': return `rgba(16,185,129,${alpha})`
      case 'purple': return `rgba(168,85,247,${alpha})`
      case 'orange': return `rgba(251,146,60,${alpha})`
      case 'yellow': return `rgba(234,179,8,${alpha})`
      case 'gray': return isLightTheme ? 'rgba(120,120,128,0.38)' : 'rgba(120,120,128,0.35)'
      case 'black': return isLightTheme ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.55)'
      case 'white': return isLightTheme ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.10)'
      default: /* blue */ return `rgba(59,130,246,${alpha})`
    }
  }
  const occTone = toneFor(pjColor)
  const facetsOcc = deriveFacets(occTone)
  // Empty tiles: medium gray, less opaque to avoid harsh black
  const emptyTone = isLightTheme ? 'rgba(120,120,128,0.26)' : 'rgba(120,120,128,0.22)'
  const facetsEmpty = deriveFacets(emptyTone)
  // Build a rounded hex mask so the field extends in a beehive-like shape (not a rectangle)
  const mask = new Set<string>()
  // シルエット位置は固定（中央基準）
  const centerQ = Math.floor(COLS / 2)
  const centerR = Math.floor(ROWS / 2)
  const rotateField = false // 綺麗な正六角形に戻す（回転しない）
  const cax = rotateField ? oddrToAxialR(centerQ, centerR) : oddqToAxial(centerQ, centerR)
  const hexDist = (a: { x: number; z: number }, b: { x: number; z: number }): number => {
    const dx = a.x - b.x, dz = a.z - b.z, dy = -dx - dz
    return Math.floor((Math.abs(dx) + Math.abs(dy) + Math.abs(dz)) / 2)
  }
  // Use the strict radius computed above soマスクとグリッドが一致
  const R = R_STRICT
  for (let q = 0; q < COLS; q++) {
    for (let r = 0; r < ROWS; r++) {
      const ax = rotateField ? oddrToAxialR(q, r) : oddqToAxial(q, r)
      const d = hexDist(ax, cax)
      if (d <= R) {
        mask.add(`${q},${r}`)
        const x = q * stepX()
        const y = Math.round((r + (q % 2 ? 0.5 : 0)) * stepY())
        nodes.push({ q, r, x, y })
        const el = document.createElement('div')
        el.className = 'hxw-hex'
        el.setAttribute('data-kind', 'bg')
        el.setAttribute('data-q', String(q))
        el.setAttribute('data-r', String(r))
        el.style.left = `${x}px`
        el.style.top = `${y}px`
        el.style.width = `${W}px`
        el.style.height = `${H}px`
        const clip = document.createElement('div')
        clip.className = 'hxw-clip hx-svgclip'
        // initialize as empty-tone; occupied cells recolor later
        clip.style.color = emptyTone
        ;(clip.style as any).setProperty('--hx-side', facetsEmpty.side)
        ;(clip.style as any).setProperty('--hx-hi',   facetsEmpty.hi)
        ;(clip.style as any).setProperty('--hx-edge', facetsEmpty.side)
        clip.innerHTML = honeyHexEmptySvg()
        el.appendChild(clip)
        canvas.appendChild(el)
      }
    }
  }
  ; (wrap as any)._hxw.nodes = nodes
  ; (wrap as any)._hxwMask = mask

  // Prune widgets that are now outside the hex field mask
  try {
    const meta = hxwGetMeta(pid)
    let changed = false
    const inMask = (q: number, r: number) => mask.has(`${q},${r}`)
    Object.entries(meta).forEach(([id, m]: any) => {
      const anc = oddqToAxial(m.q, m.r)
      const rel = hxwRelFor(pid, id, m.type || 'mock')
      let ok = true
      for (const [ax, az] of rel) {
        const o = axialToOddq(anc.x + ax, anc.z + az)
        if (!inMask(o.q, o.r)) { ok = false; break }
      }
      if (!ok) { delete meta[id]; changed = true }
    })
    if (changed) hxwSetMeta(pid, meta)
  } catch { }

  // Build a clipPath (背景参考用)。ウィジェットは切らないため適用しない。
  try {
    const present = mask
    const polyPts = (px: number, py: number) => ([
      [px + W * 0.25, py + 0],
      [px + W * 0.75, py + 0],
      [px + W * 1.00, py + H * 0.5],
      [px + W * 0.75, py + H * 1.0],
      [px + W * 0.25, py + H * 1.0],
      [px + W * 0.00, py + H * 0.5],
    ])
    const neighbor = (q: number, r: number, dir: number): { q: number; r: number } => {
      const odd = (q & 1) === 1
      switch (dir) {
        case 0: return { q, r: r - 1 }
        case 1: return odd ? { q: q + 1, r } : { q: q + 1, r: r - 1 }
        case 2: return odd ? { q: q + 1, r: r + 1 } : { q: q + 1, r }
        case 3: return { q, r: r + 1 }
        case 4: return odd ? { q: q - 1, r: r + 1 } : { q: q - 1, r }
        case 5: return odd ? { q: q - 1, r } : { q: q - 1, r: r - 1 }
        default: return { q, r }
      }
    }
    const segs: string[] = []
    present.forEach((_, key) => {
      const [qs, rs] = key.split(',').map((n) => parseInt(n, 10))
      const px = qs * stepX()
      const py = Math.round((rs + (qs % 2 ? 0.5 : 0)) * stepY())
      const P = polyPts(px, py)
      for (let i = 0; i < 6; i++) {
        const nb = neighbor(qs, rs, i)
        if (present.has(`${nb.q},${nb.r}`)) continue
        const A = P[i], B = P[(i + 1) % 6]
        segs.push(`M ${Math.round(A[0])} ${Math.round(A[1])} L ${Math.round(B[0])} ${Math.round(B[1])}`)
      }
    })
    const defs = hxwEnsureDefs()
    const cid = `hxw-canvas-clip-${pid}`
    let cp = defs.querySelector(`#${cid}`) as SVGClipPathElement | null
    if (!cp) { cp = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath') as any; cp.setAttribute('id', cid); cp.setAttribute('clipPathUnits', 'userSpaceOnUse'); defs.appendChild(cp) }
    cp.innerHTML = ''
    // Simpler: union-clip by adding one polygon per present cell
    present.forEach((_, key) => {
      const [qs, rs] = key.split(',').map((n) => parseInt(n, 10))
      const px = qs * stepX()
      const py = Math.round((rs + (qs % 2 ? 0.5 : 0)) * stepY())
      const pts = [
        [px + W * 0.25, py + 0],
        [px + W * 0.75, py + 0],
        [px + W * 1.00, py + H * 0.5],
        [px + W * 0.75, py + H * 1.0],
        [px + W * 0.25, py + H * 1.0],
        [px + W * 0.00, py + H * 0.5],
      ].map(([x,y]) => `${x},${y}`).join(' ')
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
      poly.setAttribute('points', pts)
      cp!.appendChild(poly)
    })
    // clipPath は適用しない（背景六角形のみ描画されるので不要）
    try { (canvas.style as any).clipPath = ''; (canvas.style as any).webkitClipPath = '' } catch {}
  } catch { }

  // seed defaults if empty
  const meta = hxwGetMeta(pid)
  if (Object.keys(meta).length === 0) {
    const q0 = Math.floor(COLS / 2)
    const r0 = Math.floor(ROWS / 2)
    meta['readme'] = { type: 'readme', q: q0 - 2, r: r0 - 1 }
    meta['contrib'] = { type: 'contrib', q: q0 + 2, r: r0 - 1 }
    meta['committers'] = { type: 'committers', q: q0, r: r0 + 2 }
    hxwSetMeta(pid, meta)
  }

  // place widgets
  hxwPlaceWidgets(root, pid, st)
  // Update background cell visuals to reflect current occupancy
  try { hxwRecolorBackground(root, pid) } catch { }
  // Re-apply edit hit-testing routing to new DOM
  try { hxwSyncEditPointerEvents(root) } catch {}
  // After widgets are placed, recolor background cells: use empty design for unoccupied cells
  try {
    const occ: Set<string> = (wrap as any)._hxwOcc || new Set<string>()
    const bgHexes = Array.from(canvas.querySelectorAll('.hxw-hex[data-kind="bg"]')) as HTMLElement[]
    bgHexes.forEach((el) => {
      const q = parseInt(el.getAttribute('data-q') || '-1', 10)
      const r = parseInt(el.getAttribute('data-r') || '-1', 10)
      const k = `${q},${r}`
      const clip = el.querySelector('.hxw-clip') as HTMLElement | null
      if (!clip) return
      if (occ.has(k)) {
        // Occupied: match widget picker palette per widget (id/type or custom RGB)
        const marker = canvas.querySelector(`.hxw-hex.hxw-filled[data-kr="${q},${r}"]`) as HTMLElement | null
        let col = occTone
        if (marker) {
          const host = marker.closest('.hxw-widget') as HTMLElement | null
          const id = host?.getAttribute('data-widget') || ''
          // Prefer explicit RGB from marker annotation
          const rgbStr = marker.getAttribute('data-rgb') || ''
          let a = isLightTheme ? 0.42 : 0.38
          try { const c = hxwCustomGet(pid, id); if (c && typeof (c as any).alpha === 'number') a = Math.max(0, Math.min(1, (c as any).alpha)) } catch {}
          if (rgbStr) {
            const [rr,gg,bb] = rgbStr.split(',').map((n)=>parseInt(n,10))
            if (Number.isFinite(rr) && Number.isFinite(gg) && Number.isFinite(bb)) col = `rgba(${rr},${gg},${bb}, ${a})`
          }
        }
        const f = deriveFacets(col)
        clip.innerHTML = honeyHexFilledSvg()
        clip.style.color = col
        ;(clip.style as any).setProperty('--hx-side', f.side)
        ;(clip.style as any).setProperty('--hx-hi',   f.hi)
        ;(clip.style as any).setProperty('--hx-edge', f.side)
      } else {
        clip.innerHTML = honeyHexEmptySvg()
        clip.style.color = emptyTone
        ;(clip.style as any).setProperty('--hx-side', facetsEmpty.side)
        ;(clip.style as any).setProperty('--hx-hi',   facetsEmpty.hi)
        ;(clip.style as any).setProperty('--hx-edge', facetsEmpty.side)
      }
    })
  } catch { /* non-fatal */ }
  // bind interactions and minimap
  hxwBindInteractions(root, wrap, canvas, st)
  // center initial view (skip during entry animation or if already inited)
  let allowCenter = true
  try {
    let reload = false
    try {
      const nav = (performance as any)
      const entries = nav?.getEntriesByType ? nav.getEntriesByType('navigation') : []
      if (entries && entries.length) reload = ((entries[0] as any).type === 'reload')
      else if ((performance as any).navigation) reload = ((performance as any).navigation.type === 1)
    } catch {}
    const dir = reload ? null : sessionStorage.getItem('proj-entry-dir')
    if (dir === 'left' || dir === 'right') allowCenter = false
  } catch {}
  try { const rootEl = (canvas.closest('.gh-canvas') as HTMLElement | null) || root as HTMLElement; if (rootEl?.hasAttribute('data-arriving')) allowCenter = false } catch {}
  if (!st.inited && allowCenter) {
    try {
      const vw = wrap.clientWidth, vh = wrap.clientHeight
      const Wv = (st.width || 0) * st.scale
      const Hv = (st.height || 0) * st.scale
      st.offsetX = Math.round((vw - Wv) / 2)
      st.offsetY = Math.round((vh - Hv) / 2)
    } catch {}
  }
  st.inited = true
  hxwApplyTransform(wrap, canvas, st)
  // ensure initial contents hydrate now that skeletons exist
  try { refreshDynamicWidgets(root, pid) } catch {}
  // initial hydration for GitHub-derived widgets if needed
  try { hxwRehydrate(root, pid) } catch {}
  // initial capacity bar
  try { hxwRenderCapacityBar(root, pid) } catch {}
}

// ---- Placement mode: pick a widget from the modal, then place freely on canvas ----
function hxwStartPlacement(root: HTMLElement, pid: string, type: string): void {
  const wrap = root.querySelector('#hxwWrap') as HTMLElement | null
  const canvas = root.querySelector('#hxwCanvas') as HTMLElement | null
  if (!wrap || !canvas) return
  const st: HexWLayout = (wrap as any)._hxw
  const sx = Math.round((st.tile || 200) * 0.75)
  const sy = Math.round((st.tile || 200) * 0.866)
  const stepX = () => Math.round((st.tile || 200) * 0.75)
  const stepY = () => Math.round((st.tile || 200) * 0.866)
  const toCanvasXY = (clientX: number, clientY: number): { x: number; y: number } => {
    const rect = wrap.getBoundingClientRect()
    const x = (clientX - rect.left - st.offsetX) / st.scale
    const y = (clientY - rect.top - st.offsetY) / st.scale
    return { x, y }
  }
  const toCell = (cx: number, cy: number): { q: number; r: number } => {
    const q = Math.round(cx / stepX())
    const r = Math.round(cy / stepY() - (q % 2 ? 0.5 : 0))
    return { q, r }
  }
  const ensureGhost = (): HTMLElement => {
    let g = document.getElementById('hxwPlaceGhost') as HTMLElement | null
    if (g) return g
    g = document.createElement('div')
    g.id = 'hxwPlaceGhost'
    g.className = 'hxw-ghost'
    g.style.position = 'absolute'
    g.style.left = '0px'
    g.style.top = '0px'
    g.style.pointerEvents = 'none'
    canvas.appendChild(g)
    return g
  }
  const drawGhost = (cells: Array<{ x: number; y: number }>, ok: boolean) => {
    const g = ensureGhost()
    g.innerHTML = ''
    const W = st.tile, H = Math.round((st.tile) * 0.866)
    const fill = ok ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.28)'
    const stroke = ok ? 'rgba(16,185,129,0.85)' : 'rgba(239,68,68,0.85)'
    for (const c of cells) {
      const hex = document.createElement('div')
      hex.className = 'hxw-hex'
      hex.style.left = `${c.x}px`
      hex.style.top = `${c.y}px`
      hex.style.width = `${W}px`
      hex.style.height = `${H}px`
      const clip = document.createElement('div')
      clip.className = 'hxw-clip'
      clip.style.background = fill
      clip.style.border = `2px dashed ${stroke}`
      hex.appendChild(clip)
      g.appendChild(hex)
    }
    g.style.display = 'block'
  }
  const hideGhost = () => { const g = document.getElementById('hxwPlaceGhost') as HTMLElement | null; if (g) g.style.display = 'none' }
  const canPlace = (cells: Array<{ q: number; r: number }>): boolean => {
    const mask: Set<string> = (wrap as any)._hxwMask || new Set<string>()
    const inBounds = (q: number, r: number) => mask.size ? mask.has(`${q},${r}`) : (q >= 0 && r >= 0 && q < ((wrap as any)._hxwCols || 0) && r < ((wrap as any)._hxwRows || 0))
    const occ: Set<string> = (wrap as any)._hxwOcc || new Set<string>()
    for (const c of cells) {
      if (!inBounds(c.q, c.r)) return false
      if (occ.has(`${c.q},${c.r}`)) return false
    }
    return true
  }
  // live follow
  let last: { q: number; r: number } | null = null
  let lastClientX = 0, lastClientY = 0
  const renderAt = (clientX: number, clientY: number) => {
    const pos = toCanvasXY(clientX, clientY)
    const anc = toCell(pos.x, pos.y)
    if (last && last.q === anc.q && last.r === anc.r) return
    last = anc
    const pendingAny = (window as any)._hxwPending as (undefined | { shape?: Array<[number,number]>; type?: string })
    const rel = (pendingAny && Array.isArray((pendingAny as any).shape) && (pendingAny as any).shape.length) ? ((pendingAny as any).shape as Array<[number,number]>) : hxwShapeFor(type)
    const cellsOdd = rel.map(([ax, az]) => axialToOddq(oddqToAxial(anc.q, anc.r).x + ax, oddqToAxial(anc.q, anc.r).z + az))
    const ok = canPlace(cellsOdd)
    const cellsPx = cellsOdd.map(c => ({ x: c.q * sx, y: Math.round((c.r + (c.q % 2 ? 0.5 : 0)) * sy) }))
    drawGhost(cellsPx, ok)
  }
  const move = (e: PointerEvent | MouseEvent) => { lastClientX = (e as MouseEvent).clientX; lastClientY = (e as MouseEvent).clientY; renderAt(lastClientX, lastClientY) }
  const click = (e: MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const pos = toCanvasXY(e.clientX, e.clientY)
    const anc = toCell(pos.x, pos.y)
    const pending = (window as any)._hxwPending as (undefined | { shape?: Array<[number,number]>; rgb?: [number,number,number]; alpha?: number; name?: string; type?: string; flowGraph?: any })
    const rel = (pending && Array.isArray(pending.shape) && pending.shape.length) ? (pending.shape as Array<[number,number]>) : hxwShapeFor(type)
    const cellsOdd = rel.map(([ax, az]) => axialToOddq(oddqToAxial(anc.q, anc.r).x + ax, oddqToAxial(anc.q, anc.r).z + az))
    if (!canPlace(cellsOdd)) { cleanup(); try { alert('配置範囲外のためキャンセルしました') } catch {}; return }
    // place
    const meta = hxwGetMeta(pid)
    const id = `w-${type}-${Date.now()}`
    meta[id] = { type, q: anc.q, r: anc.r }
    hxwSetMeta(pid, meta)
    // Persist custom config (shape/color/name) and flow graph if provided
    if (pending) {
      try { hxwCustomSet(pid, id, { shape: pending.shape || undefined, rgb: pending.rgb || undefined, alpha: pending.alpha, name: pending.name }) } catch {}
      try { if (pending.name) scNameSet(pid, id, pending.name) } catch {}
      try { if (type === 'flow' && pending.flowGraph) flowSave(pid, id, pending.flowGraph) } catch {}
      try { (window as any)._hxwPending = undefined } catch {}
    }
    hxwPlaceWidgets(root, pid, st)
    try { hxwRecolorBackground(root, pid) } catch {}
    try { hxwSyncEditPointerEvents(root) } catch {}
    try { refreshDynamicWidgets(root, pid) } catch {}
    try { hxwRehydrate(root, pid) } catch {}
    try { showMiniToast('ウィジェットを追加しました') } catch {}
    cleanup()
  }
  const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { cleanup() } }
  const cleanup = () => {
    hideGhost()
    wrap.removeEventListener('mousemove', move as any)
    wrap.removeEventListener('pointermove', move as any)
    canvas.removeEventListener('click', click as any)
    window.removeEventListener('keydown', key)
    // restore hand cursor
    wrap.style.cursor = ''
    ;(wrap as any)._placing = false
    ;(wrap as any)._placeRefresh = null
  }
  // Begin placement mode
  wrap.addEventListener('mousemove', move as any)
  wrap.addEventListener('pointermove', move as any)
  canvas.addEventListener('click', click as any)
  window.addEventListener('keydown', key)
  wrap.style.cursor = 'crosshair'
  ;(wrap as any)._placing = true
  ;(wrap as any)._placeRefresh = () => { if (lastClientX && lastClientY) renderAt(lastClientX, lastClientY) }
}

// Find first-fit anchor near center for given widget type and add it
function hxwAddWidget(root: HTMLElement, pid: string, type: string): void {
  const wrap = root.querySelector('#hxwWrap') as HTMLElement | null
  const canvas = root.querySelector('#hxwCanvas') as HTMLElement | null
  if (!wrap || !canvas) return
  const st: HexWLayout = (wrap as any)._hxw
  const COLS: number = (wrap as any)._hxwCols || 20
  const ROWS: number = (wrap as any)._hxwRows || 14
  const occ: Set<string> = (wrap as any)._hxwOcc || new Set<string>()
  const centerQ = Math.floor(COLS / 2)
  const centerR = Math.floor(ROWS / 2)
  const meta = hxwGetMeta(pid)
  const shape = hxwShapeFor(type)
  const cand: Array<{q:number;r:number}> = []
  const maxRing = Math.max(COLS, ROWS)
  for (let d = 0; d < maxRing; d++) {
    for (let dq = -d; dq <= d; dq++) {
      for (let dr = -d; dr <= d; dr++) {
        const q = centerQ + dq
        const r = centerR + dr
        if (q < 0 || r < 0 || q >= COLS || r >= ROWS) continue
        cand.push({ q, r })
      }
    }
    if (cand.length) break
  }
  const canPlaceAt = (q: number, r: number) => {
    const anc = oddqToAxial(q, r)
    const mask: Set<string> = (wrap as any)._hxwMask || new Set<string>()
    for (const [ax, az] of shape) {
      const pos = axialToOddq(anc.x + ax, anc.z + az)
      if (mask.size ? !mask.has(`${pos.q},${pos.r}`) : (pos.q < 0 || pos.r < 0 || pos.q >= COLS || pos.r >= ROWS)) return false
      if (occ.has(`${pos.q},${pos.r}`)) return false
    }
    return true
  }
  let placed = false
  // try center first, then expand rings
  outer: for (let d = 0; d < maxRing && !placed; d++) {
    for (let dq = -d; dq <= d; dq++) {
      for (let dr = -d; dr <= d; dr++) {
        const q = centerQ + dq
        const r = centerR + dr
        if (q < 0 || r < 0 || q >= COLS || r >= ROWS) continue
        if (canPlaceAt(q, r)) {
          const id = `w-${type}-${Date.now()}`
          meta[id] = { type, q, r }
          hxwSetMeta(pid, meta)
          hxwPlaceWidgets(root, pid, st)
          try { hxwRecolorBackground(root, pid) } catch {}
          try { refreshDynamicWidgets(root, pid) } catch {}
          try { hxwRehydrate(root, pid) } catch {}
          placed = true
          break outer
        }
      }
    }
  }
  if (!placed) alert('配置できる空きスペースが見つかりませんでした')
}

async function hxwRehydrate(root: HTMLElement, pid: string): Promise<void> {
  const full = (root as HTMLElement).getAttribute('data-repo-full') || ((document.querySelector('[data-repo-full]') as HTMLElement | null)?.getAttribute('data-repo-full') || '')
  // README（常に再適用して欠落を防ぐ）
  if (full) {
    try {
      const token = localStorage.getItem('apiToken')
      const res = await fetch(`/api/github/readme?full_name=${encodeURIComponent(full)}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      const text = res.ok ? await res.text() : 'README not found'
      hydrateReadme(root, text)
    } catch {}
  }
  // Contributions（常に再描画）
  try { if (full) hydrateContribHeatmap(root, full) } catch {}
  // Committers（Hexスロットがある場合は選択ユーザー＋キャッシュで高速更新）
  try {
    const hasHex = root.querySelector('.hxw-widget[data-type="committers"]') as HTMLElement | null
    if (hasHex) {
      await committersPopulate(root)
    } else if (full) {
      // フォールバック（従来の棒グラフ用）
      try {
        const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        const commits = await apiFetch<any[]>(`/github/commits?full_name=${encodeURIComponent(full)}&since=${encodeURIComponent(since)}&per_page=100`)
        hydrateCommittersFromCommits(root, commits)
      } catch {
        try {
          const contr = await apiFetch<any[]>(`/github/contributors?full_name=${encodeURIComponent(full)}`)
          hydrateCommittersFromContributors(root, contr)
        } catch {}
      }
    }
  } catch {}
}
