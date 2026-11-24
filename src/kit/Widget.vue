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
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-l);
  background: var(--widget-bg);
  box-shadow: var(--widget-shadow);
  color: var(--text-primary);
  container-type: size;
  cursor: pointer;
  backdrop-filter: var(--surface-filter);
  -webkit-backdrop-filter: var(--surface-filter);
  transition:
    transform var(--duration-base) var(--motion-spring),
    background-color var(--duration-base) ease,
    color var(--duration-base) ease;

  &:active {
    transform: scale(0.96);
  }

  // Widget parts read these, so they follow the active look wherever they sit.
  &.-active {
    --widget-icon-bg: var(--widget-tint, var(--on-color));
    --widget-icon-color: var(--widget-on-text);
    --widget-detail-color: color-mix(in srgb, var(--widget-on-text) 65%, transparent);

    background: var(--widget-on-bg);
    color: var(--widget-on-text);
  }
}
</style>
