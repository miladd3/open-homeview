// The live demo: scales the 1280x720 kiosk into the screen, switches its theme
// (?theme=, see src/demo.ts) and sends it actions with postMessage.

const screen = document.getElementById('screen')
const kiosk = document.getElementById('kiosk')

function fit() {
  screen.style.setProperty('--scale', String(screen.clientWidth / 1280))
  // Full screen: fit the whole 16:9 kiosk, letterboxed.
  if (document.fullscreenElement === screen) {
    const scale = Math.min(screen.clientWidth / 1280, screen.clientHeight / 720)
    screen.style.setProperty('--scale', String(scale))
    kiosk.style.left = `${(screen.clientWidth - 1280 * scale) / 2}px`
    kiosk.style.top = `${(screen.clientHeight - 720 * scale) / 2}px`
  } else {
    kiosk.style.left = kiosk.style.top = ''
  }
}
new ResizeObserver(fit).observe(screen)
fit()

kiosk.addEventListener('load', () => {
  screen.classList.add('-ready')
  screen.classList.remove('-switching')
})

function send(action) {
  kiosk.contentWindow?.postMessage({ source: 'open-homeview-site', action }, location.origin)
}

for (const button of document.querySelectorAll('[data-action]'))
  button.addEventListener('click', () => send(button.dataset.action))

for (const button of document.querySelectorAll('[data-theme]'))
  button.addEventListener('click', () => {
    if (button.getAttribute('aria-checked') === 'true') return
    for (const other of document.querySelectorAll('[data-theme]'))
      other.setAttribute('aria-checked', String(other === button))
    screen.classList.add('-switching')
    setTimeout(() => (kiosk.src = `demo/?theme=${button.dataset.theme}`), 250)
  })

document.getElementById('fullscreen').addEventListener('click', () => {
  if (screen.requestFullscreen) screen.requestFullscreen().catch(() => window.open(kiosk.src))
  else window.open(kiosk.src)
})

for (const button of document.querySelectorAll('[data-copy]'))
  button.addEventListener('click', async () => {
    const text = document.getElementById(button.dataset.copy).textContent
    try {
      await navigator.clipboard.writeText(text)
      button.textContent = 'Copied'
    } catch {
      button.textContent = 'Select and copy'
    }
    setTimeout(() => (button.textContent = 'Copy'), 1600)
  })
