<script setup lang="ts">
import { Lightbulb } from '@lucide/vue'
import { computed } from 'vue'

import { useLightGroup } from './useLightGroup'

// One light in a group's row of cards. Tapping the icon toggles the light;
// tapping the name opens its options under the row.
const props = defineProps<{ entityId: string; selected: boolean }>()
const emit = defineEmits<{ select: [] }>()

const { lights, isOn, isAvailable, brightness, rgb, toggle } = useLightGroup(() => [props.entityId])

const name = computed(() => String(lights.value[0]?.attributes.friendly_name ?? props.entityId))
const status = computed(() => {
  if (!isAvailable.value) return 'Unavailable'
  if (!isOn.value) return 'Off'
  return brightness.value ? `${brightness.value}%` : 'On'
})
const glow = computed(() => (rgb.value ? `rgb(${rgb.value.join(' ')})` : undefined))
</script>

<template>
  <div
    class="light-card"
    :class="{ '-on': isOn, '-selected': selected, '-unavailable': !isAvailable }"
  >
    <button
      class="toggle"
      type="button"
      :aria-pressed="isOn"
      :aria-label="isOn ? `Turn ${name} off` : `Turn ${name} on`"
      :disabled="!isAvailable"
      :style="{ '--glow': glow }"
      @click="toggle"
    >
      <Lightbulb :size="28" :stroke-width="1.8" />
    </button>
    <button
      class="open"
      type="button"
      :aria-expanded="selected"
      :aria-label="`${name} options`"
      @click="emit('select')"
    >
      <span class="name">{{ name }}</span>
      <span class="status">{{ status }}</span>
    </button>
  </div>
</template>

<style scoped lang="scss">
.light-card {
  display: flex;
  flex: none;
  flex-direction: column;
  width: 200px;
  align-items: flex-start;
  gap: var(--space-s);
  padding: var(--space-s);
  border: 2px solid transparent;
  border-radius: var(--radius-m);
  background: rgb(255 255 255 / 8%);
  transition:
    background-color var(--duration-base) ease,
    border-color var(--duration-base) ease;

  > .toggle {
    display: inline-grid;
    place-items: center;
    width: 56px;
    height: 56px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-pill);
    background: rgb(255 255 255 / 14%);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition:
      transform var(--duration-fast) var(--ease-spring),
      background-color var(--duration-base) ease;

    &:active {
      transform: scale(0.88);
    }
  }

  > .open {
    display: flex;
    flex-direction: column;
    align-self: stretch;
    min-width: 0;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  > .open > .name {
    overflow: hidden;
    font-size: 19px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  > .open > .status {
    color: var(--color-text-secondary);
    font-size: 16px;
  }

  &.-on > .toggle {
    background: var(--glow, var(--color-on));
    color: #1c1c1e;
  }

  &.-selected {
    border-color: rgb(255 255 255 / 60%);
    background: rgb(255 255 255 / 14%);
  }

  &.-unavailable {
    opacity: 0.55;
  }
}
</style>
