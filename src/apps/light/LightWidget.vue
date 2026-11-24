<script setup lang="ts">
import { computed } from 'vue'

import {
  useLightGroup,
  Widget,
  WidgetIcon,
  WidgetLabel,
  type WidgetMode,
  type WidgetSize,
} from '@/kit'
import type { LightApp } from '.'

const props = defineProps<{ app: LightApp; size: WidgetSize; mode: WidgetMode }>()

const { isOn, isAvailable, brightness, rgb, toggle } = useLightGroup(() => [
  props.app.entities.entity,
])
const detail = computed(() => {
  if (!isAvailable.value) return 'Unavailable'
  if (!isOn.value) return 'Off'
  return brightness.value ? `${brightness.value}%` : 'On'
})
</script>

<template>
  <Widget :active="isOn" :color="rgb ? `rgb(${rgb.join(' ')})` : undefined" @tap="toggle">
    <WidgetIcon :icon="app.icon" />
    <WidgetLabel :name="app.name" :detail="detail" />
  </Widget>
</template>
