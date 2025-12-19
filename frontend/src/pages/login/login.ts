import { GITHUB_LOGIN_URL } from '../../env'

export function renderLogin(container: HTMLElement): void {
  container.innerHTML = `
    <div class="min-h-screen gh-canvas text-gray-100">
      <!-- Header / Title -->
      <header class="px-8 pt-10 border-b border-neutral-700/60">
        <h1 class="text-3xl md:text-4xl font-semibold tracking-tight">アロケート</h1>
      </header>

      <!-- Main -->
      <main class="min-h-[70vh] flex flex-col items-center justify-center px-6">
        <!-- GitHub mark -->
        <div class="rounded-full bg-neutral-800/80 ring-2 ring-neutral-500/70 p-4 text-gray-100">
          <svg aria-hidden="true" viewBox="0 0 16 16" width="56" height="56" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </div>

        <h2 class="mt-6 text-2xl md:text-3xl font-medium text-center">GitHubアカウントでログイン</h2>

        <!-- Card -->
        <section class="mt-8 w-full max-w-md rounded-xl bg-neutral-800/55 ring-2 ring-neutral-600 shadow-xl p-6">
          <div class="mx-auto h-16 w-16 rounded-full bg-violet-600 grid place-items-center shadow">
            <div class="grid grid-cols-3 grid-rows-3 gap-0.5 text-white">
              <div class="w-3 h-3 bg-white/90 col-start-2 row-start-1"></div>
              <div class="w-3 h-3 bg-white/90 col-start-1 row-start-2"></div>
              <div class="w-3 h-3 bg-white/90 col-start-2 row-start-2"></div>
              <div class="w-3 h-3 bg-white/90 col-start-3 row-start-2"></div>
              <div class="w-3 h-3 bg-white/90 col-start-2 row-start-3"></div>
            </div>
          </div>

          <p class="mt-6 text-center text-sm text-gray-300">外部サイトに遷移します。</p>

          <div class="mt-5 flex justify-center">
            <a id="loginLink" href="${GITHUB_LOGIN_URL}" class="inline-flex items-center justify-center rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 shadow-lg shadow-emerald-900/30 transition-colors">
              ログイン
            </a>
          </div>
        </section>

        <!-- Disclaimer -->
        <p class="mt-10 text-center text-xs text-gray-400">
          続行することで
          <a href="#/terms" class="underline text-blue-400 hover:text-blue-300">利用規約</a>
          と
          <a href="#/privacy" class="underline text-blue-400 hover:text-blue-300">プライバシー</a>
          に同意したものとみなされます。
        </p>
      </main>
    </div>
  `
  // If explicitly logged out, force re-auth on next click
  const link = container.querySelector('#loginLink') as HTMLAnchorElement | null
  const forced = localStorage.getItem('justLoggedOut') === '1'
  if (link) link.href = forced ? `${GITHUB_LOGIN_URL}?force=1` : GITHUB_LOGIN_URL
  if (forced) localStorage.removeItem('justLoggedOut')
}
