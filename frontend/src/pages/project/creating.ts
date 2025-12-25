import { apiFetch } from '../../utils/api'
import { showRouteLoading } from '../../utils/route-loading'

type CreateTask = {
  mode: 'new' | 'existing'
  payload: any
}

type Project = { id: number; name?: string; start?: string; end?: string }

const CARD_COLORS = ['blue', 'green', 'red', 'purple', 'orange', 'yellow', 'gray', 'black', 'white'] as const
type CardColor = typeof CARD_COLORS[number]
function randomCardColor(): CardColor { return CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)] }

export async function renderProjectCreating(container: HTMLElement): Promise<void> {
  // Dedicated full-screen creating view (stylish background + centered message)
  container.innerHTML = `
    <section class="relative min-h-screen w-full overflow-hidden">
      <div class="absolute inset-0 -z-10">${bgVisual()}</div>
      <div class="absolute inset-0 -z-10" style="background: radial-gradient(120% 80% at 10% 0%, rgba(255,255,255,.05), transparent 60%), radial-gradient(140% 100% at 100% 100%, rgba(0,0,0,.12), transparent 60%)"></div>
      <div class="h-[100dvh] grid place-items-center text-center text-gray-100">
        <div>
          <div class="text-3xl md:text-4xl font-extrabold tracking-wide drop-shadow">作成中…</div>
          <div class="mt-3 text-sm md:text-base text-gray-300">プロジェクトを準備しています</div>
          <div id="cr-error" class="mt-5 hidden text-rose-400 text-sm"></div>
          <div class="mt-8">
            <a href="#/project" id="cr-back" class="hidden inline-flex items-center rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-4 py-2 text-gray-100">戻る</a>
          </div>
        </div>
      </div>
    </section>
  `
  // Fancy hex burst overlay reused for a premium feel
  try { showRouteLoading('作成中…') } catch {}

  // Kick off creation with payload from sessionStorage
  const raw = sessionStorage.getItem('project-create')
  if (!raw) return showErr('作成パラメータが見つかりません。やり直してください。')
  let task: CreateTask
  try { task = JSON.parse(raw) as CreateTask } catch { return showErr('作成パラメータの読み込みに失敗しました。') }
  // Consume it to avoid duplicate submissions on reload
  try { sessionStorage.removeItem('project-create') } catch {}

  // Perform creation
  try {
    const created = await apiFetch<Project>('/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task.payload) })
    const id = Number((created as any)?.id)
    if (!id) throw new Error('invalid response')
    // Assign a random UI color (best-effort)
    try {
      const color = randomCardColor()
      await apiFetch(`/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ color }) })
    } catch {}
    // If a target group was selected, map the project into it
    try {
      const gid = localStorage.getItem('createTargetGroup')
      if (gid) {
        const me = await apiFetch<{ id?: number }>('/me').catch(() => ({ id: undefined }))
        const key = `groupMap-${me?.id ?? 'guest'}`
        const map = JSON.parse(localStorage.getItem(key) || '{}') as Record<string, string>
        map[String(id)] = gid
        localStorage.setItem(key, JSON.stringify(map))
        localStorage.removeItem('createTargetGroup')
      }
    } catch {}
    // Go to detail immediately (route-loading overlay closes on route change)
    window.location.hash = `#/project/detail?id=${encodeURIComponent(String(id))}`
  } catch (e) {
    const msg = (e as any)?.message || ''
    if (typeof msg === 'string' && msg.includes('401')) {
      window.location.hash = '#/login'
    } else {
      // Show error and a back button
      showErr('作成に失敗しました。サーバーやネットワークの状態をご確認ください。')
    }
  }

  function showErr(msg: string) {
    const el = container.querySelector('#cr-error') as HTMLElement | null
    const back = container.querySelector('#cr-back') as HTMLElement | null
    if (el) { el.textContent = msg; el.classList.remove('hidden') }
    if (back) back.classList.remove('hidden')
  }
}

function bgVisual(): string {
  // Animated gradient blobs background (CSS-only, minimal footprint)
  return `
    <style>
      .cb-wrap { position: absolute; inset: 0; overflow: hidden; filter: blur(36px) saturate(120%); opacity: .8; }
      .cb { position: absolute; width: 44vmax; height: 44vmax; border-radius: 9999px; mix-blend-mode: screen; }
      .cb-a { background: radial-gradient(circle at 30% 30%, rgba(59,130,246,.25), transparent 60%), radial-gradient(circle at 70% 70%, rgba(16,185,129,.25), transparent 60%); left: -10vmax; top: -6vmax; animation: cba 12s ease-in-out infinite alternate; }
      .cb-b { background: radial-gradient(circle at 70% 30%, rgba(239,68,68,.25), transparent 60%), radial-gradient(circle at 30% 80%, rgba(168,85,247,.25), transparent 60%); right: -12vmax; top: -8vmax; animation: cbb 14s ease-in-out infinite alternate; }
      .cb-c { background: radial-gradient(circle at 50% 50%, rgba(234,179,8,.22), transparent 60%), radial-gradient(circle at 60% 60%, rgba(255,255,255,.10), transparent 60%); left: -8vmax; bottom: -12vmax; animation: cbc 16s ease-in-out infinite alternate; }
      @keyframes cba { from { transform: translate3d(0,0,0) scale(1); } to { transform: translate3d(6vmax,4vmax,0) scale(1.08); } }
      @keyframes cbb { from { transform: translate3d(0,0,0) scale(1); } to { transform: translate3d(-4vmax,6vmax,0) scale(1.06); } }
      @keyframes cbc { from { transform: translate3d(0,0,0) scale(1); } to { transform: translate3d(8vmax,-4vmax,0) scale(1.07); } }
    </style>
    <div class="cb-wrap">
      <div class="cb cb-a"></div>
      <div class="cb cb-b"></div>
      <div class="cb cb-c"></div>
    </div>
  `
}
