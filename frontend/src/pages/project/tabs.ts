export type TabTemplate =
  | 'blank'
  | 'kanban'
  | 'notes'
  | 'docs'
  | 'report'
  | 'roadmap'
  | 'burndown'
  | 'timeline'
  | 'mock'

type PickerOptions = {
  onSelect: (type: TabTemplate) => void
}

export function openTabPickerModal(root: HTMLElement, opts: PickerOptions): void {
  const overlay = document.createElement('div')
  overlay.className = 'fixed inset-0 z-[65] bg-black/60 backdrop-blur-[1px] grid place-items-center fade-overlay'
  overlay.innerHTML = `
    <div class="relative w-[min(1200px,96vw)] max-h-[90vh] overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-neutral-700/70 shadow-2xl text-gray-100 pop-modal">
      <header class="h-12 flex items-center px-5 border-b border-neutral-800/70">
        <h3 class="text-lg font-semibold">タブ一覧</h3>
        <button id="tp-close" class="ml-auto text-2xl text-neutral-300 hover:text-white">×</button>
      </header>
      <div class="flex h-[calc(90vh-3rem)]">
        <aside class="w-64 shrink-0 p-4 border-r border-neutral-800/70 space-y-2">
          <div class="text-sm text-gray-300 mb-2">種別</div>
          <button class="tp-cat w-full text-left px-3 py-2 rounded bg-neutral-800/70 ring-1 ring-neutral-700/60 text-sm" data-cat="all">すべて</button>
          <button class="tp-cat w-full text-left px-3 py-2 rounded hover:bg-neutral-800/40 text-sm" data-cat="boards">ボード</button>
          <button class="tp-cat w-full text-left px-3 py-2 rounded hover:bg-neutral-800/40 text-sm" data-cat="docs">ドキュメント</button>
          <button class="tp-cat w-full text-left px-3 py-2 rounded hover:bg-neutral-800/40 text-sm" data-cat="analytics">可視化</button>
          <button class="tp-cat w-full text-left px-3 py-2 rounded hover:bg-neutral-800/40 text-sm" data-cat="planning">計画</button>
        </aside>
        <section class="flex-1 p-8 overflow-y-auto h-full">
          <div class="grid grid-cols-3 lg:grid-cols-4 auto-rows-min gap-x-12 gap-y-10 min-h-[28rem]" id="tplGrid">
            ${templateCard('blank', '空白のタブ')}
            ${templateCard('kanban', 'カンバンボード', true)}
            ${templateCard('notes', 'ノート')}
            ${templateCard('docs', 'ドキュメント')}
            ${templateCard('report', 'レポート')}
            ${templateCard('roadmap', 'ロードマップ')}
            ${templateCard('burndown', 'バーンダウン')}
            ${templateCard('timeline', 'タイムライン')}
          </div>
        </section>
      </div>
    </div>
  `
  const close = () => { overlay.remove(); const c=+(document.body.getAttribute('data-lock')||'0'); const n=Math.max(0,c-1); if(n===0){ document.body.style.overflow=''; } document.body.setAttribute('data-lock', String(n)) }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#tp-close')?.addEventListener('click', close)

  // delegated click
  const grid = overlay.querySelector('#tplGrid') as HTMLElement | null
  grid?.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest('[data-tpl]') as HTMLElement | null
    if (!card || !grid.contains(card)) return
    const type = card.getAttribute('data-tpl') as TabTemplate
    opts.onSelect(type)
    close()
  })

  // Category filtering
  const cats = overlay.querySelectorAll('.tp-cat')
  const getCat = (t: TabTemplate): string => {
    if (t === 'kanban') return 'boards'
    if (t === 'notes' || t === 'docs') return 'docs'
    if (t === 'report' || t === 'burndown' || t === 'timeline') return 'analytics'
    if (t === 'roadmap') return 'planning'
    return 'all'
  }
  const applyCat = (cat: string) => {
    grid?.querySelectorAll('[data-tpl]')?.forEach((n) => {
      const t = (n as HTMLElement).getAttribute('data-tpl') as TabTemplate
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

function templateCard(type: TabTemplate, title: string, highlight = false): string {
  const ring = highlight ? 'ring-emerald-700/70' : 'ring-neutral-700/60'
  return `
    <button data-tpl="${type}" class="group block rounded-xl overflow-hidden ring-1 ${ring} hover:ring-emerald-600 transition pop-card btn-press">
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
  if (type === 'notes') return `<div class="p-4 text-left text-gray-400 w-full h-full"># ノート\n- 箇条書き\n- 決定事項</div>`
  if (type === 'docs') return `<div class="p-4 text-left text-gray-400 w-full h-full">ドキュメント構成\n- はじめに\n- 手順</div>`
  if (type === 'report') return `<div class="p-4 w-full h-full"><div class=\"h-2 bg-emerald-600 w-2/3 rounded mb-2\"></div><div class=\"h-2 bg-neutral-700/70 w-1/2 rounded\"></div></div>`
  if (type === 'roadmap') return `<div class="p-3 text-gray-400 w-full h-full">Q1 → Q2 → Q3</div>`
  if (type === 'burndown') return `<div class="w-full h-full grid place-items-center text-gray-400">\/\\</div>`
  if (type === 'timeline') return `<div class="p-3 w-full h-full text-gray-400">|—|——|—|</div>`
  if (type === 'blank') return `<div class="text-gray-500">空白のタブ</div>`
  return `<div class="text-gray-500">モックアップタブ</div>`
}
