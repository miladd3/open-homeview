<script setup lang="ts">
import { computed } from 'vue'

import {
  useEntity,
  Widget,
  WidgetIcon,
  WidgetLabel,
  WidgetValue,
  type WidgetMode,
  type WidgetSize,
} from '@/kit'
import type { SensorApp } from '.'

const props = defineProps<{ app: SensorApp; size: WidgetSize; mode: WidgetMode }>()

const sensor = useEntity(() => props.app.entities.entity)
const value = computed(() => {
  const state = sensor.value?.state
  if (state === undefined || state === 'unavailable' || state === 'unknown') return '–'
  const unit = String(sensor.value?.attributes.unit_of_measurement ?? '')
  return unit === '°C' || unit === '°F' || unit === '%' ? `${state}${unit}` : `${state} ${unit}`
})
</script>

<template>
  <Widget class="sensor-widget">
    <div class="top">
      <WidgetValue>{{ value }}</WidgetValue>
      <WidgetIcon v-if="size !== '1x1'" :icon="app.icon" />
    </div>
    <WidgetLabel :name="app.name" />
  </Widget>
</template>

<style scoped lang="scss">
.sensor-widget > .top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
</style>
