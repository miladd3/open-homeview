<script setup lang="ts">
import { computed } from 'vue'

import {
  formatTime,
  useNow,
  Widget,
  WidgetLabel,
  WidgetValue,
  type WidgetMode,
  type WidgetSize,
} from '@/kit'
import type { ClockApp } from '.'

const props = defineProps<{ app: ClockApp; size: WidgetSize; mode: WidgetMode }>()

const now = useNow()
const time = computed(() => formatTime(now.value))
const weekday = computed(() =>
  now.value.toLocaleDateString('en-GB', { weekday: props.size === '1x1' ? 'short' : 'long' }),
)
const date = computed(() =>
  now.value.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: props.size === '1x1' ? 'short' : 'long',
  }),
)
</script>

<template>
  <Widget class="clock-widget">
    <WidgetValue>
      <time :datetime="now.toISOString()">{{ time }}</time>
    </WidgetValue>
    <WidgetLabel :name="weekday" :detail="date" />
  </Widget>
</template>

<style scoped lang="scss">
.clock-widget {
  justify-content: center;
}
</style>
