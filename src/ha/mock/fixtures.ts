import type { EventConfig, HomeConfig } from '@/config/home'
import { kelvinToRgb, type Rgb } from '../lightColor'
import type { HassEntities, HassEntity } from '../types'

export interface ScenePreset {
  lights: string[]
  brightnessPct: number
  rgb: Rgb
}

/** What each scene does in the mock: its room's lights take the scene's first color. */
export function createScenePresets(config: HomeConfig): Record<string, ScenePreset> {
  return Object.fromEntries(
    config.rooms.flatMap((room) =>
      room.scenes.map((scene) => [
        scene.entityId,
        { lights: room.lightEntityIds, brightnessPct: 70, rgb: hexToRgb(scene.colors[0]) },
      ]),
    ),
  )
}

function hexToRgb(color: string): Rgb {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color)
  if (!match) return kelvinToRgb(2700)
  return [parseInt(match[1]!, 16), parseInt(match[2]!, 16), parseInt(match[3]!, 16)]
}

function entity(
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {},
): HassEntity {
  const now = new Date().toISOString()
  return { entity_id: entityId, state, attributes, last_changed: now, last_updated: now }
}

function light(entityId: string, name: string, on: boolean, brightnessPct: number, kelvin: number) {
  return entity(entityId, on ? 'on' : 'off', {
    friendly_name: name,
    supported_color_modes: ['color_temp', 'xy'],
    min_color_temp_kelvin: 2000,
    max_color_temp_kelvin: 6535,
    ...(on && {
      color_mode: 'color_temp',
      brightness: Math.round((brightnessPct / 100) * 255),
      color_temp_kelvin: kelvin,
      rgb_color: kelvinToRgb(kelvin),
    }),
  })
}

function appEntities(app: HomeConfig['apps'][number]): HassEntity[] {
  switch (app.type) {
    case 'vacuum': {
      const e = app.entities
      return [
        entity(e.vacuum, 'docked', { friendly_name: app.name, fan_speed: 'balanced' }),
        ...(e.fullClean
          ? [entity(e.fullClean, 'unknown', { friendly_name: 'Full cleaning' })]
          : []),
        ...(e.fullVacuum
          ? [entity(e.fullVacuum, 'unknown', { friendly_name: 'Full vacuum' })]
          : []),
        ...(e.progress ? [entity(e.progress, '0', { unit_of_measurement: '%' })] : []),
        ...(e.status ? [entity(e.status, 'charging_complete')] : []),
        ...(e.battery ? [entity(e.battery, '100', { unit_of_measurement: '%' })] : []),
      ]
    }
    case 'tv':
      return [
        entity(app.entities.player, 'off', {
          friendly_name: app.name,
          volume_level: 0.25,
          is_volume_muted: false,
        }),
        ...(app.entities.remote
          ? [entity(app.entities.remote, 'off', { friendly_name: app.name })]
          : []),
      ]
    case 'switch':
      return [
        entity(app.entities.switch, 'on', { friendly_name: app.name }),
        ...app.entities.sensors.map((id) =>
          entity(id, '4.2', {
            friendly_name: 'Average processing speed',
            unit_of_measurement: 'ms',
          }),
        ),
      ]
    case 'lights':
      // Every third light starts on. Names come from the entity ID (light.wall_lamp_1 → Wall lamp 1).
      return app.groups
        .flatMap((group) => group.lightEntityIds)
        .map((id, i) => {
          const name = id.slice('light.'.length).replace(/_/g, ' ')
          return light(id, name[0]!.toUpperCase() + name.slice(1), i % 3 === 0, 60, 2700)
        })
    case 'camera':
      return [entity(app.entities.camera, 'idle', { friendly_name: app.name })]
  }
}

/** An `event.*` entity starts with no event yet; anything else starts off its `to` state. */
function eventEntity(event: EventConfig): HassEntity {
  if (event.to !== undefined) return entity(event.entityId, event.to === 'on' ? 'off' : 'unknown')
  return entity(event.entityId, 'unknown', {
    event_types: event.eventTypes.length ? event.eventTypes : ['ring'],
    event_type: null,
  })
}

export function createFixtures(config: HomeConfig): HassEntities {
  const list: HassEntity[] = [
    // Before the apps, so an event on an app's own entity (a switch) keeps the app's state.
    ...config.events.map(eventEntity),

    // First, so a room light that is also in the Lights app keeps the room's name.
    ...config.apps.flatMap(appEntities),

    // Every other room starts with its lights on.
    ...config.rooms.flatMap((room, i) =>
      room.lightEntityIds.map((id, n) =>
        light(
          id,
          room.lightEntityIds.length > 1 ? `${room.name} ${n + 1}` : room.name,
          i % 2 === 0,
          70,
          2700,
        ),
      ),
    ),

    ...config.rooms.flatMap((room) =>
      room.scenes.map((scene) =>
        entity(scene.entityId, 'unknown', { friendly_name: scene.name ?? scene.entityId }),
      ),
    ),

    ...(config.weatherEntityId
      ? [
          entity(config.weatherEntityId, 'partlycloudy', {
            friendly_name: 'Forecast Home',
            temperature: 14,
            temperature_unit: '°C',
            humidity: 72,
            wind_speed: 11,
            wind_speed_unit: 'km/h',
          }),
        ]
      : []),
  ]

  return Object.fromEntries(list.map((e) => [e.entity_id, e]))
}
