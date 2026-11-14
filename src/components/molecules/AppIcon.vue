<script setup lang="ts">
import type { LucideIcon } from '@lucide/vue'

import type { Gradient } from '@/config/home'

// iPadOS style app icon: a gradient squircle with the label underneath. The label
// can be replaced through the default slot; native button attributes fall through.
defineProps<{
  label: string
  icon: LucideIcon
  colors: Gradient
}>()
</script>

<template>
  <button class="app-icon" type="button" :style="{ '--from': colors[0], '--to': colors[1] }">
    <span class="tile" aria-hidden="true">
      <component :is="icon" :size="50" :stroke-width="1.7" />
    </span>
    <span class="label">
      <slot>{{ label }}</slot>
    </span>
  </button>
</template>

<style scoped lang="scss">
.app-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-s);
  width: 120px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;

  > .tile {
    display: grid;
    place-items: center;
    width: 100px;
    height: 100px;
    // Approximates the iOS squircle.
    border-radius: 26px;
    background: linear-gradient(160deg, var(--from), var(--to));
    box-shadow:
      inset 0 1px 0 rgb(255 255 255 / 30%),
      0 10px 24px color-mix(in srgb, var(--to) 35%, transparent);
    color: #fff;
    transition:
      transform var(--duration-base) var(--ease-bounce),
      filter var(--duration-fast) ease;
  }

  &:active > .tile {
    transform: scale(0.9);
    filter: brightness(0.85);
  }

  > .label {
    max-width: 100%;
    overflow: hidden;
    font-size: 19px;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
