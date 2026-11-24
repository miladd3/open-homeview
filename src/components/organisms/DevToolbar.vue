<script setup lang="ts">
import { BellRing, Moon } from '@lucide/vue'
import { onBeforeUnmount, onMounted } from 'vue'

import type { MockConnection } from '@/ha/mock/MockConnection'
import { useConfigStore } from '@/stores/config'
import { useKioskStore } from '@/stores/kiosk'

// Only rendered against the mock: lets you fire the kiosk.yaml events, which
// would otherwise need real hardware. Keyboard: E = first event, S = standby.
const props = defineProps<{ mock: MockConnection }>()

const { apps, events } = useConfigStore().home
const kiosk = useKioskStore()
const buttons = events.map((event) => ({
  event,
  label: apps.find((app) => app.id === event.appId)?.name ?? event.appId,
}))

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'e' && events[0]) props.mock.fireEvent(events[0])
  if (event.key === 's') kiosk.sleep()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="dev-toolbar">
    <span class="badge">Mock</span>
    <button
      v-for="({ event, label }, i) in buttons"
      :key="i"
      class="action"
      type="button"
      :title="`Fire ${event.entityId}`"
      @click="mock.fireEvent(event)"
    >
      <BellRing :size="16" /> {{ label }}
    </button>
    <button class="action" type="button" @click="kiosk.sleep()"><Moon :size="16" /> Sleep</button>
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
  // fixed colour: dev mode only
  border: 1px dashed rgb(255 255 255 / 25%);
  border-radius: var(--radius-pill);
  // fixed colour: dev mode only
  background: rgb(0 0 0 / 60%);
  font-size: 13px;
  opacity: 0.6;

  &:hover {
    opacity: 1;
  }

  > .badge {
    padding: 2px 10px;
    color: var(--on-color);
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
    // fixed colour: dev mode only
    background: rgb(255 255 255 / 12%);
    cursor: pointer;
  }
}
</style>
