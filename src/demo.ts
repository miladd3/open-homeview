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
