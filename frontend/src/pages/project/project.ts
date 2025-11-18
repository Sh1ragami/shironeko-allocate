import { apiFetch } from '../../utils/api'

export function renderProject(container: HTMLElement): void {
  container.innerHTML = `
    <div class="min-h-screen bg-neutral-900 text-gray-100">
      <header class="px-8 pt-10 flex items-center gap-4">
        <h1 class="text-3xl md:text-4xl font-semibold tracking-tight">プロジェクト一覧</h1>
        <span id="me" class="text-sm text-gray-400"></span>
      </header>
      <main class="p-8">
        <p class="text-gray-300">ログイン完了しました。</p>
      </main>
    </div>
  `

  // Try to load current user for confirmation
  apiFetch<{ id: number; name: string; email: string }>(`/me`)
    .then((me) => {
      const el = container.querySelector('#me')
      if (el) el.textContent = `（${me.name}）`
    })
    .catch(() => {
      // ignore
    })
}

