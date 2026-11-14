import { parse } from 'yaml'

import { ConfigError, type HomeConfig, parseHomeConfig } from './home'

export const CONFIG_URL = `${import.meta.env.BASE_URL}config/kiosk.yaml`

export interface ConfigSource {
  text: string
  /** No kiosk.yaml yet: the server sent the example instead. */
  isExample: boolean
}

/** Raw kiosk.yaml text, never from cache so edits show up on the next check. */
export async function fetchConfigSource(): Promise<ConfigSource> {
  const response = await fetch(CONFIG_URL, { cache: 'no-store' })
  if (!response.ok) throw new ConfigError(`${CONFIG_URL} returned HTTP ${response.status}`)
  return {
    text: await response.text(),
    // Set by the server (server/app.ts, EXAMPLE_HEADER).
    isExample: response.headers.get('x-kiosk-config') === 'example',
  }
}

export function parseConfigSource(source: string): HomeConfig {
  let raw: unknown
  try {
    raw = parse(source)
  } catch (error) {
    throw new ConfigError(`kiosk.yaml is not valid YAML: ${(error as Error).message}`)
  }
  return parseHomeConfig(raw)
}
