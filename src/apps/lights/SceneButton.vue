<script setup lang="ts">
// Apple Home style scene tile: gradient dot plus label. The label can be replaced
// through the default slot; native button attributes fall through.
defineProps<{
  label: string
  colors: [string, string]
}>()
</script>

<template>
  <button class="scene-button" type="button" :style="{ '--from': colors[0], '--to': colors[1] }">
    <span class="swatch" aria-hidden="true" />
    <span class="label">
      <slot>{{ label }}</slot>
    </span>
  </button>
</template>

<style scoped lang="scss">
.scene-button {
  display: flex;
  align-items: center;
  gap: var(--space-s);
  min-height: 76px;
  padding: var(--space-s) var(--space-m) var(--space-s) var(--space-s);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-m);
  background: var(--fill);
  text-align: left;
  cursor: pointer;
  transition:
    transform var(--duration-base) var(--motion-bounce),
    background-color var(--duration-fast) ease;

  &:active {
    background: var(--fill-strong);
    transform: scale(0.95);
  }

  > .swatch {
    flex: none;
    width: 50px;
    height: 50px;
    border-radius: var(--radius-pill);
    background: linear-gradient(135deg, var(--from), var(--to));
    box-shadow:
      inset 0 0 0 1px var(--surface-border),
      0 6px 16px color-mix(in srgb, var(--to) 40%, transparent);
  }

  > .label {
    font-size: 20px;
    font-weight: 600;
  }
}
</style>
