export function renderPaint(container: HTMLElement): void {
  container.innerHTML = `
    <section class="min-h-screen gh-canvas text-gray-100">
      <div class="fixed left-3 top-3 z-10">
        <a href="#/project" class="rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-1.5 text-sm text-gray-200 hover:text-white">← プロジェクト一覧へ</a>
      </div>
      <div class="h-[100dvh] grid place-items-center">
        <div class="text-center max-w-[820px] px-6">
          <h1 class="text-3xl md:text-4xl font-bold">みんなでお絵かき（ハニカム）</h1>
          <p class="mt-3 text-gray-300">同じ場所でハニカムを塗って絵を描く場所です。リアルタイム共同編集は今後追加予定です。</p>
          <div class="mt-6 rounded-xl ring-2 ring-neutral-600 bg-neutral-900/40 p-6">
            <p class="text-sm text-gray-400">プレースホルダー</p>
            <div class="mt-3 text-gray-300">こちらのページにハニカムの共同お絵かき機能を追加していきます。</div>
          </div>
        </div>
      </div>
    </section>
  `
}

