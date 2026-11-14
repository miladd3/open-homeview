import type { HassEntity } from './types'

export type Rgb = [number, number, number]

/** Approximate RGB for a white color temperature (Tanner Helland's algorithm). */
export function kelvinToRgb(kelvin: number): Rgb {
  const t = kelvin / 100
  const clamp = (v: number) => Math.round(Math.min(255, Math.max(0, v)))

  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592)
  const g =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * Math.pow(t - 60, -0.0755148492)
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307

  return [clamp(r), clamp(g), clamp(b)]
}

export function lightRgb(light: HassEntity | undefined): Rgb | null {
  if (!light || light.state !== 'on') return null
  const rgb = light.attributes.rgb_color as Rgb | undefined
  return rgb ?? kelvinToRgb(2700)
}

/** Brightness as a 0–100 percentage (HA stores 0–255). */
export function lightBrightnessPct(light: HassEntity | undefined): number {
  if (!light || light.state !== 'on') return 0
  const brightness = (light.attributes.brightness as number | undefined) ?? 0
  return Math.round((brightness / 255) * 100)
}

const COLOR_MODES = ['hs', 'xy', 'rgb', 'rgbw', 'rgbww']

/** What a group of lights supports, from HA's `supported_color_modes`. */
export function lightFeatures(lights: HassEntity[]) {
  const modes = new Set(
    lights.flatMap(
      (light) => (light.attributes.supported_color_modes as string[] | undefined) ?? [],
    ),
  )
  return {
    color: COLOR_MODES.some((mode) => modes.has(mode)),
    temperature: modes.has('color_temp'),
    dimmable: [...modes].some((mode) => mode !== 'onoff'),
  }
}
