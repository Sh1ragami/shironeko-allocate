type Status = 'todo' | 'doing' | 'review' | 'done'

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

const STATUS_DEF: Record<Status, { label: string; color: string }> = {
  todo: { label: '未着手', color: 'bg-sky-700' },
  doing: { label: '進行中', color: 'bg-emerald-700' },
  review: { label: 'レビュー中', color: 'bg-yellow-600' },
  done: { label: '完了', color: 'bg-rose-600' },
}

function loadTasks(pid: string): Task[] {
  try { return JSON.parse(localStorage.getItem(`kb-${pid}`) || '[]') as Task[] } catch { return [] }
}
function saveTasks(pid: string, tasks: Task[]): void { localStorage.setItem(`kb-${pid}`, JSON.stringify(tasks)) }
function esc(s: string): string { return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string)) }

export function openTaskModal(root: HTMLElement, pid: string, taskId: string): void {
  const tasks = loadTasks(pid)
  const t = tasks.find((x) => x.id === taskId)
  if (!t) return
  const overlay = document.createElement('div')
  overlay.className = 'fixed inset-0 z-[80] bg-black/60 backdrop-blur-[1px] grid place-items-center'
  overlay.innerHTML = `
    <div class="relative w-[min(980px,95vw)] max-h-[90vh] overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-neutral-700/70 shadow-2xl text-gray-100">
      <div class="flex items-center h-12 px-6 border-b border-neutral-800/70">
        <div class="text-xl font-semibold">${esc(t.title)} <span class="text-gray-400 text-base">#${t.id}</span></div>
        <div class="ml-auto text-sm text-gray-300">${t.due ? `${t.due} まで` : ''}</div>
        <button class="ml-4 text-2xl text-neutral-300 hover:text-white" id="tk-close">×</button>
      </div>
      <div class="p-6 space-y-6 overflow-y-auto" style="max-height: calc(90vh - 3rem);">
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center rounded-full ${STATUS_DEF[t.status].color} text-white text-xs px-2 py-0.5">${STATUS_DEF[t.status].label}</span>
          <div class="flex items-center gap-2 text-sm text-gray-300">
            <span class="w-3.5 h-3.5 rounded-full bg-neutral-500"></span>
            <span>${esc(t.assignee || 'Sh1ragami')}</span>
          </div>
        </div>
        <div class="rounded-lg ring-1 ring-neutral-800/70 bg-neutral-900/70">
          <div class="px-4 py-2 text-sm text-gray-300 border-b border-neutral-800/70">説明</div>
          <textarea id="tk-desc" class="w-full bg-transparent px-4 py-3 outline-none text-gray-100" rows="6" placeholder="タスク説明を記入">${esc(t.description || '')}</textarea>
        </div>
        <div class="rounded-lg ring-1 ring-neutral-800/70 bg-neutral-900/70 p-4">
          <div class="text-sm text-gray-300 mb-4">アクティビティ</div>
          <ol class="space-y-3 text-sm">
            ${(t.history || []).map(h => `<li class=\"flex items-start gap-3\"><span class=\"w-2 h-2 rounded-full bg-neutral-500 mt-2\"></span><div><div class=\"text-gray-400\">${esc(h.by)} <span class=\"ml-2\">${esc(h.at)}</span></div><div class=\"text-gray-200\">${esc(h.text)}</div></div></li>`).join('')}
          </ol>
        </div>
        <div class="rounded-lg ring-1 ring-neutral-800/70 bg-neutral-900/70">
          <div class="px-4 py-2 text-sm text-gray-300 border-b border-neutral-800/70">コメントを追加する</div>
          <div class="p-4 space-y-3">
            <textarea id="tk-comment" rows="4" class="w-full rounded-md bg-neutral-800/60 ring-1 ring-neutral-700/60 px-3 py-2 text-gray-100 placeholder:text-gray-500" placeholder="Markdown を使ってコメントを書けます"></textarea>
            <div class="flex justify-end">
              <button id="tk-submit" class="rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2">コメントを追加</button>
            </div>
          </div>
        </div>
      </div>
    </div>`
  const close = () => overlay.remove()
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#tk-close')?.addEventListener('click', close)
  const save = () => { const arr = loadTasks(pid); const i = arr.findIndex(x=>x.id===t.id); if (i>=0){ arr[i]=t; saveTasks(pid, arr) } }
  const desc = overlay.querySelector('#tk-desc') as HTMLTextAreaElement | null
  desc?.addEventListener('blur', () => { t.description = desc.value; save() })
  overlay.querySelector('#tk-submit')?.addEventListener('click', () => {
    const ta = overlay.querySelector('#tk-comment') as HTMLTextAreaElement
    const text = ta.value.trim(); if (!text) return
    t.comments = t.comments || []; t.comments.push({ id: String(Date.now()), author: 'あなた', text, at: new Date().toLocaleString() })
    t.history = t.history || []; t.history.push({ at: new Date().toLocaleString(), by: 'あなた', text: 'コメントを追加しました。' })
    save(); close();
    const container = root
    // 再描画
    const id = container.querySelector('#widgetGrid') ? pid : pid
  })
  document.body.appendChild(overlay)
}
