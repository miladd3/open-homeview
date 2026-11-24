<script setup lang="ts">
import { computed } from 'vue'

import type { LightGroup } from '@/apps'
import { useLightGroup } from '@/kit'
import { icons } from '@/config/icons'

// Apple Home style tile for a Lights group. Tapping the icon toggles its lights;
// tapping anywhere else opens the Lights app at that group.
const props = defineProps<{ room: LightGroup }>()
const emit = defineEmits<{ open: [groupId: string] }>()

const { isOn, isAvailable, brightness, rgb, toggle } = useLightGroup(
  () => props.room.lightEntityIds,
)

const status = computed(() => {
  if (!isAvailable.value) return 'Unavailable'
  if (!isOn.value) return 'Off'
  // Brightness is unknown for a moment after turning on (predicted state).
  return brightness.value ? `On · ${brightness.value}%` : 'On'
})
const glow = computed(() => (rgb.value ? `rgb(${rgb.value.join(' ')})` : 'transparent'))
</script>

<template>
  <div
    class="room-tile"
    :class="{ '-on': isOn, '-unavailable': !isAvailable }"
    :style="{ '--glow': glow }"
  >
    <button
      class="open"
      type="button"
      :aria-label="`${room.name}, ${status}. Open controls.`"
      @click="emit('open', room.id)"
    />
    <span class="glow" aria-hidden="true" />
    <button
      class="toggle"
      type="button"
      :aria-pressed="isOn"
      :aria-label="isOn ? `Turn ${room.name} off` : `Turn ${room.name} on`"
      :disabled="!isAvailable"
      @click="toggle"
    >
      <component :is="icons[room.icon]" :size="34" :stroke-width="1.8" />
    </button>
    <span class="name">{{ room.name }}</span>
    <span class="status">{{ status }}</span>
  </div>
</template>

<style scoped lang="scss">
.room-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  overflow: hidden;
  height: 168px;
  padding: var(--space-m);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-l);
  background: var(--glass-bg);
  box-shadow: var(--shadow-soft);
  color: var(--color-text);
  backdrop-filter: var(--glass-filter);
  -webkit-backdrop-filter: var(--glass-filter);
  transition:
    transform var(--duration-base) var(--ease-spring),
    background-color var(--duration-base) ease,
    color var(--duration-base) ease;

  &:has(> .open:active) {
    transform: scale(0.96);
  }

  // Covers the whole tile; the icon button and labels sit on top of it.
  > .open {
    position: absolute;
    inset: 0;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  > .glow {
    position: absolute;
    top: -50%;
    left: -30%;
    width: 110%;
    aspect-ratio: 1;
    border-radius: 50%;
    background: radial-gradient(circle, var(--glow), transparent 60%);
    opacity: 0;
    transition: opacity var(--duration-slow) ease;
    pointer-events: none;
  }

  > .toggle {
    position: relative;
    display: inline-grid;
    place-items: center;
    width: 64px;
    height: 64px;
    margin-bottom: auto;
    padding: 0;
    border: 0;
    border-radius: var(--radius-pill);
    background: rgb(255 255 255 / 14%);
    cursor: pointer;
    transition:
      transform var(--duration-fast) var(--ease-spring),
      background-color var(--duration-base) ease,
      color var(--duration-base) ease;

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
    font-size: 24px;
    font-weight: 600;
  }

  > .status {
    color: var(--color-text-secondary);
    font-size: 19px;
    font-weight: 500;
  }

  &.-on {
    background: var(--glass-active-bg);
    color: var(--glass-active-text);

    > .glow {
      opacity: 0.5;
    }

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
