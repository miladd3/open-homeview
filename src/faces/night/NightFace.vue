<script setup lang="ts">
import { formatTime, useNow } from '@/kit'

defineProps<{ options: object; night: boolean }>()

const now = useNow()
</script>

<template>
  <div class="night-face">
    <time :datetime="now.toISOString()">{{ formatTime(now) }}</time>
  </div>
</template>

<style scoped lang="scss">
.night-face {
  display: grid;
  place-items: center;
  height: 100%;
  background: #000;
  color: #d70015; // the face itself: dim red, easy on eyes in the dark
  font-size: 36vh;
  font-weight: 200;
  letter-spacing: -0.04em;
}
</style>
