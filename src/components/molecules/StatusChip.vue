<script setup lang="ts">
// Apple Home style summary pill: icon, a small label and the live value. A parent
// can tint the active icon with `--chip-color`. The value can be replaced through
// the default slot; native attributes and listeners fall through.
withDefaults(
  defineProps<{
    label: string
    value: string
    active?: boolean
    tag?: 'button' | 'div'
  }>(),
  { active: false, tag: 'button' },
)
</script>

<template>
  <component
    :is="tag"
    class="status-chip"
    :class="[`-${tag}`, { '-active': active }]"
    :type="tag === 'button' ? 'button' : undefined"
  >
    <span class="icon" aria-hidden="true"><slot name="icon" /></span>
    <span class="texts">
      <span class="label">{{ label }}</span>
      <span class="value">
        <slot>{{ value }}</slot>
      </span>
    </span>
  </component>
</template>

<style scoped lang="scss">
.status-chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--space-s);
  height: 64px;
  padding: 0 var(--space-m) 0 var(--space-s);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  background: var(--glass-bg);
  color: var(--color-text);
  text-align: left;
  backdrop-filter: var(--glass-filter);
  -webkit-backdrop-filter: var(--glass-filter);

  &.-button {
    cursor: pointer;
    transition: transform var(--duration-fast) var(--ease-spring);

    &:active {
      transform: scale(0.95);
    }
  }

  > .icon {
    display: inline-grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-pill);
    background: rgb(255 255 255 / 12%);
    color: var(--color-text-secondary);
    transition:
      background-color var(--duration-base) ease,
      color var(--duration-base) ease;
  }

  > .texts {
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }

  > .texts > .label {
    color: var(--color-text-secondary);
    font-size: 15px;
    font-weight: 600;
  }

  > .texts > .value {
    font-size: 19px;
    font-weight: 600;
  }

  &.-active > .icon {
    background: var(--chip-color, var(--color-on));
    color: #1c1c1e;
  }
}
</style>
