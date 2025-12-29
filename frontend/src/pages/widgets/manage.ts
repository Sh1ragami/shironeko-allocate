import { apiFetch } from '../../utils/api'

type LibEntry = { id: string; type: 'custom'|'flow'; name: string; shape: Array<[number,number]>; rgb?: [number,number,number]; alpha?: number; flowGraph?: any }

function userLibKey(uid: number): string { return `pj-wp-lib-user-${uid}` }
function userLibGet(uid: number): LibEntry[] { try { const v = JSON.parse(localStorage.getItem(userLibKey(uid))||'[]') as LibEntry[]; return Array.isArray(v)? v: [] } catch { return [] } }
function userLibSet(uid: number, list: LibEntry[]): void { try { localStorage.setItem(userLibKey(uid), JSON.stringify(list)) } catch {} }
function wpLibGlobalKey(): string { return 'pj-wp-lib-global' }
function wpLibGlobalGet(): LibEntry[] { try { const v = JSON.parse(localStorage.getItem(wpLibGlobalKey())||'[]') as LibEntry[]; return Array.isArray(v)? v: [] } catch { return [] } }
function wpLibGlobalSet(list: LibEntry[]): void { try { localStorage.setItem(wpLibGlobalKey(), JSON.stringify(list)) } catch {} }

export async function renderWidgetManage(container: HTMLElement): Promise<void> {
  const me = await apiFetch<{ id?: number }>('/me').catch(() => ({ id: undefined }))
  const uid = me?.id ?? 0
  container.innerHTML = `
    <section class="min-h-screen gh-canvas text-gray-100 p-4 md:p-6">
      <a href="#/project" class="inline-block mb-3 rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-1.5 text-sm text-gray-200 hover:text-white">← プロジェクト一覧へ</a>
      <h1 class="text-xl md:text-2xl font-semibold">自作ウィジェット管理</h1>
      <p class="text-sm text-gray-400">自作ウィジェットの名称変更や削除、共有への投稿ができます。</p>
      <div class="mt-4 grid gap-3" id="myList"></div>
    </section>
  `
  const mineEl = container.querySelector('#myList') as HTMLElement

  const renderMine = () => {
    const list = userLibGet(uid)
    mineEl.innerHTML = ''
    if (!list.length) { mineEl.innerHTML = '<div class="text-sm text-gray-400">自作ウィジェットがありません。</div>'; return }
    list.forEach((en, idx) => {
      const row = document.createElement('div')
      row.className = 'flex items-center justify-between rounded bg-neutral-900/60 ring-2 ring-neutral-600 px-3 py-2'
      const nameWrap = document.createElement('div')
      nameWrap.className = 'flex-1 flex items-center gap-2 pr-3'
      const name = document.createElement('input')
      name.className = 'flex-1 min-w-[140px] rounded bg-neutral-800/60 ring-2 ring-neutral-600 px-2 py-1 text-gray-100 text-sm'
      name.value = en.name || (en.type === 'flow' ? 'フロー' : 'カスタム')
      const save = document.createElement('button')
      save.className = 'rounded bg-sky-700 hover:bg-sky-600 text-white text-xs font-medium px-2.5 py-1'
      save.textContent = '名称保存'
      save.addEventListener('click', () => {
        const cur = userLibGet(uid)
        cur[idx] = { ...cur[idx], name: name.value || cur[idx].name }
        userLibSet(uid, cur)
      })
      nameWrap.appendChild(name)
      nameWrap.appendChild(save)
      const btns = document.createElement('div')
      btns.className = 'flex items-center gap-2'
      const pubBtn = document.createElement('button')
      pubBtn.className = 'rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1'
      pubBtn.textContent = '共有に投稿'
      pubBtn.addEventListener('click', () => {
        const g = wpLibGlobalGet()
        const copy = { ...en, id: `gbl-${Date.now()}`, owner: uid } as any
        wpLibGlobalSet(g.concat(copy))
        pubBtn.textContent = '投稿済み'
        pubBtn.setAttribute('disabled', 'true')
      })
      const delBtn = document.createElement('button')
      delBtn.className = 'rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-medium px-2.5 py-1'
      delBtn.textContent = '削除'
      delBtn.addEventListener('click', () => {
        const cur = userLibGet(uid).filter(x => x.id !== en.id)
        userLibSet(uid, cur)
        renderMine()
      })
      btns.appendChild(pubBtn)
      btns.appendChild(delBtn)
      row.appendChild(nameWrap)
      row.appendChild(btns)
      mineEl.appendChild(row)
    })
  }

  renderMine()
}

