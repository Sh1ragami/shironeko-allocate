export type ThemeId = 'dark' | 'warm' | 'sakura'

const THEME_KEY = 'ua-theme'

export function getTheme(): ThemeId {
  try {
    const v = (localStorage.getItem(THEME_KEY) || 'dark') as ThemeId
    return (['dark', 'warm', 'sakura'] as ThemeId[]).includes(v) ? v : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme: ThemeId, scope?: HTMLElement | Document): void {
  const root = (scope as any)?.documentElement || document.documentElement
  root.setAttribute('data-theme', theme)
}

export function setTheme(theme: ThemeId): void {
  try { localStorage.setItem(THEME_KEY, theme) } catch {}
  applyTheme(theme)
}
