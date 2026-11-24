<script setup lang="ts">
// The rounded box of a dashboard widget. Tinted when `active` (a light that is
// on, a vacuum that cleans). `color` tints the icon; it defaults to the theme's
// "on" color. Emits `tap`; long-press belongs to the host (quick controls).
// Sizes inside it follow `--cell`, the height of one grid cell, set by the host.
withDefaults(defineProps<{ active?: boolean; color?: string }>(), { active: false })
const emit = defineEmits<{ tap: [] }>()
</script>

<template>
  <div
    class="kit-widget"
    :class="{ '-active': active }"
    role="button"
    tabindex="0"
    :style="color ? { '--widget-tint': color } : undefined"
    @click="emit('tap')"
    @keydown.enter="emit('tap')"
  >
    <slot />
  </div>
</template>

<style scoped lang="scss">
.kit-widget {
  // One unit is 1% of a cell's height, so text is the same size in every widget size.
  --u: calc(var(--cell, 200px) / 100);

  position: relative;
  display: flex;
  flex-direction: column;
  gap: calc(var(--u) * 4);
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: calc(var(--u) * 9);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-l);
  background: var(--glass-bg);
  box-shadow: var(--shadow-soft);
  color: var(--color-text);
  container-type: size;
  cursor: pointer;
  backdrop-filter: var(--glass-filter);
  -webkit-backdrop-filter: var(--glass-filter);
  transition:
    transform var(--duration-base) var(--ease-spring),
    background-color var(--duration-base) ease,
    color var(--duration-base) ease;

  &:active {
    transform: scale(0.96);
  }

  // Widget parts read these, so they follow the active look wherever they sit.
  &.-active {
    --widget-icon-bg: var(--widget-tint, var(--color-on));
    --widget-icon-color: #1c1c1e;
    --widget-detail-color: rgb(60 60 67 / 70%);

    background: var(--glass-active-bg);
    color: var(--glass-active-text);
  }
}
</style>
