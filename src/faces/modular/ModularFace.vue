<script setup lang="ts">
import { computed } from 'vue'

import { FaceSlot, formatTime, useNow } from '@/kit'
import type { ModularOptions } from '.'

defineProps<{ options: ModularOptions; night: boolean }>()

const now = useNow()
const date = computed(() =>
  now.value.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
)
</script>

<template>
  <div class="modular-face" :class="{ '-night': night }">
    <div class="time">
      <p class="date" :style="{ color: night ? undefined : options.color }">{{ date }}</p>
      <time :datetime="now.toISOString()">{{ formatTime(now) }}</time>
    </div>
    <div class="slots">
      <FaceSlot name="right1" class="slot" />
      <FaceSlot name="right2" class="slot" />
      <FaceSlot name="right3" class="slot" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.modular-face {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 5vh;
  height: 100%;
  padding: 6vh;
  background: #000;

  > .time {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1vh;
    font-size: 30vh;
    font-weight: 600;
    line-height: 0.9;
    letter-spacing: -0.04em;
  }

  > .time > .date {
    font-size: 6vh;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  > .slots {
    display: grid;
    grid-template-rows: repeat(3, 1fr);
    gap: 2.5vh;
    width: 28vh;
  }

  &.-night {
    color: var(--color-text-secondary);
  }
}
</style>
