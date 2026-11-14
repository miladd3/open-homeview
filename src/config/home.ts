// Typed shape of `kiosk.yaml`, which is fetched at startup. The YAML
// is the single place to change when rooms, apps or HA entity IDs change; this file
// only validates it and fills in defaults.

import type { Rgb } from '@/ha/lightColor'
import { type IconName, isIconName } from './icons'

export type Gradient = [string, string]

export interface SceneConfig {
  entityId: string
  /** Falls back to the scene's friendly name in HA. */
  name?: string
  /** Two colors used for the scene button gradient. */
  colors: Gradient
}

export interface RoomConfig {
  id: string
  name: string
  icon: IconName
  lightEntityIds: string[]
  scenes: SceneConfig[]
}

export type ColorPreset = { name: string; kelvin: number } | { name: string; rgb: Rgb }

interface AppBase {
  id: string
  name: string
  icon: IconName
  colors: Gradient
}

export interface VacuumApp extends AppBase {
  type: 'vacuum'
  entities: {
    vacuum: string
    fullClean?: string
    fullVacuum?: string
    progress?: string
    status?: string
    battery?: string
  }
}

export interface TvApp extends AppBase {
  type: 'tv'
  entities: { player: string; remote?: string }
}

export interface SwitchApp extends AppBase {
  type: 'switch'
  entities: { switch: string; sensors: string[] }
}

/** A named set of lights, shown as one section of the Lights app. */
export interface LightGroup {
  name: string
  icon: IconName
  lightEntityIds: string[]
}

/** Every light on its own, sorted into groups (rooms, floors, lamps vs. spots…). */
export interface LightsApp extends AppBase {
  type: 'lights'
  groups: LightGroup[]
}

/** Opens the doorbell camera; uses the top-level `doorbell` config. */
export interface DoorbellApp extends AppBase {
  type: 'doorbell'
}

export type AppConfig = VacuumApp | TvApp | SwitchApp | LightsApp | DoorbellApp

export interface DoorbellConfig {
  name: string
  cameraEntityId: string
  /** HA event entity that fires on a ring. Optional: without it, no auto-open. */
  ringEntityId?: string
}

export interface HomeConfig {
  wallpaper: Gradient
  /** `lite` drops live blur and shadows, for weak GPUs like the Pi's. */
  graphics: 'full' | 'lite'
  weatherEntityId?: string
  rooms: RoomConfig[]
  apps: AppConfig[]
  doorbell?: DoorbellConfig
  colors: ColorPreset[]
  timings: {
    screensaverAfterMs: number
    doorbellAutoCloseMs: number
    /** How often the kiosk checks kiosk.yaml for changes. */
    configCheckMs: number
  }
  /** Hours (local time) during which the screensaver is dimmed. */
  nightHours: { from: number; to: number }
}

const DEFAULT_COLORS: ColorPreset[] = [
  { name: 'Warm white', kelvin: 2200 },
  { name: 'Soft white', kelvin: 2700 },
  { name: 'Neutral', kelvin: 4000 },
  { name: 'Daylight', kelvin: 6500 },
  { name: 'Red', rgb: [255, 59, 48] },
  { name: 'Blue', rgb: [10, 132, 255] },
]

const DEFAULT_SCENE_COLORS: Gradient = ['#ffd27a', '#ff9f0a']
const DEFAULT_APP_COLORS: Gradient = ['#8e8e93', '#48484a']
const APP_TYPES = ['vacuum', 'tv', 'switch', 'lights', 'doorbell'] as const
const GRAPHICS = ['full', 'lite'] as const
const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/

export class ConfigError extends Error {
  override name = 'ConfigError'
}

type Obj = Record<string, unknown>

// Small readers that point at the broken key, e.g. `rooms[1].lights[0]`.
function object(value: unknown, path: string): Obj {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new ConfigError(`${path} must be a mapping`)
  return value as Obj
}

function list(value: unknown, path: string): unknown[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new ConfigError(`${path} must be a list`)
  return value
}

function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim())
    throw new ConfigError(`${path} must be a non-empty text`)
  return value
}

function optionalText(value: unknown, path: string): string | undefined {
  return value === undefined || value === null ? undefined : text(value, path)
}

