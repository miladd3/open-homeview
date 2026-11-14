<script setup lang="ts">
import { BellRing, Moon } from '@lucide/vue'
import { onBeforeUnmount, onMounted } from 'vue'

import type { MockConnection } from '@/ha/mock/MockConnection'

// Only rendered against the mock: lets you trigger events that would
// otherwise need real hardware. Keyboard: R = ring, S = screensaver.
const props = defineProps<{ mock: MockConnection }>()
const emit = defineEmits<{ sleep: [] }>()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'r') props.mock.simulateDoorbellRing()
  if (event.key === 's') emit('sleep')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="dev-toolbar">
    <span class="badge">Mock</span>
    <button class="action" type="button" @click="mock.simulateDoorbellRing()">
      <BellRing :size="16" /> Ring
    </button>
    <button class="action" type="button" @click="emit('sleep')"><Moon :size="16" /> Sleep</button>
  </div>
</template>

<style scoped lang="scss">
.dev-toolbar {
  position: fixed;
  right: var(--space-s);
  bottom: var(--space-s);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs);
  border: 1px dashed rgb(255 255 255 / 25%);
  border-radius: var(--radius-pill);
  background: rgb(0 0 0 / 60%);
  font-size: 13px;
  opacity: 0.6;

  &:hover {
    opacity: 1;
  }

  > .badge {
    padding: 2px 10px;
    color: var(--color-on);
    font-weight: 700;
    text-transform: uppercase;
  }

  > .action {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border: 0;
    border-radius: var(--radius-pill);
    background: rgb(255 255 255 / 12%);
    cursor: pointer;
  }
}
</style>
