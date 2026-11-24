<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import {
  Stepper,
  useEntity,
  useService,
  Widget,
  WidgetIcon,
  WidgetLabel,
  WidgetValue,
  type WidgetMode,
  type WidgetSize,
} from '@/kit'
import type { ClimateApp } from '.'

const ACTIONS: Record<string, string> = {
  heating: 'Heating',
  cooling: 'Cooling',
  drying: 'Drying',
  fan: 'Fan',
  idle: 'Idle',
  off: 'Off',
}

const props = defineProps<{ app: ClimateApp; size: WidgetSize; mode: WidgetMode }>()

const callService = useService()
const climate = useEntity(() => props.app.entities.entity)
const attributes = computed(() => climate.value?.attributes ?? {})
const current = computed(() => Number(attributes.value.current_temperature))
// A step shows right away; Home Assistant confirms it a moment later.
const pending = ref<number>()
const target = computed(() => pending.value ?? Number(attributes.value.temperature))
watch(
  () => attributes.value.temperature,
  () => (pending.value = undefined),
)

const action = computed(() => {
  const value = String(attributes.value.hvac_action ?? climate.value?.state ?? '')
  return ACTIONS[value] ?? value
})
const detail = computed(() => {
  if (!climate.value || climate.value.state === 'unavailable') return 'Unavailable'
  if (climate.value.state === 'off') return 'Off'
  return `${action.value} · Target ${target.value}°`
})

function step(direction: -1 | 1) {
  const size = Number(attributes.value.target_temp_step ?? 0.5)
  const next = Math.round((target.value + direction * size) * 10) / 10
  pending.value = next
  void callService(
    'climate',
    'set_temperature',
    { temperature: next },
    { entity_id: props.app.entities.entity },
  )
}
</script>

<template>
  <Widget class="climate-widget" :class="`-size-${size}`" :active="action === 'Heating'">
    <WidgetIcon v-if="size === '1x1'" :icon="app.icon" />
    <WidgetValue v-else>{{ Number.isNaN(current) ? '–' : `${current}°` }}</WidgetValue>
    <WidgetLabel
      :name="app.name"
      :detail="size === '1x1' && !Number.isNaN(current) ? `${current}° · ${detail}` : detail"
    />
    <Stepper v-if="size !== '1x1'" :label="`${app.name} target`" @step="step" />
  </Widget>
</template>

<style scoped lang="scss">
.climate-widget.-size-2x2 {
  justify-content: space-between;
  text-align: center;

  > .kit-widget-value {
    margin: auto 0;
  }
}
</style>
