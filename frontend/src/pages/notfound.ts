export function renderNotFound(container: HTMLElement): void {
  container.innerHTML = `
    <div class="min-h-screen gh-canvas text-gray-100 grid place-items-center p-8">
      <div class="max-w-4xl w-full flex items-center gap-8 rounded-xl ring-2 ring-neutral-600 bg-neutral-900/50 p-8">
        <div class="flex-1 text-left">
          <div class="text-2xl md:text-3xl font-semibold mb-3">お探しのページが見つかりません。</div>
          <p class="text-gray-300">アドレスが正しいか、URLが変更されていないかをご確認ください。</p>
          <div class="mt-6 flex gap-3 text-sm">
            <a href="#/project" class="rounded-md bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2">ホーム（プロジェクトへ）</a>
            <a href="#/login" class="rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 text-gray-200 px-4 py-2">ログインへ</a>
            <button id="nfBack" class="rounded-md bg-neutral-800/60 ring-2 ring-neutral-600 text-gray-200 px-4 py-2">戻る</button>
          </div>
        </div>
        <div class="shrink-0 w-[260px] md:w-[320px] grid place-items-center">
          <div class="flex items-center gap-4">
            <span class="text-2xl md:text-3xl">▶</span>
            <img id="nfImg" alt="404" class="max-w-[220px] md:max-w-[280px] h-auto rounded" />
          </div>
        </div>
      </div>
    </div>
  `
  // Bind back button
  container.querySelector('#nfBack')?.addEventListener('click', () => history.back())

  // Try multiple candidate paths for the provided PNG
  const candidates = [
    '/src/public/404.png',
    '/src/public/notfound.png',
    '/src/public/404-notfound.png',
    '/public/404.png',
    '/404.png',
  ]
  const img = container.querySelector('#nfImg') as HTMLImageElement | null
  if (img) {
    let i = 0
    const tryNext = () => {
      if (i >= candidates.length) return
      img.src = candidates[i++]
      img.onerror = tryNext
    }
    tryNext()
  }
}

