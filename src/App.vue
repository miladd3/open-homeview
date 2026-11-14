<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import AppDialog from '@/components/organisms/AppDialog.vue'
import DevToolbar from '@/components/organisms/DevToolbar.vue'
import DoorbellOverlay from '@/components/organisms/DoorbellOverlay.vue'
import RoomDialog from '@/components/organisms/RoomDialog.vue'
import ScreenSaver from '@/components/organisms/ScreenSaver.vue'
import { useConfigReload } from '@/composables/useConfigReload'
import { useDoorbellRing } from '@/composables/useDoorbellRing'
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
  return app?.type === 'doorbell' ? undefined : app
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
useDoorbellRing(() => kiosk.openDoorbell('ring'))
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
      <AppDialog v-if="activeApp" :app="activeApp" @close="kiosk.closeDialogs" />
    </Transition>

    <Transition name="screensaver">
      <ScreenSaver v-if="kiosk.screensaver" @wake="kiosk.wake" />
    </Transition>

    <Transition name="doorbell">
      <DoorbellOverlay
        v-if="kiosk.doorbell && config.home.doorbell"
        :doorbell="config.home.doorbell"
        :reason="kiosk.doorbell.reason"
        @close="kiosk.closeDoorbell"
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
.page-leave-active {
  pointer-events: none;
}
</style>
