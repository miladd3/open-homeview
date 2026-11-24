<script setup lang="ts">
import { icons } from '@/config/icons'
import type { IconName } from './define'

// The round icon in a widget's corner. In an active widget it takes the tint.
defineProps<{ icon: IconName }>()
</script>

<template>
  <span class="kit-widget-icon" aria-hidden="true">
    <component :is="icons[icon]" class="glyph" :stroke-width="1.8" />
  </span>
</template>

<style scoped lang="scss">
.kit-widget-icon {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: calc(var(--u) * 30);
  height: calc(var(--u) * 30);
  border-radius: var(--radius-pill);
  background: var(--widget-icon-bg, var(--fill-strong));
  color: var(--widget-icon-color, inherit);
  transition:
    background-color var(--duration-base) ease,
    color var(--duration-base) ease;

  > .glyph {
    width: 55%;
    height: 55%;
  }
}
</style>
