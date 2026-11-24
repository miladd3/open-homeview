<script setup lang="ts">
import { computed, onBeforeUnmount, onErrorCaptured, ref } from 'vue'

import { hasScreen, quickOf, widgetOf } from '@/apps'
import type { DashboardWidget } from '@/config/home'
import type { OpenAppOptions } from '@/stores/kiosk'
import { useKioskStore } from '@/stores/kiosk'

// One widget on the dashboard. Catches the widget's errors (a grey cell instead of
// a broken page), opens its app's screen on `open`, and shows the type's quick
// control over it on a long-press.
const LONG_PRESS_MS = 500
const MOVE_TOLERANCE_PX = 10

const props = defineProps<{ widget: DashboardWidget }>()

const kiosk = useKioskStore()
const failed = ref(false)
const quick = computed(() => quickOf(props.widget.app))
const showQuick = ref(false)
// Settings only go to widgets that have some, so others get no stray attribute.
const settings = computed(() =>
  Object.keys(props.widget.settings).length ? props.widget.settings : undefined,
)

onErrorCaptured((error) => {
  console.error(`[dashboard] the ${props.widget.app.type} widget failed:`, error)
  failed.value = true
  return false
})

function open(options?: OpenAppOptions) {
  if (hasScreen(props.widget.app)) kiosk.openApp(props.widget.app.id, options)
}

let pressTimer: ReturnType<typeof setTimeout> | undefined
let pressStart: { x: number; y: number } | undefined
let longPressed = false

function onPointerDown(event: PointerEvent) {
  longPressed = false
  if (!quick.value) return
  pressStart = { x: event.clientX, y: event.clientY }
  pressTimer = setTimeout(() => {
    longPressed = true
    showQuick.value = true
  }, LONG_PRESS_MS)
}

function onPointerMove(event: PointerEvent) {
  if (!pressStart) return
  const moved = Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y)
  if (moved > MOVE_TOLERANCE_PX) cancelPress()
}

function cancelPress() {
  clearTimeout(pressTimer)
  pressStart = undefined
}

// The click that ends a long-press must not also tap the widget.
function onClickCapture(event: MouseEvent) {
  if (!longPressed) return
  event.stopPropagation()
  longPressed = false
}

onBeforeUnmount(cancelPress)
</script>

<template>
  <div
    class="widget-cell"
    :class="{ '-quick': showQuick }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="cancelPress"
    @pointercancel="cancelPress"
    @click.capture="onClickCapture"
    @contextmenu.prevent
  >
    <div v-if="failed" class="error">Widget error</div>
    <component
      :is="widgetOf(widget.app)"
      v-else
      :app="widget.app"
      :size="widget.size"
      mode="dashboard"
      :settings="settings"
      @open="open"
    />
    <template v-if="showQuick && quick">
      <div class="scrim" @click="showQuick = false" />
      <div class="quick">
        <component :is="quick" :app="widget.app" :settings="settings" />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.widget-cell {
  position: relative;
  min-width: 0;
  min-height: 0;

  > .error {
    display: grid;
    place-items: center;
    height: 100%;
    border-radius: var(--radius-l);
    background: rgb(142 142 147 / 30%);
    color: var(--color-text-secondary);
    font-size: 18px;
  }

  // Above the other cells while its quick control is open.
  &.-quick {
    z-index: 1;
  }

  // Dims the screen around the quick control; a tap on it closes the control.
  > .scrim {
    position: fixed;
    inset: 0;
    z-index: 1;
    background: var(--scrim-bg);
  }

  > .quick {
    position: absolute;
    inset: 0;
    z-index: 2;
    overflow: hidden;
    border-radius: var(--radius-l);
    background: var(--color-bg);
    box-shadow: var(--shadow-dialog);
  }

  > .quick > * {
    width: 100%;
    height: 100%;
  }
}
</style>
