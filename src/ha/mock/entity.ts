import { kelvinToRgb } from '../lightColor'
import type { HassEntity } from '../types'

/** A fake Home Assistant entity, for dev mode and tests. */
export function mockEntity(
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {},
): HassEntity {
  const now = new Date().toISOString()
  return { entity_id: entityId, state, attributes, last_changed: now, last_updated: now }
}

/** A fake dimmable light with white and color modes. */
export function mockLight(
  entityId: string,
  name: string,
  on: boolean,
  brightnessPct: number,
  kelvin: number,
) {
  return mockEntity(entityId, on ? 'on' : 'off', {
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