function number(value: unknown, path: string, fallback: number): number {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new ConfigError(`${path} must be a number`)
  return value
}

function entityId(value: unknown, path: string, domain?: string): string {
  const id = text(value, path)
  if (!ENTITY_ID.test(id)) throw new ConfigError(`${path} "${id}" is not a valid entity ID`)
  if (domain && !id.startsWith(`${domain}.`))
    throw new ConfigError(`${path} "${id}" must be a ${domain}.* entity`)
  return id
}

function optionalEntityId(value: unknown, path: string, domain?: string): string | undefined {
  return value === undefined || value === null ? undefined : entityId(value, path, domain)
}

function gradient(value: unknown, path: string, fallback: Gradient): Gradient {
  if (value === undefined || value === null) return fallback
  const colors = list(value, path)
  if (colors.length !== 2) throw new ConfigError(`${path} must be two colors: [from, to]`)
  return [text(colors[0], `${path}[0]`), text(colors[1], `${path}[1]`)]
}

function icon(value: unknown, path: string): IconName {
  const name = text(value, path)
  if (!isIconName(name))
    throw new ConfigError(`${path} "${name}" is not a known icon (see src/config/icons.ts)`)
  return name
}

function scene(value: unknown, path: string): SceneConfig {
  const raw = object(value, path)
  return {
    entityId: entityId(raw.entity, `${path}.entity`, 'scene'),
    name: optionalText(raw.name, `${path}.name`),
    colors: gradient(raw.colors, `${path}.colors`, DEFAULT_SCENE_COLORS),
  }
}

function lightIds(value: unknown, path: string): string[] {
  const lights = list(value, path)
  if (!lights.length) throw new ConfigError(`${path} needs at least one light`)
  return lights.map((light, i) => entityId(light, `${path}[${i}]`, 'light'))
}

function room(value: unknown, path: string): RoomConfig {
  const raw = object(value, path)
  return {
    id: text(raw.id, `${path}.id`),
    name: text(raw.name, `${path}.name`),
    icon: icon(raw.icon ?? 'house', `${path}.icon`),
    lightEntityIds: lightIds(raw.lights, `${path}.lights`),
    scenes: list(raw.scenes, `${path}.scenes`).map((s, i) => scene(s, `${path}.scenes[${i}]`)),
  }
}

function lightGroup(value: unknown, path: string): LightGroup {
  const raw = object(value, path)
  return {
    name: text(raw.name, `${path}.name`),
    icon: icon(raw.icon ?? 'lightbulb', `${path}.icon`),
    lightEntityIds: lightIds(raw.lights, `${path}.lights`),
  }
}

function app(value: unknown, path: string, hasDoorbell: boolean, rooms: RoomConfig[]): AppConfig {
  const raw = object(value, path)
  const type = raw.type as AppConfig['type']
  if (!APP_TYPES.includes(type))
    throw new ConfigError(`${path}.type must be one of: ${APP_TYPES.join(', ')}`)

  const base: AppBase = {
    id: text(raw.id, `${path}.id`),
    name: text(raw.name, `${path}.name`),
    icon: icon(raw.icon ?? 'house', `${path}.icon`),
    colors: gradient(raw.colors, `${path}.colors`, DEFAULT_APP_COLORS),
  }
  const at = `${path}.entities`

  switch (type) {
    case 'vacuum': {
      const e = object(raw.entities, at)
      return {
        ...base,
        type,
        entities: {
          vacuum: entityId(e.vacuum, `${at}.vacuum`, 'vacuum'),
          fullClean: optionalEntityId(e.fullClean, `${at}.fullClean`),
          fullVacuum: optionalEntityId(e.fullVacuum, `${at}.fullVacuum`),
          progress: optionalEntityId(e.progress, `${at}.progress`),
          status: optionalEntityId(e.status, `${at}.status`),
          battery: optionalEntityId(e.battery, `${at}.battery`),
        },
      }
    }
    case 'tv': {
      const e = object(raw.entities, at)
      return {
        ...base,
        type,
        entities: {
          player: entityId(e.player, `${at}.player`, 'media_player'),
          remote: optionalEntityId(e.remote, `${at}.remote`, 'remote'),
        },
      }
    }
    case 'switch': {
      const e = object(raw.entities, at)
      return {
        ...base,
        type,
        entities: {
          switch: entityId(e.switch, `${at}.switch`),
          sensors: list(e.sensors, `${at}.sensors`).map((s, i) =>
            entityId(s, `${at}.sensors[${i}]`),
          ),
        },
      }
    }
    case 'lights': {
      // Without `groups`, one group per room, using the rooms' lights.
      const groups =
        raw.groups === undefined
          ? rooms.map(({ name, icon, lightEntityIds }) => ({ name, icon, lightEntityIds }))
          : list(raw.groups, `${path}.groups`).map((g, i) => lightGroup(g, `${path}.groups[${i}]`))
      if (!groups.length) throw new ConfigError(`${path}.groups needs at least one group`)
      return { ...base, type, groups }
    }
    case 'doorbell':
      if (!hasDoorbell) throw new ConfigError(`${path} needs a top-level doorbell section`)
      return { ...base, type }
  }
}

