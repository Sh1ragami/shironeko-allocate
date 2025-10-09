type Health = { status: string; time: string }

const apiBase = (import.meta as any).env?.VITE_API_BASE || '/api'

async function loadHealth(): Promise<void> {
  const box = document.getElementById('health')
  if (!box) return
  try {
    const res = await fetch(`${apiBase}/health`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as Health
    box.innerHTML = `
      <h2 class="text-lg font-semibold mb-2">API Health</h2>
      <div class="text-emerald-700">
        <p>Status: ${data.status}</p>
        <p>Time: ${data.time}</p>
      </div>
    `
  } catch (e: any) {
    box.innerHTML = `
      <h2 class="text-lg font-semibold mb-2">API Health</h2>
      <p class="text-rose-700">Error: ${e?.message ?? 'unknown error'}</p>
    `
  }
}

loadHealth()

