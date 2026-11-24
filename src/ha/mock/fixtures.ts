import { type LightsApp, mockAppEntities } from '@/apps'
import type { EventConfig, HomeConfig } from '@/config/home'
import { kelvinToRgb, type Rgb } from '../lightColor'
import type { HassEntities, HassEntity } from '../types'
import { mockEntity as entity } from './entity'

export interface ScenePreset {
  lights: string[]
  brightnessPct: number
  rgb: Rgb
}

/** What each scene does in the mock: its group's lights take the scene's first color. */
export function createScenePresets(config: HomeConfig): Record<string, ScenePreset> {
  return Object.fromEntries(
    config.apps.flatMap((app) =>
      app.type === 'lights'
        ? (app as LightsApp).groups.flatMap((group) =>
            group.scenes.map((scene) => [
              scene.entityId,
              { lights: group.lightEntityIds, brightnessPct: 70, rgb: hexToRgb(scene.colors[0]) },
            ]),
          )
        : [],
    ),
  )
}

function hexToRgb(color: string): Rgb {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color)
  if (!match) return kelvinToRgb(2700)
  return [parseInt(match[1]!, 16), parseInt(match[2]!, 16), parseInt(match[3]!, 16)]
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

    ...config.apps.flatMap(mockAppEntities),

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
