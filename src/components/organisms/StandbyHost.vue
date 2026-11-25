<script setup lang="ts">
import { computed, defineComponent, h, onErrorCaptured, type PropType, provide, ref } from 'vue'

import { useIdle } from '@/composables/useIdle'
import { useNow } from '@/composables/useNow'
import { type FaceEntry, isNight } from '@/config/home'
import { faceScreenOf } from '@/faces'
import { FACE_SLOTS } from '@/kit/FaceSlot'
import { useConfigStore } from '@/stores/config'
import { useKioskStore } from '@/stores/kiosk'
import WidgetCell from './WidgetCell.vue'

// Standby: after `standby.afterSeconds` without a touch, kiosk.yaml's faces,
// swiped sideways. During night hours only the night face shows, dimmed. A tap
// wakes to the dashboard, except a tap on a slot widget, which does the widget's
// action. An open overlay app (a camera) keeps the screen awake (kiosk.sleep).
const { standby } = useConfigStore().home
const kiosk = useKioskStore()
const now = useNow()

useIdle(standby.afterMs, kiosk.sleep)

// Faces sit on black, so they get the theme's dark mode (ThemeHost has set <html> up by now).
const { theme, graphics } = document.documentElement.dataset
const darkTheme = { 'data-theme': theme, 'data-graphics': graphics, 'data-mode': 'dark' }

const night = computed(() => isNight(now.value, standby.night.hours))
const faces = computed(() => (night.value ? [standby.night.face] : standby.faces))

// Nudge the faces a few pixels every minute so static pixels don't burn in.
const shift = computed(() => {
  const minute = now.value.getHours() * 60 + now.value.getMinutes()
  return `${((minute * 7) % 21) - 10}px, ${((minute * 11) % 21) - 10}px`
})

/**
 * One face, with the widgets of its slots for its <FaceSlot>s. A face that
 * throws shows "Face error" instead; standby keeps working.
 */
const FaceView = defineComponent({
  props: {
    entry: { type: Object as PropType<FaceEntry>, required: true },
    night: { type: Boolean, required: true },
  },
  setup(props) {
    const failed = ref(false)
    onErrorCaptured((error) => {
      console.error(`[standby] the ${props.entry.face} face failed:`, error)
      failed.value = true
      return false
    })
    provide(FACE_SLOTS, (name) => {
      const widget = props.entry.slots[name]
      return widget && h(WidgetCell, { widget, mode: 'complication' })
    })
    return () =>
      failed.value
        ? h('p', { class: 'face-error' }, 'Face error')
        : h(faceScreenOf(props.entry.face), { options: props.entry.options, night: props.night })
  },
})

function onClick(event: MouseEvent) {
  if (!(event.target as Element).closest('.widget-cell')) kiosk.wake()
}
</script>

<template>
  <Transition name="standby">
    <div
      v-if="kiosk.standby"
      class="standby-host"
      :class="{ '-night': night }"
      v-bind="darkTheme"
      aria-label="Standby. Tap to wake."
      :style="{ '--shift': shift }"
      @click="onClick"
    >
      <div v-for="(entry, i) in faces" :key="`${night}/${i}`" class="page">
        <FaceView class="face" :entry="entry" :night="night" />
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.standby-host {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  // fixed colour: faces keep their own backgrounds
  background: #000;
  // Its own dark mode's colour: <body> resolved `color` with the page's mode.
  color: var(--text-primary);
  cursor: pointer;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  overscroll-behavior-x: contain;

  > .page {
    position: relative;
    flex: 0 0 100%;
    overflow: hidden;
    scroll-snap-align: start;
  }

  // A little larger than the screen, so the burn-in shift never shows an edge.
  // A size, not `inset`, since faces set their own height: 100%.
  > .page > .face {
    position: absolute;
    top: -10px;
    left: -10px;
    width: calc(100% + 20px);
    height: calc(100% + 20px);
    transform: translate(var(--shift));
    transition: transform 4s ease;
  }

  > .page > .face-error {
    display: grid;
    place-items: center;
    margin: 0;
    color: var(--text-secondary);
    font-size: 24px;
  }

  &.-night > .page {
    opacity: 0.5;
  }
}

.standby-enter-active,
.standby-leave-active {
  transition: opacity var(--duration-slow) ease;
}

.standby-enter-from,
.standby-leave-to {
  opacity: 0;
}

// Fading out: let taps through to the dashboard underneath.
.standby-leave-active {
  pointer-events: none;
}
</style>
