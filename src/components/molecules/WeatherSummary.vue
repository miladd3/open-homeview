<script setup lang="ts">
import type { LucideIcon } from '@lucide/vue'

withDefaults(
  defineProps<{
    icon: LucideIcon
    temperature: number
    unit: string
    label: string
    size?: 'default' | 'hero'
  }>(),
  { size: 'default' },
)
</script>

<template>
  <div class="weather-summary" :class="`-${size}`">
    <component :is="icon" class="icon" :stroke-width="1.6" aria-hidden="true" />
    <div class="details">
      <p class="temperature">{{ temperature }}{{ unit }}</p>
      <p class="label">{{ label }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.weather-summary {
  display: flex;
  align-items: center;
  gap: var(--space-s);

  > .icon {
    width: 56px;
    height: 56px;
    color: var(--color-on);
  }

  > .details > .temperature {
    font-size: 40px;
    font-weight: 600;
    line-height: 1;
  }

  > .details > .label {
    color: var(--color-text-secondary);
    font-size: 20px;
  }

  &.-hero {
    gap: var(--space-m);

    > .icon {
      width: 72px;
      height: 72px;
    }

    > .details > .temperature {
      font-size: 56px;
      font-weight: 300;
    }

    > .details > .label {
      font-size: 24px;
    }
  }
}
</style>
