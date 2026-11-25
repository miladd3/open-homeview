<script setup lang="ts">
import { FaceSlot, formatTime, useNow } from '@/kit'
import type { ExampleOptions } from '.'

// A face draws itself; the kiosk does the rest (idle timer, swiping, waking,
// night hours, burn-in shift). `night` is true during night hours. No timers
// but `useNow` (once a second), and animate only transform and opacity.
defineProps<{ options: ExampleOptions; night: boolean }>()
const now = useNow()
</script>

<template>
  <div class="example-face">
    <time class="time" :style="{ color: options.color }">{{ formatTime(now) }}</time>
    <!-- The widget kiosk.yaml put in the `bottom` slot, or nothing. -->
    <FaceSlot name="bottom" class="slot" />
  </div>
</template>

<style scoped lang="scss">
.example-face {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4vh;
  height: 100%;
  // fixed colour: faces keep their own backgrounds
  background: #000;

  > .time {
    font-size: 30vh;
    font-weight: 600;
    line-height: 1;
  }

  > .slot {
    width: 36vw;
    height: 20vh;
  }
}
</style>
