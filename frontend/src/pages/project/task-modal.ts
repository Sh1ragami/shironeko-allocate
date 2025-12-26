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

import { apiFetch } from '../../utils/api'

function loadTasks(pid: string): Task[] {
  try { return JSON.parse(localStorage.getItem(`kb-${pid}`) || '[]') as Task[] } catch { return [] }
}
function saveTasks(pid: string, tasks: Task[]): void { localStorage.setItem(`kb-${pid}`, JSON.stringify(tasks)) }
function esc(s: string): string { return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string)) }

function mdRenderInline(src: string): string {
  let s = (src || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>')
  s = s.replace(/`([^`]+)`/g, '<code class="bg-neutral-900 px-1 rounded">$1</code>')
  s = s.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" class="text-sky-400 hover:underline">$1</a>')
  return s
}

function mdRenderBlock(src: string): string {
  let s = (src || '')
  s = s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
  // Code block
  s = s.replace(/```([\s\S]*?)```/g, (m, p1) => `<pre class="rounded bg-neutral-900 ring-2 ring-neutral-600 p-3 overflow-auto"><code>${p1}</code></pre>`)
  // Headings
  s = s.replace(/^######\s?(.*)$/gm, '<h6 class="text-xs font-semibold mt-2">$1</h6>')
  s = s.replace(/^#####\s?(.*)$/gm, '<h5 class="text-sm font-semibold mt-2">$1</h5>')
  s = s.replace(/^####\s?(.*)$/gm, '<h4 class="text-base font-semibold mt-3">$1</h4>')
  s = s.replace(/^###\s?(.*)$/gm, '<h3 class="text-lg font-semibold mt-3">$1</h3>')
  s = s.replace(/^##\s?(.*)$/gm, '<h2 class="text-xl font-semibold mt-4">$1</h2>')
  s = s.replace(/^#\s?(.*)$/gm, '<h1 class="text-2xl font-semibold mt-4">$1</h1>')
  // inline
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*(.*?)\*/g, '<em>$1</em>')
  s = s.replace(/`([^`]+)`/g, '<code class="bg-neutral-900 px-1 rounded">$1</code>')
  s = s.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank" class="text-sky-400 hover:underline">$1</a>')
  // Lists
  s = s.replace(/^\s*\*\s+(.*)$/gm, '<li>$1</li>')
  s = s.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul class="list-disc ml-5">${m}</ul>`)
  // Paragraphs
  s = s.replace(/^(?!<h\d|<ul|<pre|<li|<\/li|<\/ul|<code|<strong|<em|<a)(.+)$/gm, '<p class="my-2">$1</p>')
  return s
}

export function openTaskModal(root: HTMLElement, pid: string, taskId: string): void {
  const tasks = loadTasks(pid)
  const t = tasks.find((x) => x.id === taskId)
  if (!t) return
  const overlay = document.createElement('div')
  overlay.className = 'fixed inset-0 z-[80] bg-black/60 backdrop-blur-[1px] grid place-items-center'
  overlay.innerHTML = `
    <div class="relative w-[min(980px,95vw)] overflow-hidden rounded-xl bg-neutral-900 ring-2 ring-neutral-600 shadow-2xl text-gray-100 pop-modal modal-fixed">
      <div class="flex items-center h-12 px-6 border-b border-neutral-600">
        <div class="text-2xl font-semibold truncate">${esc(t.title)} <span class="text-gray-400 text-base">#${t.id}</span></div>
        <div class="ml-auto text-sm text-gray-300">${t.due ? `${esc(t.due)} まで` : ''}</div>
        <button class="ml-4 text-2xl text-neutral-300 hover:text-white" id="tk-close">×</button>
      </div>
      <div class="flex-1 p-6 space-y-8 overflow-y-auto">
        <div class="flex items-center gap-4">
          <span class="inline-flex items-center rounded-full ${STATUS_DEF[t.status].color} text-white text-xs px-2 py-0.5">${STATUS_DEF[t.status].label}</span>
          <div class="flex items-center gap-2 text-sm text-gray-300">
            <span class="w-3.5 h-3.5 rounded-full bg-neutral-500"></span>
            <span>${esc(t.assignee || 'Sh1ragami')}</span>
          </div>
        </div>

        <div class="rounded-lg ring-2 ring-neutral-600 bg-neutral-900/70 p-0 overflow-hidden">
          <div class="px-4 py-2 text-sm text-gray-300 border-b border-neutral-600 flex items-center">
            <div class="w-7 h-7 rounded-full bg-neutral-700 mr-3"></div>
            <div class="text-gray-400">${esc((t.history && t.history[0]?.by) || 'Sh1ragami')} <span class="ml-2">${esc((t.history && t.history[0]?.at) || '')} に作成しました。</span></div>
          </div>
          <div class="px-4 py-3 text-gray-100 whitespace-pre-wrap">${mdRenderInline(t.description || '')}</div>
        </div>

        <div class="rounded-lg ring-2 ring-neutral-600 bg-neutral-900/70 p-4">
          <div class="text-sm text-gray-300 mb-4">アクティビティ</div>
          <ol class="relative pl-6">
            ${(t.history || []).map(h => `
              <li class=\"mb-4\">
                <div class=\"absolute left-2 top-1 bottom-0 border-l border-neutral-700\"></div>
                <div class=\"w-3 h-3 rounded-full bg-neutral-500 absolute -left-0.5 mt-0.5\"></div>
                <div class=\"text-sm text-gray-400\">${esc(h.by)} <span class=\"ml-2\">${esc(h.at)}</span></div>
                <div class=\"text-gray-200\">${mdRenderInline(h.text)}</div>
              </li>
            `).join('')}
          </ol>
        </div>

        <div class="rounded-lg ring-2 ring-neutral-600 bg-neutral-900/70 p-4">
          <div class="text-sm text-gray-300 mb-4">アクティビティ</div>
          <ol class="relative pl-6">
            ${createdAt ? `
              <li class=\"mb-4\">
                <div class=\"absolute left-2 top-1 bottom-0 border-l border-neutral-700\"></div>
                <div class=\"w-3 h-3 rounded-full bg-neutral-500 absolute -left-0.5 mt-0.5\"></div>
                <div class=\"text-sm text-gray-400\">${esc(author)} <span class=\"ml-2\">${esc(createdAt)}</span></div>
                <div class=\"text-gray-200\">Issue を作成しました。</div>
              </li>
            ` : ''}
          </ol>
        </div>

        <div class="rounded-lg ring-2 ring-neutral-600 bg-neutral-900/70">
          <div class="px-4 py-2 text-sm text-gray-300 border-b border-neutral-600">コメントを追加する</div>
          <div class="px-4 pt-3">
            <div class="flex gap-6 text-sm text-gray-300 border-b border-neutral-700">
              <button id="tk-tab-edit" class="py-2 border-b-2 border-orange-500">コメント</button>
              <button id="tk-tab-prev" class="py-2 text-gray-400">プレビュー</button>
            </div>
            <div class="mt-3 text-xs text-gray-400 flex items-center gap-2">
              <span>H</span><span>B</span><span>I</span><span>code</span><span>•</span><span>1.</span><span>link</span>
            </div>
          </div>
          <div class="p-4">
            <textarea id="tk-comment" rows="6" class="w-full rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-gray-100 placeholder:text-gray-500" placeholder="Markdown を使ってコメントを書くことができます。"></textarea>
            <div id="tk-preview" class="hidden w-full rounded-md bg-neutral-900/40 ring-2 ring-neutral-600 px-3 py-3 text-gray-100 whitespace-pre-wrap"></div>
            <div class="mt-3 flex justify-end">
              <button id="tk-submit" class="rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2">コメントを追加</button>
            </div>
          </div>
        </div>
      </div>
    </div>`
  const close = () => { overlay.remove(); const c=+(document.body.getAttribute('data-lock')||'0'); const n=Math.max(0,c-1); if(n===0){ document.body.style.overflow=''; } document.body.setAttribute('data-lock', String(n)) }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#tk-close')?.addEventListener('click', close)
  const save = () => { const arr = loadTasks(pid); const i = arr.findIndex(x=>x.id===t.id); if (i>=0){ arr[i]=t; saveTasks(pid, arr) } }
  // Inline editing for description via prompt (ダブルクリックで編集)
  const descEl = overlay.querySelector('.rounded-lg .px-4.py-3') as HTMLElement | null
  if (descEl) {
    descEl.addEventListener('dblclick', () => {
      const next = window.prompt('説明を編集', t.description || '')
      if (next != null) { t.description = next; save(); (descEl as HTMLElement).innerHTML = mdRenderInline(t.description || '') }
    })
  }
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
  // comment editor tabs
  const ta = overlay.querySelector('#tk-comment') as HTMLTextAreaElement | null
  const prev = overlay.querySelector('#tk-preview') as HTMLElement | null
  const tEdit = overlay.querySelector('#tk-tab-edit') as HTMLElement | null
  const tPrev = overlay.querySelector('#tk-tab-prev') as HTMLElement | null
  const showEdit = () => {
    if (!ta || !prev || !tEdit || !tPrev) return
    ta.classList.remove('hidden'); prev.classList.add('hidden')
    tEdit.classList.add('border-orange-500'); tEdit.classList.remove('text-gray-400')
    tPrev.classList.remove('border-orange-500'); tPrev.classList.add('text-gray-400')
  }
  const showPrev = () => {
    if (!ta || !prev || !tEdit || !tPrev) return
    prev.innerHTML = mdRenderBlock(ta.value || '')
    ta.classList.add('hidden'); prev.classList.remove('hidden')
    tPrev.classList.add('border-orange-500'); tPrev.classList.remove('text-gray-400')
    tEdit.classList.remove('border-orange-500'); tEdit.classList.add('text-gray-400')
  }
  tEdit?.addEventListener('click', showEdit)
  tPrev?.addEventListener('click', showPrev)
  document.body.appendChild(overlay); (function(){ const c=+(document.body.getAttribute('data-lock')||'0'); if(c===0){ document.body.style.overflow='hidden' } document.body.setAttribute('data-lock', String(c+1)) })()
}

// GitHub-linked task modal (same layout; comments sync to GitHub)
export async function openTaskModalGh(root: HTMLElement, pid: string, issueNumber: string): Promise<void> {
  let issue: any | null = null
  try {
    const arr = await apiFetch<any[]>(`/projects/${pid}/issues?state=all`)
    issue = (arr || []).find((x) => String(x.number) === String(issueNumber)) || null
  } catch {
    issue = null
  }
  const title = issue?.title || `#${issueNumber}`
  const labels: string[] = issue?.labels || []
  const lane = (labels.find((l) => String(l).startsWith('kanban:')) || '').split(':')[1] as Status | ''
  const status: Status = lane && (lane === 'todo' || lane === 'doing' || lane === 'review' || lane === 'done') ? lane : (issue?.state === 'closed' ? 'done' : 'todo')
  const assignee = (issue?.assignees && issue.assignees[0]) ? issue.assignees[0] : ''
  const author = issue?.author || 'someone'
  const createdAt = issue?.created_at || ''
  const desc = issue?.body || ''

  const overlay = document.createElement('div')
  overlay.className = 'fixed inset-0 z-[80] bg-black/60 backdrop-blur-[1px] grid place-items-center'
  overlay.innerHTML = `
    <div class="relative w-[min(980px,95vw)] overflow-hidden rounded-xl bg-neutral-900 ring-2 ring-neutral-600 shadow-2xl text-gray-100 pop-modal modal-fixed">
      <div class="flex items-center h-12 px-6 border-b border-neutral-600">
        <div class="text-2xl font-semibold truncate">${esc(title)} <span class="text-gray-400 text-base">#${issueNumber}</span></div>
        <div class="ml-auto text-sm text-gray-300"></div>
        <button class="ml-4 text-2xl text-neutral-300 hover:text-white" id="tk-close">×</button>
      </div>
      <div class="flex-1 p-6 space-y-8 overflow-y-auto">
        <div class="flex items-center gap-4">
          <span class="inline-flex items-center rounded-full ${STATUS_DEF[status].color} text-white text-xs px-2 py-0.5">${STATUS_DEF[status].label}</span>
          <div class="flex items-center gap-2 text-sm text-gray-300">
            <span class="w-3.5 h-3.5 rounded-full bg-neutral-500"></span>
            <span>${esc(assignee || '未割当')}</span>
          </div>
        </div>

        <div class="rounded-lg ring-2 ring-neutral-600 bg-neutral-900/70 p-0 overflow-hidden">
          <div class="px-4 py-2 text-sm text-gray-300 border-b border-neutral-600 flex items-center">
            <div class="w-7 h-7 rounded-full bg-neutral-700 mr-3"></div>
            <div class="text-gray-400">${esc(author)}${createdAt ? `<span class=\"ml-2\">${esc(createdAt)} に作成しました。</span>` : ''}</div>
            <a href="#" id="tk-open-gh" class="ml-auto text-sky-400 hover:underline text-xs">GitHubで開く</a>
          </div>
          <div id="tk-desc-view" class="px-4 py-3 text-gray-100 whitespace-pre-wrap">${mdRenderInline(desc || '')}</div>
        </div>

        <div class="rounded-lg ring-2 ring-neutral-600 bg-neutral-900/70">
          <div class="px-4 py-2 text-sm text-gray-300 border-b border-neutral-600">コメントを追加する</div>
          <div class="px-4 pt-3">
            <div class="flex gap-6 text-sm text-gray-300 border-b border-neutral-700">
              <button id="tk-tab-edit" class="py-2 border-b-2 border-orange-500">コメント</button>
              <button id="tk-tab-prev" class="py-2 text-gray-400">プレビュー</button>
            </div>
          </div>
          <div class="p-4">
            <textarea id="tk-comment" rows="6" class="w-full rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 px-3 py-2 text-gray-100 placeholder:text-gray-500" placeholder="Markdown を使ってコメントを書くことができます。"></textarea>
            <div id="tk-preview" class="hidden w-full rounded-md bg-neutral-900/40 ring-2 ring-neutral-600 px-3 py-3 text-gray-100 whitespace-pre-wrap"></div>
            <div class="mt-3 flex justify-end">
              <button id="tk-submit" class="rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2">コメントを追加</button>
            </div>
          </div>
        </div>
      </div>
    </div>`
  const close = () => { overlay.remove(); const c=+(document.body.getAttribute('data-lock')||'0'); const n=Math.max(0,c-1); if(n===0){ document.body.style.overflow=''; } document.body.setAttribute('data-lock', String(n)) }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  overlay.querySelector('#tk-close')?.addEventListener('click', close)

  // Open on GitHub
  const repo = (root as any).getAttribute && (root as HTMLElement).getAttribute('data-repo-full') || ''
  overlay.querySelector('#tk-open-gh')?.addEventListener('click', (ev) => { ev.preventDefault(); if (repo) window.open(`https://github.com/${repo}/issues/${issueNumber}`, '_blank') })

  // Description edit: patch GitHub issue body
  const descEl = overlay.querySelector('#tk-desc-view') as HTMLElement | null
  if (descEl) {
    descEl.addEventListener('dblclick', async () => {
      const next = window.prompt('説明を編集 (GitHubに反映されます)', desc || '')
      if (next != null) {
        try { await apiFetch(`/projects/${pid}/issues/${issueNumber}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: next }) }) } catch {}
        descEl.innerHTML = mdRenderInline(next)
      }
    })
  }

  // Submit comment to GitHub
  const ta = overlay.querySelector('#tk-comment') as HTMLTextAreaElement | null
  const prev = overlay.querySelector('#tk-preview') as HTMLElement | null
  const tEdit = overlay.querySelector('#tk-tab-edit') as HTMLElement | null
  const tPrev = overlay.querySelector('#tk-tab-prev') as HTMLElement | null
  const showEdit = () => { if (!ta || !prev) return; ta.classList.remove('hidden'); prev.classList.add('hidden'); tEdit?.classList.add('border-orange-500'); tPrev?.classList.add('text-gray-400'); tPrev?.classList.remove('border-orange-500'); tEdit?.classList.remove('text-gray-400') }
  const showPrev = () => { if (!ta || !prev) return; prev.innerHTML = mdRenderBlock(ta.value || ''); ta.classList.add('hidden'); prev.classList.remove('hidden'); tPrev?.classList.add('border-orange-500'); tEdit?.classList.add('text-gray-400'); tEdit?.classList.remove('border-orange-500'); tPrev?.classList.remove('text-gray-400') }
  tEdit?.addEventListener('click', showEdit)
  tPrev?.addEventListener('click', showPrev)
  overlay.querySelector('#tk-submit')?.addEventListener('click', async () => {
    const text = (ta?.value || '').trim(); if (!text) return
    try { await apiFetch(`/projects/${pid}/issues/${issueNumber}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text }) }) } catch {}
    close()
  })

  document.body.appendChild(overlay); (function(){ const c=+(document.body.getAttribute('data-lock')||'0'); if(c===0){ document.body.style.overflow='hidden' } document.body.setAttribute('data-lock', String(c+1)) })()
}
