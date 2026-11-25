<script setup lang="ts">
import { computed, onBeforeUnmount, onErrorCaptured, onMounted, ref, useTemplateRef } from 'vue'

import { hasScreen, quickOf, widgetOf } from '@/apps'
import { useLongPress } from '@/composables/useLongPress'
import type { DashboardWidget } from '@/config/home'
import type { WidgetMode } from '@/kit/define'
import type { OpenAppOptions } from '@/stores/kiosk'
import { useKioskStore } from '@/stores/kiosk'

// One widget on the dashboard or in a face slot. Catches the widget's errors (a
// grey cell instead of a broken page), opens its app's screen on `open`, and
// shows the type's quick control over it on a long-press (or emits `longpress`
// when it has none: the dashboard then enters edit mode).
// In a face slot (`complication`), it sets `--cell` from its own height, which
// DashboardHost sets for the grid.
const props = withDefaults(defineProps<{ widget: DashboardWidget; mode?: WidgetMode }>(), {
  mode: 'dashboard',
})
const emit = defineEmits<{ longpress: [] }>()

const kiosk = useKioskStore()
const failed = ref(false)
const quick = computed(() => quickOf(props.widget.app))
const showQuick = ref(false)
// Settings only go to widgets that have some, so others get no stray attribute.
const settings = computed(() =>
  Object.keys(props.widget.settings).length ? props.widget.settings : undefined,
)

const root = useTemplateRef('root')
const cell = ref<number>()
let observer: ResizeObserver | undefined
onMounted(() => {
  if (props.mode !== 'complication' || !root.value) return
  const rows = Number(props.widget.size.split('x')[1])
  observer = new ResizeObserver(([entry]) => {
    if (entry) cell.value = entry.contentRect.height / rows
  })
  observer.observe(root.value)
})

onErrorCaptured((error) => {
  console.error(`[${props.mode}] the ${props.widget.app.type} widget failed:`, error)
  failed.value = true
  return false
})

function open(options?: OpenAppOptions) {
  if (hasScreen(props.widget.app)) kiosk.openApp(props.widget.app.id, options)
}

const longPress = useLongPress(() => {
  if (quick.value) showQuick.value = true
  else emit('longpress')
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div
    ref="root"
    class="widget-cell"
    :class="{ '-quick': showQuick }"
    :style="cell ? { '--cell': `${cell}px` } : undefined"
    @pointerdown="longPress.onPointerdown"
    @pointermove="longPress.onPointermove"
    @pointerup="longPress.onPointerup"
    @pointercancel="longPress.onPointercancel"
    @click.capture="longPress.onClickCapture"
    @contextmenu.prevent
  >
    <div v-if="failed" class="error">Widget error</div>
    <component
      :is="widgetOf(widget.app)"
      v-else
      :app="widget.app"
      :size="widget.size"
      :mode="mode"
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
    background: var(--fill-strong);
    color: var(--text-secondary);
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
    background: var(--bg);
    box-shadow: var(--sheet-shadow);
  }

  > .quick > * {
    width: 100%;
    height: 100%;
  }
}
</style>
