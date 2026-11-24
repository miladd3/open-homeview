<script setup lang="ts">
import { FaceSlot } from '@/kit'
import type { HomeModularOptions } from '.'

defineProps<{ options: HomeModularOptions; night: boolean }>()

const SLOTS = ['top1', 'top2', 'top3', 'bottom1', 'bottom2', 'bottom3']
</script>

<template>
  <div
    class="home-modular-face"
    :class="{ '-night': night }"
    :style="{ '--face-color': options.color }"
  >
    <FaceSlot v-for="name in SLOTS" :key="name" :name="name" :style="{ gridArea: name }" />
  </div>
</template>

<style scoped lang="scss">
.home-modular-face {
  display: grid;
  grid-template:
    'top1 top2 top3' 1fr
    'bottom1 bottom2 bottom3' 1fr / 1fr 1fr 1fr;
  gap: 2.5vh;
  height: 100%;
  padding: 5vh;
  // fixed colour: the face's own colour, darkened
  background: linear-gradient(
    160deg,
    var(--face-color),
    color-mix(in oklab, var(--face-color), #000 65%)
  );

  &.-night {
    // fixed colour: the face's own colour, darkened
    background: color-mix(in oklab, var(--face-color), #000 85%);
  }
}
</style>
