import type { HomeConfig, VacuumApp } from '@/config/home'
import { kelvinToRgb } from '../lightColor'
import type {
  ConnectionStatus,
  HaConnection,
  HassEntities,
  HassEntity,
  ServiceTarget,
} from '../types'
import { createFixtures, createScenePresets, type ScenePreset } from './fixtures'

const SERVICE_LATENCY_MS = 60
const VACUUM_TICK_MS = 1_000

type ServiceData = Record<string, unknown>

/**
 * In-memory stand-in for Home Assistant. Implements just enough service
 * behaviour for every control in the kiosk to round-trip through state.
 */
export class MockConnection implements HaConnection {
  private states: HassEntities
  private listeners = new Set<(entities: HassEntities) => void>()
  private vacuumTimer: ReturnType<typeof setInterval> | null = null
  private vacuumProgress = 0
  private scenePresets: Record<string, ScenePreset>
  private vacuum: Partial<VacuumApp['entities']>
  private doorbellRingId: string | undefined

  constructor(
    config: HomeConfig,
    private latencyMs = SERVICE_LATENCY_MS,
    initial: HassEntities = createFixtures(config),
  ) {
    this.states = initial
    this.scenePresets = createScenePresets(config)
    this.vacuum = config.apps.find((app) => app.type === 'vacuum')?.entities ?? {}
    this.doorbellRingId = config.doorbell?.ringEntityId
  }

  subscribeEntities(callback: (entities: HassEntities) => void) {
    this.listeners.add(callback)
    callback(this.states)
    return () => {
      this.listeners.delete(callback)
    }
  }

  subscribeStatus(callback: (status: ConnectionStatus) => void) {
    callback('connected')
    return () => {}
  }

  async callService(
    domain: string,
    service: string,
    data: ServiceData = {},
    target?: ServiceTarget,
  ) {
    if (this.latencyMs) await new Promise((resolve) => setTimeout(resolve, this.latencyMs))

    const targets = [target?.entity_id ?? []].flat()
    for (const entityId of targets) this.handle(domain, service, entityId, data)
  }

  /** Dev helper: behaves like the UniFi Protect ring event firing. */
  simulateDoorbellRing() {
    this.patch(this.doorbellRingId, new Date().toISOString(), { event_type: 'ring' })
  }

  dispose() {
    this.stopVacuum()
    this.listeners.clear()
  }

  private handle(domain: string, service: string, entityId: string, data: ServiceData) {
    const current = this.states[entityId]
    if (!current) {
      console.warn(`[mock-ha] unknown entity ${entityId}`)
      return
    }

    switch (`${domain}.${service}`) {
      case 'light.turn_on':
        return this.lightOn(current, data)
      case 'light.turn_off':
        return this.patch(entityId, 'off', lightOffAttributes(current))
      case 'light.toggle':
        return current.state === 'on'
          ? this.patch(entityId, 'off', lightOffAttributes(current))
          : this.lightOn(current, data)
      case 'scene.turn_on':
        return this.applyScene(entityId)
      case 'switch.turn_on':
      case 'media_player.turn_on':
        return this.patch(entityId, 'on')
      case 'switch.turn_off':
      case 'media_player.turn_off':
        return this.patch(entityId, 'off')
      case 'switch.toggle':
      case 'media_player.toggle':
      case 'homeassistant.toggle':
        return this.patch(entityId, current.state === 'on' ? 'off' : 'on')
      case 'media_player.volume_up':
      case 'media_player.volume_down': {
        const step = service === 'volume_up' ? 0.05 : -0.05
        const volume = clamp((current.attributes.volume_level as number) + step, 0, 1)
        return this.patch(entityId, current.state, { volume_level: round2(volume) })
      }
      case 'media_player.volume_mute':
        return this.patch(entityId, current.state, {
          is_volume_muted: Boolean(data.is_volume_muted),
        })
      case 'remote.send_command':
        return console.info(`[mock-ha] ${entityId} ← ${String(data.command)}`)
      case 'button.press':
        this.patch(entityId, new Date().toISOString())
        if (entityId === this.vacuum.fullClean || entityId === this.vacuum.fullVacuum)
          this.startVacuum()
        return
      case 'vacuum.start':
        return this.startVacuum()
      case 'vacuum.pause':
        this.stopVacuum()
        this.patch(this.vacuum.status, 'paused')
        return this.patch(this.vacuum.vacuum, 'paused')
      case 'vacuum.return_to_base':
        return this.returnVacuum()
      default:
        console.warn(`[mock-ha] unhandled service ${domain}.${service}`)
    }
  }