function colorPreset(value: unknown, path: string): ColorPreset {
  const raw = object(value, path)
  const name = text(raw.name, `${path}.name`)
  if (raw.kelvin !== undefined) return { name, kelvin: number(raw.kelvin, `${path}.kelvin`, 2700) }
  const rgb = list(raw.rgb, `${path}.rgb`)
  if (rgb.length !== 3) throw new ConfigError(`${path} needs kelvin: 2700 or rgb: [r, g, b]`)
  return { name, rgb: rgb.map((c, i) => number(c, `${path}.rgb[${i}]`, 0)) as Rgb }
}

function unique(items: { id: string }[], path: string) {
  const seen = new Set<string>()
  for (const { id } of items) {
    if (seen.has(id)) throw new ConfigError(`${path} has the id "${id}" twice`)
    seen.add(id)
  }
}

/** Validates the parsed YAML and fills in defaults. Throws `ConfigError` with the bad key. */
export function parseHomeConfig(value: unknown): HomeConfig {
  const raw = object(value ?? {}, 'config')

  const doorbellRaw = raw.doorbell === undefined ? undefined : object(raw.doorbell, 'doorbell')
  const doorbell: DoorbellConfig | undefined = doorbellRaw && {
    name: optionalText(doorbellRaw.name, 'doorbell.name') ?? 'Doorbell',
    cameraEntityId: entityId(doorbellRaw.camera, 'doorbell.camera', 'camera'),
    ringEntityId: optionalEntityId(doorbellRaw.ring, 'doorbell.ring'),
  }

  const rooms = list(raw.rooms, 'rooms').map((r, i) => room(r, `rooms[${i}]`))
  const apps = list(raw.apps, 'apps').map((a, i) => app(a, `apps[${i}]`, Boolean(doorbell), rooms))
  unique(rooms, 'rooms')
  unique(apps, 'apps')

  const graphics = (raw.graphics ?? 'full') as HomeConfig['graphics']
  if (!GRAPHICS.includes(graphics))
    throw new ConfigError(`graphics must be one of: ${GRAPHICS.join(', ')}`)

  const timings = raw.timings === undefined ? {} : object(raw.timings, 'timings')
  const night = raw.nightHours === undefined ? {} : object(raw.nightHours, 'nightHours')
  const seconds = (key: string, fallback: number) =>
    number(timings[key], `timings.${key}`, fallback) * 1000

  return {
    wallpaper: gradient(raw.wallpaper, 'wallpaper', ['#2a2f6b', '#7a3d5c']),
    graphics,
    weatherEntityId: optionalEntityId(raw.weather, 'weather', 'weather'),
    rooms,
    apps,
    doorbell,
    colors:
      raw.colors === undefined
        ? DEFAULT_COLORS
        : list(raw.colors, 'colors').map((c, i) => colorPreset(c, `colors[${i}]`)),
    timings: {
      screensaverAfterMs: seconds('screensaverSeconds', 60),
      doorbellAutoCloseMs: seconds('doorbellAutoCloseSeconds', 60),
      configCheckMs: seconds('configCheckSeconds', 60),
    },
    nightHours: {
      from: number(night.from, 'nightHours.from', 22),
      to: number(night.to, 'nightHours.to', 7),
    },
  }
}
