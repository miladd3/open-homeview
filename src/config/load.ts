import { parse } from 'yaml'

import { ConfigError, type HomeConfig, parseHomeConfig } from './home'

export const CONFIG_URL = `${import.meta.env.BASE_URL}config/kiosk.yaml`

/** Raw kiosk.yaml text, never from cache so edits show up on the next check. */
export async function fetchConfigSource(): Promise<string> {
  const response = await fetch(CONFIG_URL, { cache: 'no-store' })
  if (!response.ok) throw new ConfigError(`${CONFIG_URL} returned HTTP ${response.status}`)
  return response.text()
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
