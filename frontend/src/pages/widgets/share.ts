import { apiFetch } from '../../utils/api'

type LibEntry = { id: string; type: 'custom'|'flow'; name: string; shape: Array<[number,number]>; rgb?: [number,number,number]; alpha?: number; flowGraph?: any; owner?: number }

function userLibKey(uid: number): string { return `pj-wp-lib-user-${uid}` }
function userLibGet(uid: number): LibEntry[] { try { const v = JSON.parse(localStorage.getItem(userLibKey(uid))||'[]') as LibEntry[]; return Array.isArray(v)? v: [] } catch { return [] } }
function userLibSet(uid: number, list: LibEntry[]): void { try { localStorage.setItem(userLibKey(uid), JSON.stringify(list)) } catch {} }
function wpLibGlobalKey(): string { return 'pj-wp-lib-global' }
function wpLibGlobalGet(): LibEntry[] { try { const v = JSON.parse(localStorage.getItem(wpLibGlobalKey())||'[]') as LibEntry[]; return Array.isArray(v)? v: [] } catch { return [] } }
function wpLibGlobalSet(list: LibEntry[]): void { try { localStorage.setItem(wpLibGlobalKey(), JSON.stringify(list)) } catch {} }

export async function renderWidgetShare(container: HTMLElement): Promise<void> {
  const me = await apiFetch<{ id?: number }>('/me').catch(() => ({ id: undefined }))
  const uid = me?.id ?? 0
  container.innerHTML = `
    <section class="min-h-screen gh-canvas text-gray-100 p-4 md:p-6">
      <a href="#/project" class="inline-block mb-3 rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-1.5 text-sm text-gray-200 hover:text-white">← プロジェクト一覧へ</a>
      <h1 class="text-xl md:text-2xl font-semibold">共有ウィジェット</h1>
      <p class="text-sm text-gray-400">みんなが投稿した自作ウィジェットをここから取得できます。</p>
      <div class="mt-4 grid gap-3" id="shareList"></div>
      <hr class="my-6 border-neutral-700"/>
      <h2 class="text-lg font-medium">自作ウィジェットを投稿</h2>
      <p class="text-sm text-gray-400">あなたの自作ウィジェットを共有カタログに投稿します。</p>
      <div class="mt-3 grid gap-3" id="myList"></div>
    </section>
  `
  const listEl = container.querySelector('#shareList') as HTMLElement
  const mineEl = container.querySelector('#myList') as HTMLElement

  const renderShared = () => {
    const list = wpLibGlobalGet()
    listEl.innerHTML = ''
    if (!list.length) {
      listEl.innerHTML = '<div class="text-sm text-gray-400">まだ共有されていません。</div>'
      return
    }
    list.forEach((en) => {
      const row = document.createElement('div')
      row.className = 'flex items-center justify-between rounded bg-neutral-900/60 ring-2 ring-neutral-600 px-3 py-2'
      const name = document.createElement('div')
      name.className = 'truncate pr-3'
      name.textContent = en.name || (en.type === 'flow' ? 'フロー' : 'カスタム')
      const btns = document.createElement('div')
      btns.className = 'flex items-center gap-2'
      const getBtn = document.createElement('button')
      getBtn.className = 'rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1'
      getBtn.textContent = '取得'
      getBtn.addEventListener('click', () => {
        const cur = userLibGet(uid)
        const copy: LibEntry = { ...en, id: `usr-${Date.now()}` }
        userLibSet(uid, cur.concat(copy))
        getBtn.textContent = '取得済み'
        getBtn.setAttribute('disabled', 'true')
      })
      btns.appendChild(getBtn)
      if (en.owner && en.owner === uid) {
        const del = document.createElement('button')
        del.className = 'rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-medium px-2.5 py-1'
        del.textContent = '削除'
        del.addEventListener('click', () => {
          const next = wpLibGlobalGet().filter(x => x.id !== en.id)
          wpLibGlobalSet(next)
          renderShared()
        })
        btns.appendChild(del)
      }
      row.appendChild(name)
      row.appendChild(btns)
      listEl.appendChild(row)
    })
  }

  const renderMine = () => {
    const list = userLibGet(uid)
    mineEl.innerHTML = ''
    if (!list.length) {
      mineEl.innerHTML = '<div class="text-sm text-gray-400">自作ウィジェットがありません。</div>'
      return
    }
    list.forEach((en) => {
      const row = document.createElement('div')
      row.className = 'flex items-center justify-between rounded bg-neutral-900/60 ring-2 ring-neutral-600 px-3 py-2'
      const name = document.createElement('div')
      name.className = 'truncate pr-3'
      name.textContent = en.name || (en.type === 'flow' ? 'フロー' : 'カスタム')
      const btns = document.createElement('div')
      btns.className = 'flex items-center gap-2'
      const pubBtn = document.createElement('button')
      pubBtn.className = 'rounded bg-sky-700 hover:bg-sky-600 text-white text-xs font-medium px-3 py-1'
      pubBtn.textContent = '投稿'
      pubBtn.addEventListener('click', () => {
        const cur = wpLibGlobalGet()
        const copy: LibEntry = { ...en, id: `gbl-${Date.now()}`, owner: uid }
        wpLibGlobalSet(cur.concat(copy))
        renderShared()
        pubBtn.textContent = '投稿済み'
        pubBtn.setAttribute('disabled', 'true')
      })
      btns.appendChild(pubBtn)
      row.appendChild(name)
      row.appendChild(btns)
      mineEl.appendChild(row)
    })
  }

  renderShared()
  renderMine()
}

