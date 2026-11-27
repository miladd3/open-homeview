<script setup lang="ts">
// Round touch button. Native button attributes (aria-label, disabled, type…)
// and listeners fall through to the <button>.
withDefaults(
  defineProps<{
    variant?: 'glass' | 'filled' | 'danger'
    active?: boolean
  }>(),
  { variant: 'glass', active: false },
)
</script>

<template>
  <button class="icon-button" :class="[`-${variant}`, { '-active': active }]" type="button">
    <span class="icon"><slot /></span>
  </button>
</template>

<style scoped lang="scss">
.icon-button {
  display: inline-grid;
  place-items: center;
  width: var(--touch-min);
  height: var(--touch-min);
  padding: 0;
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-pill);
  background: var(--surface-bg);
  color: var(--text-primary);
  cursor: pointer;
  -webkit-backdrop-filter: var(--surface-filter);
  // Standard last: the CSS minifier keeps only the last of the pair.
  backdrop-filter: var(--surface-filter);
  transition:
    transform var(--duration-fast) var(--motion-spring),
    background-color var(--duration-base) ease,
    color var(--duration-base) ease;

  &:active {
    transform: scale(0.92);
  }

  &:disabled {
    opacity: 0.4;
    pointer-events: none;
  }

  &.-filled {
    border-color: transparent;
    background: var(--accent);
  }

  &.-danger {
    border-color: transparent;
    background: var(--danger);
  }

  &.-active {
    background: var(--widget-on-bg);
    color: var(--widget-on-text);
  }

  > .icon {
    display: inline-flex;
  }
}
</style>
