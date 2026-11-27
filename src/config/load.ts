import { parse } from 'yaml'

import { demoConfigText, demoLayout, isDemo } from '@/demo'

import { ConfigError, type HomeConfig, parseHomeConfig } from './home'

export const CONFIG_URL = `${import.meta.env.BASE_URL}config/kiosk.yaml`
const LAYOUT_URL = `${import.meta.env.BASE_URL}config/layout.yaml`

export interface ConfigSource {
  text: string
  /** The on-screen editor's layout.yaml, if one was saved. */
  layout?: string
  /** No kiosk.yaml yet: the server sent the example instead. */
  isExample: boolean
  /** kiosk.yaml has an `editPin` (the server keeps the PIN itself). */
  pinSet: boolean
}

/** kiosk.yaml and layout.yaml, never from cache so edits show up on the next check. */
export async function fetchConfigSource(): Promise<ConfigSource> {
  const [response, layout] = await Promise.all([
    fetch(CONFIG_URL, { cache: 'no-store' }),
    fetch(LAYOUT_URL, { cache: 'no-store' }),
  ])
  if (!response.ok) throw new ConfigError(`${CONFIG_URL} returned HTTP ${response.status}`)
  if (isDemo)
    return {
      text: demoConfigText(await response.text()),
      layout: demoLayout(),
      isExample: false,
      pinSet: false,
    }
  return {
    text: await response.text(),
    layout: layout.ok ? await layout.text() : undefined,
    // Set by the server (server/kiosk.ts).
    isExample: response.headers.get('x-kiosk-config') === 'example',
    pinSet: response.headers.get('x-kiosk-edit-pin') === 'set',
  }
}

function parseYaml(source: string, file: string): unknown {
  try {
    return parse(source)
  } catch (error) {
    throw new ConfigError(`${file} is not valid YAML: ${(error as Error).message}`)
  }
}

/**
 * Parses kiosk.yaml. A layout.yaml replaces its dashboard; a bad one is ignored,
 * and `layoutProblem` says why. A bad kiosk.yaml throws.
 */
export function parseConfigSource(
  source: string,
  layout?: string,
): { home: HomeConfig; layoutProblem?: string } {
  const raw = parseYaml(source, 'kiosk.yaml') as Record<string, unknown> | null
  let layoutProblem: string | undefined
  if (layout !== undefined) {
    try {
      const { dashboard, ...rest } = (parseYaml(layout, 'layout.yaml') ?? {}) as Record<
        string,
        unknown
      >
      const extra = Object.keys(rest)
      if (extra.length) throw new ConfigError(`it may only have dashboard, not ${extra.join(', ')}`)
      if (dashboard === undefined) throw new ConfigError('it has no dashboard')
      return { home: parseHomeConfig({ ...raw, dashboard }) }
    } catch (error) {
      layoutProblem = `layout.yaml is ignored: ${(error as Error).message}`
    }
  }
  const home = parseHomeConfig(raw)
  if (layoutProblem) console.warn(`[config] ${layoutProblem}`)
  return { home, layoutProblem }
}
