// The on-screen editor's calls to the server (server/kiosk.ts). Each throws an
// Error with the server's reason ("Wrong PIN", "light.x is not in kiosk.yaml").

import { widgetSizes } from '@/apps'
import { demoCall, isDemo } from '@/demo'
import type { DashboardEntry, DashboardWidget } from './home'

async function call(method: string, path: string, pin?: string, body?: unknown) {
  if (isDemo) return demoCall(method, path, body)
  const response = await fetch(`${import.meta.env.BASE_URL}kiosk/${path}`, {
    method,
    headers: {
      ...(pin !== undefined && { 'x-kiosk-edit-pin': pin }),
      ...(body !== undefined && { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error((await response.text()) || `HTTP ${response.status}`)
}

/** The dashboard as layout.yaml writes it: each widget's entry, with `size` only when not the default. */
export function layoutOf(pages: DashboardWidget[][]): DashboardEntry[][] {
  return pages.map((page) =>
    page.map(({ app, entry, size }) => {
      if (size === widgetSizes(app)[0]) return entry
      return { ...(typeof entry === 'string' ? { type: entry } : entry), size }
    }),
  )
}

export const checkPin = (pin: string) => call('POST', 'pin', pin)
export const saveLayout = (dashboard: DashboardEntry[][], pin?: string) =>
  call('PUT', 'layout', pin, { dashboard })
export const resetLayout = (pin?: string) => call('DELETE', 'layout', pin)
