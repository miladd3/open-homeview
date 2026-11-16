<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { isFullScreen } from '@/apps'
import { uiOf } from '@/apps/ui'
import DevToolbar from '@/components/organisms/DevToolbar.vue'
import RoomDialog from '@/components/organisms/RoomDialog.vue'
import ScreenSaver from '@/components/organisms/ScreenSaver.vue'
import { useConfigReload } from '@/composables/useConfigReload'
import { useEvents } from '@/composables/useEvents'
import { useIdle } from '@/composables/useIdle'
import { useTouchCursor } from '@/composables/useTouchCursor'
import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'
import { useKioskStore } from '@/stores/kiosk'

const router = useRouter()
const config = useConfigStore()
const kiosk = useKioskStore()
const mock = useEntitiesStore().mock()

const activeRoom = computed(() => config.home.rooms.find((room) => room.id === kiosk.activeRoomId))
const activeApp = computed(() => {
  const app = config.home.apps.find((app) => app.id === kiosk.activeAppId)
  return app && !isFullScreen(app) ? app : undefined
})
const fullScreenApp = computed(() => {
  const app = config.home.apps.find((app) => app.id === kiosk.fullScreen?.appId)
  return app && isFullScreen(app) ? app : undefined
})
const wallpaper = computed(() => ({
  '--wallpaper-from': config.home.wallpaper[0],
  '--wallpaper-to': config.home.wallpaper[1],
}))

function sleep() {
  kiosk.sleep()
  if (kiosk.screensaver) router.push({ name: 'home' })
}

useIdle(config.home.timings.screensaverAfterMs, sleep)
useEvents((event) => kiosk.openApp(event.appId, { message: event.message }))
useConfigReload()
useTouchCursor()

// `graphics: lite` swaps the blur tokens for solid fills (styles/tokens.scss).
document.documentElement.classList.toggle('-lite', config.home.graphics === 'lite')
</script>

<template>
  <div class="kiosk-app" :style="wallpaper">
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>

    <Transition name="dialog">
      <RoomDialog v-if="activeRoom" :room="activeRoom" @close="kiosk.closeDialogs" />
    </Transition>

    <Transition name="dialog">
      <component
        :is="uiOf(activeApp).screen"
        v-if="activeApp"
        :app="activeApp"
        @close="kiosk.closeDialogs"
      />
    </Transition>

    <Transition name="screensaver">
      <ScreenSaver v-if="kiosk.screensaver" @wake="kiosk.wake" />
    </Transition>

    <Transition name="full-screen">
      <component
        :is="uiOf(fullScreenApp).screen"
        v-if="fullScreenApp"
        :key="fullScreenApp.id"
        :app="fullScreenApp"
        :message="kiosk.fullScreen?.message"
        @close="kiosk.closeFullScreen"
      />
    </Transition>

    <DevToolbar v-if="mock" :mock="mock" @sleep="sleep" />
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
    radial-gradient(ellipse at 95% 100%, var(--wallpaper-to), transparent 60%), var(--color-bg);
}

.page-enter-active,
.page-leave-active {
  transition:
    opacity var(--duration-base) ease,
    transform var(--duration-base) var(--ease-spring);
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
.full-screen-leave-active {
  pointer-events: none;
}

.full-screen-enter-active,
.full-screen-leave-active {
  transition:
    opacity var(--duration-base) ease,
    transform var(--duration-slow) var(--ease-spring);
}

.full-screen-enter-from,
.full-screen-leave-to {
  opacity: 0;
  transform: scale(1.04);
}
</style>
