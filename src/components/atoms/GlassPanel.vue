<script setup lang="ts">
withDefaults(
  defineProps<{
    tag?: string
    variant?: 'default' | 'strong'
  }>(),
  { tag: 'div', variant: 'default' },
)
</script>

<template>
  <component :is="tag" class="glass-panel" :class="`-${variant}`">
    <slot />
  </component>
</template>

<style scoped lang="scss">
.glass-panel {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-l);
  background: var(--glass-bg);
  box-shadow: var(--shadow-soft);
  backdrop-filter: var(--glass-filter);
  -webkit-backdrop-filter: var(--glass-filter);

  &.-strong {
    background: var(--glass-bg-strong);
  }
}
</style>
