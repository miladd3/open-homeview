import type { HomeConfig } from '@/config/home'
import { LiveConnection } from './LiveConnection'
import { MockConnection } from './mock/MockConnection'
import type { HaConnection } from './types'

/**
 * The mock runs when no Home Assistant is configured for `npm run dev` (see
 * vite.config.ts) or when the URL has `?mock`. Production builds are always live.
 */
export function isMockMode() {
  return (
    import.meta.env.VITE_HA_MOCK === 'true' ||
    new URLSearchParams(window.location.search).has('mock')
  )
}

export function createConnection(config: HomeConfig): HaConnection {
  return isMockMode() ? new MockConnection(config) : new LiveConnection()
}
