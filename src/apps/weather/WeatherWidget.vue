<script setup lang="ts">
import { Widget, WidgetLabel, WidgetValue, type WidgetMode, type WidgetSize } from '@/kit'
import type { WeatherApp } from '.'
import { useWeather } from './useWeather'

const props = defineProps<{ app: WeatherApp; size: WidgetSize; mode: WidgetMode }>()

const weather = useWeather(() => props.app.weatherEntityId)
</script>

<template>
  <Widget class="weather-widget">
    <template v-if="weather">
      <div class="top">
        <WidgetValue>{{ weather.temperature }}°</WidgetValue>
        <component :is="weather.icon" class="icon" :stroke-width="1.6" aria-hidden="true" />
      </div>
      <WidgetLabel :name="weather.label" :detail="size === '1x1' ? app.name : weather.detail" />
    </template>
    <WidgetLabel v-else :name="app.name" detail="Unavailable" />
  </Widget>
</template>

<style scoped lang="scss">
.weather-widget > .top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  > .icon {
    width: calc(var(--u) * 30);
    height: calc(var(--u) * 30);
    color: var(--color-on);
  }
}
</style>
