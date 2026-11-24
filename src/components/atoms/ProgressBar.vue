<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** 0–100 */
  value: number
}>()

const clamped = computed(() => Math.min(100, Math.max(0, props.value)))
</script>

<template>
  <div
    class="progress-bar"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="clamped"
    :style="{ '--progress': `${clamped}%` }"
  >
    <div class="fill" />
  </div>
</template>

<style scoped lang="scss">
.progress-bar {
  height: 10px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--fill-strong);

  > .fill {
    width: var(--progress);
    height: 100%;
    border-radius: inherit;
    background: var(--progress-color, var(--success));
    transition: width var(--duration-slow) var(--motion-spring);
  }
}
</style>
