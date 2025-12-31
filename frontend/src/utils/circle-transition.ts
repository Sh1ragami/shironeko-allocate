export function navigateWithCircle(toHash: string, opts: { cx?: number; cy?: number } = {}): void {
  const cx = opts.cx ?? Math.floor(window.innerWidth / 2)
  const cy = opts.cy ?? Math.floor(window.innerHeight / 2)
  const el = document.createElement('div')
  el.className = 'circle-trans'
  el.style.setProperty('--cx', `${cx}px`)
  el.style.setProperty('--cy', `${cy}px`)
  document.body.appendChild(el)
  const lock = +(document.body.getAttribute('data-lock') || '0')
  if (lock === 0) document.body.style.overflow = 'hidden'
  document.body.setAttribute('data-lock', String(lock + 1))
  const finish = () => {
    // Start fade-out, then cleanup
    el.classList.add('ct-fade')
    setTimeout(() => {
      el.remove()
      const c = +(document.body.getAttribute('data-lock') || '0')
      const n = Math.max(0, c - 1)
      if (n === 0) document.body.style.overflow = ''
      document.body.setAttribute('data-lock', String(n))
    }, 260)
  }
  el.addEventListener('animationend', () => {
    // After expand completes, navigate
    window.location.hash = toHash
    // Allow new view to render a tick, then fade out overlay
    setTimeout(finish, 30)
  }, { once: true })
}

