export type TabTemplate = 'blank' | 'kanban' | 'mock'

type PickerOptions = {
  onSelect: (type: TabTemplate) => void
}

export function openTabPickerModal(root: HTMLElement, opts: PickerOptions): void {
  const overlay = document.createElement('div')
  overlay.className = 'fixed inset-0 z-[65] bg-black/60 backdrop-blur-[1px] grid place-items-center'
  overlay.innerHTML = `
    <div class="relative w-[min(1200px,96vw)] max-h-[90vh] overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-neutral-700/70 shadow-2xl text-gray-100">
      <header class="h-12 flex items-center px-5 border-b border-neutral-800/70">
        <h3 class="text-lg font-semibold">タブ一覧</h3>
        <button id="tp-close" class="ml-auto text-2xl text-neutral-300 hover:text-white">×</button>
      </header>
      <div class="flex">
        <aside class="w-64 shrink-0 p-4 border-r border-neutral-800/70">
          <div class="text-sm text-gray-300 mb-2">種別</div>
          <button class="w-full text-left px-3 py-2 rounded bg-neutral-800/70 ring-1 ring-neutral-700/60 text-sm">すべて</button>
        </aside>
        <section class="flex-1 p-8 overflow-y-auto">
          <div class="grid grid-cols-3 lg:grid-cols-4 auto-rows-min gap-x-12 gap-y-10" id="tplGrid">
            ${templateCard('blank', '空白のタブ')}
            ${templateCard('kanban', 'カンバンボード', true)}
            ${templateCard('mock', 'モックアップタブ')}
            ${templateCard('mock', 'モックアップタブ')}
            ${templateCard('mock', 'モックアップタブ')}
            ${templateCard('mock', 'モックアップタブ')}
          </div>
        </section>
      </div>
    </div>
  `
  const close = () => overlay.remove()
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#tp-close')?.addEventListener('click', close)

  overlay.querySelectorAll('[data-tpl]')?.forEach((el) => {
    el.addEventListener('click', () => {
      const type = (el as HTMLElement).getAttribute('data-tpl') as TabTemplate
      opts.onSelect(type)
      close()
    })
  })

  document.body.appendChild(overlay)
}

function templateCard(type: TabTemplate, title: string, highlight = false): string {
  const ring = highlight ? 'ring-emerald-700/70' : 'ring-neutral-700/60'
  return `
    <button data-tpl="${type}" class="group block rounded-xl overflow-hidden ring-1 ${ring} hover:ring-emerald-600 transition">
      <div class="h-40 md:h-44 bg-neutral-800/80 grid place-items-center text-gray-300 relative">
        ${thumb(type)}
      </div>
      <div class="px-2 py-2 text-center text-sm font-medium">${title}</div>
    </button>
  `
}

function thumb(type: TabTemplate): string {
  if (type === 'kanban') {
    // simple miniature kanban preview
    return `
      <div class="absolute inset-0 p-4 grid grid-cols-4 gap-2">
        <div class="bg-neutral-900/90 ring-1 ring-neutral-700/60 rounded">
          <div class="h-3 bg-sky-700 rounded-t"></div>
          <div class="m-2 h-3 bg-neutral-700/70 rounded"></div>
          <div class="m-2 h-3 bg-neutral-700/70 rounded"></div>
        </div>
        <div class="bg-neutral-900/90 ring-1 ring-neutral-700/60 rounded">
          <div class="h-3 bg-emerald-700 rounded-t"></div>
          <div class="m-2 h-3 bg-neutral-700/70 rounded"></div>
          <div class="m-2 h-3 bg-neutral-700/70 rounded"></div>
        </div>
        <div class="bg-neutral-900/90 ring-1 ring-neutral-700/60 rounded">
          <div class="h-3 bg-yellow-600 rounded-t"></div>
          <div class="m-2 h-3 bg-neutral-700/70 rounded"></div>
          <div class="m-2 h-3 bg-neutral-700/70 rounded"></div>
        </div>
        <div class="bg-neutral-900/90 ring-1 ring-neutral-700/60 rounded">
          <div class="h-3 bg-rose-600 rounded-t"></div>
          <div class="m-2 h-3 bg-neutral-700/70 rounded"></div>
          <div class="m-2 h-3 bg-neutral-700/70 rounded"></div>
        </div>
      </div>
    `
  }
  // default blank
  return `<div class="text-gray-500">${type === 'blank' ? '空白のタブ' : 'モックアップタブ'}</div>`
}
