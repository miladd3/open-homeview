// The public demo (`npm run build:site`): a static build against the mock, with
// no server. kiosk.yaml is a static file, the on-screen editor saves to the
// browser, and the landing page around the demo (site/) can switch the theme
// (`?theme=`) and send `ring` / `sleep` with postMessage.

import { parseDocument } from 'yaml'

// Types only: config/layout.ts imports this file, and the stores would make a cycle.
import type { MockConnection } from '@/ha/mock/MockConnection'
import type { useConfigStore } from '@/stores/config'
import type { useKioskStore } from '@/stores/kiosk'

export const isDemo = import.meta.env.VITE_DEMO === 'true'

const LAYOUT_KEY = 'open-homeview-demo:layout'
/** The saved layout when the browser has no storage (private window). */
let unsavedLayout: string | undefined

/** kiosk.yaml with the theme from `?theme=` (and `?mode=`, `?graphics=`), if any. */
export function demoConfigText(text: string): string {
  const params = new URLSearchParams(window.location.search)
  const theme = params.get('theme')
  const mode = params.get('mode')
  const graphics = params.get('graphics')
  if (!theme && !mode && !graphics) return text
  const doc = parseDocument(text)
  if (typeof doc.get('theme') === 'string') doc.set('theme', { name: doc.get('theme') })
  if (theme) doc.setIn(['theme', 'name'], theme)
  if (mode) doc.setIn(['theme', 'mode'], mode)
  if (graphics) doc.setIn(['theme', 'graphics'], graphics)
  return doc.toString()
}

export function demoLayout(): string | undefined {
  try {
    return localStorage.getItem(LAYOUT_KEY) ?? undefined
  } catch {
    return unsavedLayout
  }
}

/** The editor's server calls (config/layout.ts), answered in the browser. */
export async function demoCall(method: string, path: string, body?: unknown) {
  if (path !== 'layout') return // `pin`: the demo has no PIN.
  unsavedLayout = method === 'PUT' ? JSON.stringify(body) : undefined
  try {
    if (unsavedLayout) localStorage.setItem(LAYOUT_KEY, unsavedLayout)
    else localStorage.removeItem(LAYOUT_KEY)
  } catch {
    // No storage: the edit lasts until the page reloads.
  }
}

type DemoMessage = { source: 'open-homeview-site'; action: 'ring' | 'sleep' | 'wake' }

/** Lets the landing page (same origin, the parent frame) work the demo. */
export function listenToSite(
  mock: MockConnection,
  config: ReturnType<typeof useConfigStore>,
  kiosk: ReturnType<typeof useKioskStore>,
) {
  window.addEventListener('message', (event: MessageEvent<DemoMessage>) => {
    if (event.origin !== window.location.origin || event.data?.source !== 'open-homeview-site')
      return
    const { action } = event.data
    if (action === 'ring' && config.home.events[0]) mock.fireEvent(config.home.events[0])
    if (action === 'sleep') {
      kiosk.closeOverlay() // the kiosk stays awake under an open camera
      kiosk.sleep()
    }
    if (action === 'wake') kiosk.wake()
  })
  window.parent.postMessage({ source: 'open-homeview-demo', ready: true }, window.location.origin)
}

// ---- touch on a laptop ----

const DRAG_START_PX = 8
/** A swipe this far (share of the page width), or this fast (px/ms), turns the page. */
const PAGE_TURN_SHARE = 0.15
const PAGE_TURN_SPEED = 0.4
const FINGER_PX = 44

/** The nearest element that scrolls along this axis. */
function scrollerOf(target: Element | null, axis: 'x' | 'y'): HTMLElement | null {
  for (let el = target as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
    const overflow = getComputedStyle(el)[axis === 'x' ? 'overflowX' : 'overflowY']
    const scrolls =
      axis === 'x' ? el.scrollWidth > el.clientWidth + 1 : el.scrollHeight > el.clientHeight + 1
    if (scrolls && (overflow === 'auto' || overflow === 'scroll')) return el
  }
  return null
}

/**
 * Makes a mouse act like a finger, for visitors on a laptop: dragging swipes the
 * pages and standby faces (native scroll-snap only follows touch and trackpads)
 * and scrolls long sheets, and a round fingertip replaces the arrow.
 */
