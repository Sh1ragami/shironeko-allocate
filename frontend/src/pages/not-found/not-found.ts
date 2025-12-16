export function renderNotFound(container: HTMLElement): void {
  const token = localStorage.getItem('apiToken')
  const backUrl = token ? '#/project' : '#/login'

  container.innerHTML = `
    <section class="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <img
        src="/src/public/imgs/aroneko.png"
        alt="Not Found イメージ"
        class="mx-auto mb-4 w-96 h-auto"
      />
      <a href="${backUrl}" class="text-sky-400 hover:text-sky-300 underline">トップへ戻る</a>
    </section>
  `
}

