export function renderRoot(container: HTMLElement): void {
  // Render splash screen with logo
  container.innerHTML = `
    <div class="w-screen h-screen grid place-content-center bg-neutral-900">
      <img
        src="/src/public/imgs/allocate.png"
        alt="App Logo"
        class="w-64 h-auto animate-pulse"
      />
    </div>
  `

  // Redirect after a short delay
  setTimeout(() => {
    const token = localStorage.getItem('apiToken')
    if (token) {
      window.location.hash = '#/project'
    } else {
      window.location.hash = '#/login'
    }
  }, 500) // 0.5 second delay
}
