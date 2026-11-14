<script setup lang="ts">
import { BellRing, X } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import IconButton from '@/components/atoms/IconButton.vue'
import CameraFeed from '@/components/molecules/CameraFeed.vue'
import ClockDisplay from '@/components/molecules/ClockDisplay.vue'
import type { CameraApp } from '@/config/home'

// A camera app, full screen over everything. Opens from its icon or from an event
// (a doorbell ring), which also passes the message to show.
const props = defineProps<{ app: CameraApp; message?: string }>()
const emit = defineEmits<{ close: [] }>()

// Closes on its own once nobody has touched it for the app's `autoCloseMs`.
const remainingMs = ref(props.app.autoCloseMs)
let deadline = 0
let ticker: ReturnType<typeof setInterval> | undefined

function resetCountdown() {
  deadline = Date.now() + props.app.autoCloseMs
  remainingMs.value = props.app.autoCloseMs
}

onMounted(() => {
  resetCountdown()
  ticker = setInterval(() => {
    remainingMs.value = Math.max(0, deadline - Date.now())
    if (remainingMs.value === 0) emit('close')
  }, 250)
})

onBeforeUnmount(() => clearInterval(ticker))

const remainingSeconds = computed(() => Math.ceil(remainingMs.value / 1000))
</script>

<template>
  <div
    class="camera-overlay"
    role="dialog"
    aria-modal="true"
    :aria-label="`${app.name} camera`"
    @pointerdown="resetCountdown"
  >
    <CameraFeed class="feed" :entity-id="app.entities.camera" />

    <header class="topbar">
      <div class="titles">
        <h2 class="title">{{ app.name }}</h2>
        <span class="live">Live</span>
      </div>
      <ClockDisplay class="clock" />
      <IconButton class="close" aria-label="Close camera" @click="emit('close')">
        <X :size="36" />
      </IconButton>
    </header>

    <footer class="bottombar">
      <p v-if="message" class="message">
        <BellRing class="icon" :size="30" />
        {{ message }}
      </p>
      <p class="countdown">Closes in {{ remainingSeconds }}s</p>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.camera-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: var(--space-l);
  background: #000;

  > .feed {
    position: absolute;
    inset: 0;
  }

  > .topbar,
  > .bottombar {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-m);
  }

  > .topbar > .titles {
    display: flex;
    flex: 1;
    align-items: center;
    gap: var(--space-s);
  }

  > .topbar > .titles > .title {
    font-size: 34px;
    font-weight: 700;
  }

  > .topbar > .titles > .live {
    padding: 4px 12px;
    border-radius: var(--radius-pill);
    background: var(--color-danger);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  > .topbar > .clock {
    // Smaller clock than the Home header; the camera is the focus here.
    :deep(.time) {
      font-size: 40px;
    }

    :deep(.date) {
      display: none;
    }
  }

  > .topbar > .close {
    width: 80px;
    height: 80px;
  }

  > .bottombar {
    justify-content: space-between;
  }

  > .bottombar > .message {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    padding: var(--space-s) var(--space-m);
    border-radius: var(--radius-pill);
    background: var(--glass-bg-strong);
    font-size: 24px;
    font-weight: 600;
    backdrop-filter: var(--glass-filter);
    -webkit-backdrop-filter: var(--glass-filter);
    animation: pulse 1.6s ease-in-out infinite;
  }

  > .bottombar > .message > .icon {
    color: var(--color-on);
  }

  > .bottombar > .countdown {
    margin-left: auto;
    color: var(--color-text-tertiary);
    font-size: 18px;
  }
}

@keyframes pulse {
  50% {
    transform: scale(1.04);
  }
}

// <Transition name="camera"> hooks
.camera-enter-active,
.camera-leave-active {
  transition:
    opacity var(--duration-base) ease,
    transform var(--duration-slow) var(--ease-spring);
}

.camera-enter-from,
.camera-leave-to {
  opacity: 0;
  transform: scale(1.04);
}

// Fading out: let taps through to the screen underneath.
.camera-leave-active {
  pointer-events: none;
}
</style>
