<script setup lang="ts">
import { computed } from 'vue'

import { formatTime, useNow } from '@/composables/useNow'

withDefaults(defineProps<{ size?: 'default' | 'hero' }>(), { size: 'default' })

const now = useNow()

const time = computed(() => formatTime(now.value))
const date = computed(() =>
  now.value.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
)
</script>

<template>
  <div class="clock-display" :class="`-${size}`">
    <time class="time" :datetime="now.toISOString()">{{ time }}</time>
    <p class="date">{{ date }}</p>
  </div>
</template>

<style scoped lang="scss">
.clock-display {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);

  > .time {
    font-size: 96px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.04em;
  }

  > .date {
    color: var(--color-text-secondary);
    font-size: 26px;
    font-weight: 500;
  }

  &.-hero {
    align-items: center;
    gap: var(--space-s);

    > .time {
      font-size: 220px;
      font-weight: 200;
      letter-spacing: -0.05em;
    }

    > .date {
      font-size: 34px;
    }
  }
}
</style>
