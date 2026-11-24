<script setup lang="ts">
import { computed } from 'vue'

import { isOverlay, screenOf } from '@/apps'
import DevToolbar from '@/components/organisms/DevToolbar.vue'
import StandbyHost from '@/components/organisms/StandbyHost.vue'
import { useConfigReload } from '@/composables/useConfigReload'
import { useEvents } from '@/composables/useEvents'
import { useTouchCursor } from '@/composables/useTouchCursor'
import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'
import { useKioskStore } from '@/stores/kiosk'
import { useThemeHost } from '@/themes/ThemeHost'

const config = useConfigStore()
const kiosk = useKioskStore()
const mock = useEntitiesStore().mock()

const activeApp = computed(() => {
  const app = config.home.apps.find((app) => app.id === kiosk.activeAppId)
  return app && !isOverlay(app) ? app : undefined
})
const overlayApp = computed(() => {
  const app = config.home.apps.find((app) => app.id === kiosk.overlay?.appId)
  return app && isOverlay(app) ? app : undefined
})
// kiosk.yaml's wallpaper, over the theme's.
const wallpaper = computed(
  () =>
    config.home.wallpaper && {
      '--wallpaper-from': config.home.wallpaper[0],
      '--wallpaper-to': config.home.wallpaper[1],
    },
)

useEvents((event) => kiosk.openApp(event.appId, { message: event.message }))
useConfigReload()
useTouchCursor()
useThemeHost(config.home)
</script>

<template>
  <div class="kiosk-app" :style="wallpaper">
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>

    <Transition name="sheet">
      <component
        :is="screenOf(activeApp)"
        v-if="activeApp"
        :key="activeApp.id"
        :app="activeApp"
        :focus="kiosk.focus"
        @close="kiosk.closeApp"
      />
    </Transition>

    <StandbyHost />

    <Transition name="overlay">
      <component
        :is="screenOf(overlayApp)"
        v-if="overlayApp"
        :key="overlayApp.id"
        :app="overlayApp"
        :message="kiosk.overlay?.message"
        @close="kiosk.closeOverlay"
      />
    </Transition>

    <DevToolbar v-if="mock" :mock="mock" />
  </div>
</template>

<style scoped lang="scss">
.kiosk-app {
  position: relative;
  height: 100%;
  overflow: hidden;
  // Apple Home style wallpaper: two soft color fields behind the frosted glass.
  background:
    radial-gradient(ellipse at 10% 0%, var(--wallpaper-from), transparent 65%),
    radial-gradient(ellipse at 95% 100%, var(--wallpaper-to), transparent 60%), var(--bg);
}

.page-enter-active,
.page-leave-active {
  transition:
    opacity var(--duration-base) ease,
    transform var(--duration-base) var(--motion-spring);
}

.page-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.page-leave-to {
  opacity: 0;
  transform: scale(1.02);
}

// Fading out: let taps through to the screen underneath.
.page-leave-active,
.overlay-leave-active {
  pointer-events: none;
}

.overlay-enter-active,
.overlay-leave-active {
  transition:
    opacity var(--duration-base) ease,
    transform var(--duration-slow) var(--motion-spring);
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
  transform: scale(1.04);
}
</style>
