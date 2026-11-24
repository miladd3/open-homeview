<script setup lang="ts">
import { ClockDisplay, FaceSlot } from '@/kit'

defineProps<{ options: object; night: boolean }>()
</script>

<template>
  <div class="big-clock-face" :class="{ '-night': night }">
    <ClockDisplay size="hero" />
    <FaceSlot name="bottom" class="slot" />
  </div>
</template>

<style scoped lang="scss">
.big-clock-face {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4vh;
  height: 100%;
  // fixed colour: faces keep their own backgrounds
  background: #000;

  > .slot {
    width: 44vh;
    height: 20vh;
  }

  &.-night {
    color: var(--text-secondary);
  }
}
</style>
