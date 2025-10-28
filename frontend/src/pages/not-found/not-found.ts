export function renderNotFound(container: HTMLElement): void {
  container.innerHTML = `
    <section class="p-6 text-center">
      <h1 class="text-2xl font-bold text-rose-700 mb-2">404 Not Found</h1>
      <p class="text-gray-700 mb-4">お探しのページは見つかりませんでした。</p>
      <a href="#/" class="text-blue-600 underline">トップへ戻る</a>
    </section>
  `
}