  private lightOn(current: HassEntity, data: ServiceData) {
    const attrs = current.attributes
    const brightness =
      typeof data.brightness_pct === 'number'
        ? Math.round((data.brightness_pct / 100) * 255)
        : ((attrs.brightness as number | undefined) ?? 255)

    let color: Record<string, unknown> = {
      color_mode: attrs.color_mode ?? 'color_temp',
      color_temp_kelvin: attrs.color_temp_kelvin ?? 2700,
      rgb_color: attrs.rgb_color ?? kelvinToRgb(2700),
    }
    if (Array.isArray(data.rgb_color)) {
      color = { color_mode: 'xy', color_temp_kelvin: null, rgb_color: data.rgb_color }
    } else if (typeof data.color_temp_kelvin === 'number') {
      color = {
        color_mode: 'color_temp',
        color_temp_kelvin: data.color_temp_kelvin,
        rgb_color: kelvinToRgb(data.color_temp_kelvin),
      }
    }

    this.patch(current.entity_id, brightness > 0 ? 'on' : 'off', { brightness, ...color })
  }

  private applyScene(sceneId: string) {
    const preset = this.scenePresets[sceneId]
    if (!preset) return
    this.patch(sceneId, new Date().toISOString())

    for (const light of preset.lights) {
      this.patch(light, 'on', {
        brightness: Math.round((preset.brightnessPct / 100) * 255),
        color_mode: 'xy',
        color_temp_kelvin: null,
        rgb_color: preset.rgb,
      })
    }
  }

  private startVacuum() {
    this.stopVacuum()
    if (this.state(this.vacuum.vacuum) !== 'paused') {
      this.vacuumProgress = 0
      this.patch(this.vacuum.progress, '0')
    }
    this.patch(this.vacuum.vacuum, 'cleaning')
    this.patch(this.vacuum.status, 'cleaning')

    this.vacuumTimer = setInterval(() => {
      const progress = (this.vacuumProgress = Math.min(this.vacuumProgress + 2, 100))
      const battery = Number(this.state(this.vacuum.battery) ?? 100)
      this.patch(this.vacuum.progress, String(progress))
      if (progress % 10 === 0) this.patch(this.vacuum.battery, String(Math.max(battery - 1, 5)))
      if (progress >= 100) this.returnVacuum()
    }, VACUUM_TICK_MS)
  }

  private returnVacuum() {
    this.stopVacuum()
    this.patch(this.vacuum.vacuum, 'returning')
    this.patch(this.vacuum.status, 'returning_home')
    setTimeout(() => {
      this.patch(this.vacuum.vacuum, 'docked')
      this.patch(this.vacuum.status, 'charging')
    }, 3_000)
  }

  private stopVacuum() {
    if (this.vacuumTimer) clearInterval(this.vacuumTimer)
    this.vacuumTimer = null
  }

  private state(entityId: string | undefined) {
    return entityId ? this.states[entityId]?.state : undefined
  }

  /** Optional entities may be missing from the config; patching those is a no-op. */
  private patch(
    entityId: string | undefined,
    state: string,
    attributes: Record<string, unknown> = {},
  ) {
    const current = entityId ? this.states[entityId] : undefined
    if (!entityId || !current) return
    const now = new Date().toISOString()
    this.states = {
      ...this.states,
      [entityId]: {
        ...current,
        state,
        attributes: { ...current.attributes, ...attributes },
        last_changed: state === current.state ? current.last_changed : now,
        last_updated: now,
      },
    }
    for (const listener of this.listeners) listener(this.states)
  }
}

function lightOffAttributes(light: HassEntity) {
  // HA drops color/brightness attributes while a light is off.
  return {
    ...light.attributes,
    brightness: null,
    color_mode: null,
    rgb_color: null,
    color_temp_kelvin: null,
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const round2 = (value: number) => Math.round(value * 100) / 100
