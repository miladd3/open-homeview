<script setup lang="ts">
import { Power } from '@lucide/vue'
import { computed } from 'vue'

import { AppSheet, useEntity, useService } from '@/kit'
import type { ExampleApp } from '.'

// The full-screen view: <AppSheet> gives it the ✕, the app's icon, name and
// status. Emit `close` to close it.
const props = defineProps<{ app: ExampleApp }>()
const emit = defineEmits<{ close: [] }>()

const callService = useService()
const entity = useEntity(() => props.app.entities.entity)
const on = computed(() => entity.value?.state === 'on')

// The last argument shows the new state right away, before Home Assistant answers.
const toggle = () =>
  callService(
    'homeassistant',
    'toggle',
    {},
    { entity_id: props.app.entities.entity },
    { state: on.value ? 'off' : 'on' },
  )
</script>

<template>
  <AppSheet class="example-panel" :app="app" :status="on ? 'On' : 'Off'" @close="emit('close')">
    <button class="toggle" :class="{ '-on': on }" type="button" :aria-pressed="on" @click="toggle">
      <Power :size="64" :stroke-width="1.6" />
    </button>
  </AppSheet>
</template>

<style scoped lang="scss">
// Colours only from theme tokens (src/themes/glass/tokens.scss lists them).
.example-panel .toggle {
  display: grid;
  place-items: center;
  flex: 1;
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-l);
  background: var(--fill);
  color: var(--text-secondary);
  cursor: pointer;

  &.-on {
    background: var(--widget-on-bg);
    color: var(--widget-on-text);
  }
}
</style>
