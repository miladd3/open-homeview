<script setup lang="ts">
import { Lightbulb } from '@lucide/vue'
import { computed } from 'vue'

import { useRoomLight } from '@/composables/useRoomLight'
import { useEntitiesStore } from '@/stores/entities'

// One light in the Lights app. Like a room tile: tapping the bulb toggles the
// light, tapping anywhere else opens its controls.
const props = defineProps<{ entityId: string }>()
const emit = defineEmits<{ open: [entityId: string] }>()

const store = useEntitiesStore()
const { isOn, isAvailable, brightness, rgb, toggle } = useRoomLight(() => ({
  lightEntityIds: [props.entityId],
}))

const name = computed(() =>
  String(store.get(props.entityId)?.attributes.friendly_name ?? props.entityId),
)
const status = computed(() => {
  if (!isAvailable.value) return 'Unavailable'
  if (!isOn.value) return 'Off'
  return brightness.value ? `${brightness.value}%` : 'On'
})
const glow = computed(() => (rgb.value ? `rgb(${rgb.value.join(' ')})` : 'transparent'))
</script>

<template>
  <div
    class="light-tile"
    :class="{ '-on': isOn, '-unavailable': !isAvailable }"
    :style="{ '--glow': glow }"
  >
    <button
      class="open"
      type="button"
      :aria-label="`${name}, ${status}. Open controls.`"
      @click="emit('open', entityId)"
    />
    <button
      class="toggle"
      type="button"
      :aria-pressed="isOn"
      :aria-label="isOn ? `Turn ${name} off` : `Turn ${name} on`"
      :disabled="!isAvailable"
      @click="toggle"
    >
      <Lightbulb :size="28" :stroke-width="1.8" />
    </button>
    <span class="name">{{ name }}</span>
    <span class="status">{{ status }}</span>
  </div>
</template>

<style scoped lang="scss">
.light-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  height: 140px;
  padding: var(--space-s) var(--space-m) var(--space-m);
  border-radius: var(--radius-m);
  background: rgb(255 255 255 / 8%);
  color: var(--color-text);
  transition:
    transform var(--duration-base) var(--ease-spring),
    background-color var(--duration-base) ease,
    color var(--duration-base) ease;

  &:has(> .open:active) {
    transform: scale(0.96);
  }

  // Covers the whole tile; the bulb button and labels sit on top of it.
  > .open {
    position: absolute;
    inset: 0;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  > .toggle {
    position: relative;
    display: inline-grid;
    place-items: center;
    width: 56px;
    height: 56px;
    margin-bottom: auto;
    padding: 0;
    border: 0;
    border-radius: var(--radius-pill);
    background: rgb(255 255 255 / 14%);
    color: inherit;
    cursor: pointer;
    transition:
      transform var(--duration-fast) var(--ease-spring),
      background-color var(--duration-base) ease;

    &:active {
      transform: scale(0.88);
    }
  }

  > .name,
  > .status {
    position: relative;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
  }

  > .name {
    font-size: 20px;
    font-weight: 600;
  }

  > .status {
    color: var(--color-text-secondary);
    font-size: 17px;
    font-weight: 500;
  }

  &.-on {
    background: var(--glass-active-bg);
    color: var(--glass-active-text);

    > .toggle {
      background: var(--glow);
      color: #1c1c1e;
    }

    > .status {
      color: rgb(60 60 67 / 70%);
    }
  }

  &.-unavailable {
    opacity: 0.55;
  }
}
</style>
