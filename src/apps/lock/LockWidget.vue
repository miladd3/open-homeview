<script setup lang="ts">
import { computed } from 'vue'

import {
  useEntity,
  useService,
  Widget,
  WidgetIcon,
  WidgetLabel,
  type WidgetMode,
  type WidgetSize,
} from '@/kit'
import type { LockApp } from '.'

const STATES: Record<string, string> = {
  locked: 'Locked',
  unlocked: 'Unlocked',
  locking: 'Locking…',
  unlocking: 'Unlocking…',
  jammed: 'Jammed',
  open: 'Open',
  unavailable: 'Unavailable',
}

const props = defineProps<{ app: LockApp; size: WidgetSize; mode: WidgetMode }>()

const callService = useService()
const lock = useEntity(() => props.app.entities.entity)
const state = computed(() => lock.value?.state ?? 'unavailable')

function toggle() {
  if (state.value === 'unavailable') return
  const service = state.value === 'locked' ? 'unlock' : 'lock'
  void callService('lock', service, {}, { entity_id: props.app.entities.entity })
}
</script>

<template>
  <Widget :active="state !== 'locked'" @tap="toggle">
    <WidgetIcon :icon="app.icon" />
    <WidgetLabel :name="app.name" :detail="STATES[state] ?? state" />
  </Widget>
</template>
