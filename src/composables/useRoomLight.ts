import { computed, type MaybeRefOrGetter, toValue } from 'vue'

import type { RoomConfig } from '@/config/home'
import { lightBrightnessPct, lightFeatures, lightRgb, type Rgb } from '@/ha/lightColor'
import type { HassEntity } from '@/ha/types'
import { useEntitiesStore } from '@/stores/entities'

/** A set of lights (a room, a light group or a single light), controlled as one. */
export function useRoomLight(room: MaybeRefOrGetter<Pick<RoomConfig, 'lightEntityIds'>>) {
  const store = useEntitiesStore()

  const lights = computed(() =>
    toValue(room)
      .lightEntityIds.map((id) => store.get(id))
      .filter((light): light is HassEntity => light !== undefined),
  )
  const lightsOn = computed(() => lights.value.filter((light) => light.state === 'on'))
  const isOn = computed(() => lightsOn.value.length > 0)
  const isAvailable = computed(() => lights.value.some((light) => light.state !== 'unavailable'))
  const brightness = computed(() => {
    const on = lightsOn.value
    if (!on.length) return 0
    return Math.round(on.reduce((sum, light) => sum + lightBrightnessPct(light), 0) / on.length)
  })
  const rgb = computed(() => lightRgb(lightsOn.value[0]))
  const features = computed(() => lightFeatures(lights.value))
  const target = () => ({ entity_id: toValue(room).lightEntityIds })

  return {
    lights,
    isOn,
    isAvailable,
    brightness,
    rgb,
    features,
    // Every command predicts its result so the switch, tile and slider react on
    // tap instead of after the round trip to HA (see stores/entities.ts).
    // light.toggle flips each light on its own, so mixed rooms would stay mixed.
    toggle: () => {
      const state = isOn.value ? 'off' : 'on'
      return store.callService('light', `turn_${state}`, {}, target(), { state })
    },
    toggleLight: (entityId: string) =>
      store.callService(
        'light',
        'toggle',
        {},
        { entity_id: entityId },
        { state: store.get(entityId)?.state === 'on' ? 'off' : 'on' },
      ),
    setBrightness: (pct: number) =>
      pct <= 0
        ? store.callService('light', 'turn_off', {}, target(), { state: 'off' })
        : store.callService('light', 'turn_on', { brightness_pct: pct }, target(), {
            state: 'on',
            brightness: Math.round((pct / 100) * 255),
          }),
    setRgb: (color: Rgb) =>
      store.callService('light', 'turn_on', { rgb_color: color }, target(), { state: 'on' }),
    setKelvin: (kelvin: number) =>
      store.callService('light', 'turn_on', { color_temp_kelvin: kelvin }, target(), {
        state: 'on',
      }),
    activateScene: (sceneId: string) =>
      store.callService('scene', 'turn_on', {}, { entity_id: sceneId }),
  }
}
