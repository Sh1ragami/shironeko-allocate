export function renderTutorial(container: HTMLElement): void {
  const src = 'https://petalite-bayberry-1f3.notion.site/ebd//2d7b972bdb4980fd9bcbe7349329ce8c'
  container.innerHTML = `
    <section class="min-h-screen gh-canvas text-gray-100">
      <div class="fixed left-3 top-3 z-10">
        <a href="#/project" class="rounded-md bg-neutral-800/70 ring-2 ring-neutral-600 px-3 py-1.5 text-sm text-gray-200 hover:text-white">← プロジェクト一覧へ</a>
      </div>
      <div class="w-full h-[100dvh]">
        <iframe src="${src}" title="Tutorial" width="100%" height="100%" frameborder="0" allowfullscreen style="display:block; border:0; width:100%; height:100%;"></iframe>
      </div>
    </section>
  `
}
