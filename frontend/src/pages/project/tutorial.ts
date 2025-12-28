export function renderTutorial(container: HTMLElement): void {
  container.innerHTML = `
    <section class="min-h-screen gh-canvas text-gray-100">
      <div class="fixed left-3 top-3 z-10">
        <a href="#/project" class="rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-1.5 text-sm text-gray-200 hover:text-white">← プロジェクト一覧へ</a>
      </div>
      <div class="h-[100dvh] grid place-items-center">
        <div class="text-center max-w-[720px] px-6">
          <h1 class="text-3xl md:text-4xl font-bold">チュートリアル</h1>
          <p class="mt-3 text-gray-300">アプリの使い方を順にご案内します。今後ここにステップガイドやデモを追加します。</p>
        </div>
      </div>
    </section>
  `
}