export function imitateTouch() {
  let press:
    | {
        x: number
        y: number
        t: number
        target: Element
        scroller?: HTMLElement
        axis?: 'x' | 'y'
        from: number
      }
    | undefined
  let swallowClick = false

  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    swallowClick = false
    const target = event.target as Element
    // Leave sliders and the layout editor's widget dragging alone.
    if (target.closest('[role="slider"], .dashboard-host.-editing .slot')) return
    press = { x: event.clientX, y: event.clientY, t: event.timeStamp, target, from: 0 }
  })

  window.addEventListener('pointermove', (event) => {
    if (!press || event.pointerType !== 'mouse') return
    const dx = event.clientX - press.x
    const dy = event.clientY - press.y
    if (!press.scroller) {
      if (Math.hypot(dx, dy) < DRAG_START_PX) return
      const axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      const scroller = scrollerOf(press.target, axis)
      if (!scroller) return (press = undefined)
      Object.assign(press, {
        scroller,
        axis,
        from: axis === 'x' ? scroller.scrollLeft : scroller.scrollTop,
      })
      // Follow the pointer freely; snapping comes back on release.
      scroller.style.scrollSnapType = 'none'
      scroller.style.scrollBehavior = 'auto'
    }
    if (press.axis === 'x') press.scroller!.scrollLeft = press.from - dx
    else press.scroller!.scrollTop = press.from - dy
  })

  function release(event: PointerEvent) {
    if (!press || event.pointerType !== 'mouse') return
    const { scroller, axis, from } = press
    if (scroller) {
      swallowClick = true // the drag isn't also a tap
      if (axis === 'x') {
        const width = scroller.clientWidth
        const dx = event.clientX - press.x
        const speed = Math.abs(dx) / Math.max(1, event.timeStamp - press.t)
        const turn =
          Math.abs(dx) > width * PAGE_TURN_SHARE || speed > PAGE_TURN_SPEED ? -Math.sign(dx) : 0
        const page = Math.max(0, Math.round(from / width) + turn)
        scroller.scrollTo({
          left: Math.min(page * width, scroller.scrollWidth - width),
          behavior: 'smooth',
        })
        setTimeout(() => (scroller.style.scrollSnapType = ''), 450)
      } else scroller.style.scrollSnapType = ''
      scroller.style.scrollBehavior = ''
    }
    press = undefined
  }
  window.addEventListener('pointerup', release)
  window.addEventListener('pointercancel', release)
  window.addEventListener(
    'click',
    (event) => {
      if (!swallowClick) return
      swallowClick = false
      event.stopPropagation()
      event.preventDefault()
    },
    true,
  )
  window.addEventListener('dragstart', (event) => event.preventDefault())

  // The fingertip, only where there is a real mouse (`?finger` forces it, for recording the README GIF).
  const forced = new URLSearchParams(window.location.search).has('finger')
  if (!forced && !matchMedia('(hover: hover) and (pointer: fine)').matches) return
  const style = document.createElement('style')
  style.textContent = `
    html.-demo-finger, html.-demo-finger * { cursor: none !important; user-select: none; }
    .demo-finger {
      position: fixed; top: 0; left: 0; z-index: 2147483647; pointer-events: none;
      width: ${FINGER_PX}px; height: ${FINGER_PX}px; margin: -${FINGER_PX / 2}px 0 0 -${FINGER_PX / 2}px;
      border-radius: 50%; opacity: 0;
      background: radial-gradient(circle, rgb(255 255 255 / 45%), rgb(255 255 255 / 22%) 70%);
      box-shadow: 0 0 0 1.5px rgb(255 255 255 / 55%), 0 3px 12px rgb(0 0 0 / 35%);
      transition: opacity .15s ease, scale .12s ease, background .12s ease;
    }
    .demo-finger.-on { opacity: 1; }
    .demo-finger.-down { scale: .78; background: radial-gradient(circle, rgb(255 255 255 / 70%), rgb(255 255 255 / 40%) 70%); }`
  document.head.append(style)
  const finger = document.createElement('div')
  finger.className = 'demo-finger'
  document.body.append(finger)
  document.documentElement.classList.add('-demo-finger')

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return
    finger.style.translate = `${event.clientX}px ${event.clientY}px`
    finger.classList.add('-on')
  })
  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') finger.classList.add('-down')
  })
  window.addEventListener('pointerup', () => finger.classList.remove('-down'))
  document.documentElement.addEventListener('mouseleave', () =>
    finger.classList.remove('-on', '-down'),
  )
}
