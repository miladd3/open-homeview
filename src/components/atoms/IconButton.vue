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
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  background: var(--glass-bg);
  color: var(--color-text);
  cursor: pointer;
  backdrop-filter: var(--glass-filter);
  -webkit-backdrop-filter: var(--glass-filter);
  transition:
    transform var(--duration-fast) var(--ease-spring),
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
    background: var(--color-accent);
  }

  &.-danger {
    border-color: transparent;
    background: var(--color-danger);
  }

  &.-active {
    background: var(--glass-active-bg);
    color: var(--glass-active-text);
  }

  > .icon {
    display: inline-flex;
  }
}
</style>
