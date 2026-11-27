<script setup lang="ts">
// A card in the theme's material (glass, flat…). A theme's material.scss may style
// `.kit-surface`, like `.kit-widget` and `.kit-sheet`.
withDefaults(defineProps<{ tag?: string }>(), { tag: 'div' })
</script>

<template>
  <component :is="tag" class="kit-surface">
    <slot />
  </component>
</template>

<style scoped lang="scss">
.kit-surface {
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-l);
  background: var(--surface-bg);
  box-shadow: var(--widget-shadow);
  -webkit-backdrop-filter: var(--surface-filter);
  // Standard last: the CSS minifier keeps only the last of the pair.
  backdrop-filter: var(--surface-filter);
}
</style>
