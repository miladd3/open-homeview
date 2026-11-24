<script setup lang="ts">
import { ChevronDown, ChevronUp } from '@lucide/vue'

// ⌄ ⌃ buttons inside a widget, e.g. a thermostat's target. Emits -1 or +1.
// Taps on it don't reach the widget.
defineProps<{ label: string }>()
const emit = defineEmits<{ step: [direction: -1 | 1] }>()
</script>

<template>
  <div class="kit-stepper" role="group" :aria-label="label">
    <button type="button" :aria-label="`Lower ${label}`" @click.stop="emit('step', -1)">
      <ChevronDown class="glyph" />
    </button>
    <button type="button" :aria-label="`Raise ${label}`" @click.stop="emit('step', 1)">
      <ChevronUp class="glyph" />
    </button>
  </div>
</template>

<style scoped lang="scss">
.kit-stepper {
  display: flex;
  justify-content: space-between;
  gap: calc(var(--u) * 6);

  > button {
    display: grid;
    place-items: center;
    width: max(var(--touch-min), calc(var(--u) * 34));
    height: max(var(--touch-min), calc(var(--u) * 34));
    padding: 0;
    border: 0;
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, currentColor 12%, transparent);
    cursor: pointer;
    transition: transform var(--duration-fast) var(--motion-spring);

    &:active {
      transform: scale(0.88);
    }
  }

  > button > .glyph {
    width: 55%;
    height: 55%;
  }
}
</style>
