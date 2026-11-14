<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'

// iOS Control Center style slider. The model only updates when the finger is
// lifted, so a drag sends a single service call instead of dozens.
// After release the slider keeps showing the new value until the model (e.g. HA
// state) catches up, instead of snapping back to the old value meanwhile.
const PENDING_TIMEOUT_MS = 4_000
const PENDING_TOLERANCE = 1

const props = withDefaults(
  defineProps<{
    min?: number
    max?: number
    orientation?: 'vertical' | 'horizontal'
    label: string
  }>(),
  { min: 0, max: 100, orientation: 'vertical' },
)

const model = defineModel<number>({ required: true })

const track = useTemplateRef('track')
const draft = ref<number | null>(null)
const pending = ref<number | null>(null)
const value = computed(() => draft.value ?? pending.value ?? model.value)
let pendingTimer: ReturnType<typeof setTimeout> | undefined

function settle(next: number) {
  clearTimeout(pendingTimer)
  pending.value = next
  model.value = next
  // Give up if the model never reports it (call failed, device rounded it…).
  pendingTimer = setTimeout(() => (pending.value = null), PENDING_TIMEOUT_MS)
}

watch(model, (next) => {
  if (pending.value !== null && Math.abs(next - pending.value) <= PENDING_TOLERANCE) {
    clearTimeout(pendingTimer)
    pending.value = null
  }
})

onBeforeUnmount(() => clearTimeout(pendingTimer))
const percent = computed(() => ((value.value - props.min) / (props.max - props.min)) * 100)

function valueAt(event: PointerEvent) {
  const rect = track.value!.getBoundingClientRect()
  const ratio =
    props.orientation === 'vertical'
      ? 1 - (event.clientY - rect.top) / rect.height
      : (event.clientX - rect.left) / rect.width
  const clamped = Math.min(1, Math.max(0, ratio))
  return Math.round(props.min + clamped * (props.max - props.min))
}

function onPointerDown(event: PointerEvent) {
  track.value!.setPointerCapture(event.pointerId)
  draft.value = valueAt(event)
}

function onPointerMove(event: PointerEvent) {
  if (draft.value === null) return
  draft.value = valueAt(event)
}

function onPointerUp() {
  if (draft.value === null) return
  const next = draft.value
  draft.value = null
  if (next !== model.value) settle(next)
}

function onKeydown(event: KeyboardEvent) {
  const step = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5 }[event.key]
  if (!step) return
  event.preventDefault()
  settle(Math.min(props.max, Math.max(props.min, value.value + step)))
}
</script>

<template>
  <div
    ref="track"
    class="range-slider"
    :class="[`-${orientation}`, { '-dragging': draft !== null }]"
    role="slider"
    tabindex="0"
    :aria-label="label"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="value"
    :aria-orientation="orientation"
    :style="{ '--percent': `${percent}%` }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @keydown="onKeydown"
  >
    <div class="fill" />
    <div class="icon">
      <slot :value="value" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.range-slider {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-l);
  background: rgb(255 255 255 / 12%);
  cursor: pointer;
  touch-action: none;
  outline: none;
  // No scale-on-drag: growing past the parent's box made scroll containers
  // show a scrollbar and clipped the rounded corners.

  &:focus-visible {
    box-shadow: 0 0 0 3px var(--color-accent);
  }

  > .fill {
    position: absolute;
    inset: auto 0 0;
    background: var(--slider-fill, var(--color-text));
  }

  &.-vertical > .fill {
    height: var(--percent);
  }

  &:not(.-dragging) > .fill {
    transition:
      height var(--duration-base) var(--ease-spring),
      width var(--duration-base) var(--ease-spring);
  }

  &.-horizontal > .fill {
    inset: 0 auto 0 0;
    width: var(--percent);
  }

  > .icon {
    position: absolute;
    inset: auto 0 var(--space-m);
    display: flex;
    justify-content: center;
    color: var(--slider-icon-color, #8e8e93);
    pointer-events: none;
  }

  &.-horizontal > .icon {
    inset: 0 auto 0 var(--space-m);
    align-items: center;
  }
}
</style>
