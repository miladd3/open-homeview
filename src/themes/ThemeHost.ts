// Puts kiosk.yaml's theme on <html>: `data-theme`, `data-mode`, `data-graphics`
// and `--tint`. Every theme's CSS is loaded; each is scoped to its `data-theme`.
// Lite comes after the tokens, so it wins over a mode block of the same weight.

import { watchEffect } from 'vue'

import { useNow } from '@/composables/useNow'
import { type HomeConfig, isNight } from '@/config/home'
import { themeTypes } from '.'

import.meta.glob('./*/tokens.scss', { eager: true })
import.meta.glob('./*/lite.scss', { eager: true })
import.meta.glob('./*/material.scss', { eager: true })

export function useThemeHost({ theme, standby }: HomeConfig) {
  const root = document.documentElement
  let { graphics } = theme
  if (
    graphics === 'lite' &&
    !themeTypes.find((t) => t.id === theme.name)!.graphics.includes('lite')
  ) {
    console.warn(`[theme] ${theme.name} has no lite version; using the full one`)
    graphics = 'full'
  }
  root.dataset.theme = theme.name
  root.dataset.graphics = graphics
  root.style.setProperty('--tint', theme.tint ?? null)
  if (theme.mode !== 'auto') {
    root.dataset.mode = theme.mode
    return
  }
  // `auto`: dark during standby's night hours.
  const now = useNow()
  watchEffect(() => {
    root.dataset.mode = isNight(now.value, standby.night.hours) ? 'dark' : 'light'
  })
}
