<script setup lang="ts">
import { computed } from 'vue'

import ClockDisplay from '@/components/molecules/ClockDisplay.vue'
import WeatherSummary from '@/components/molecules/WeatherSummary.vue'
import { useNow } from '@/composables/useNow'
import { useWeather } from '@/apps/weather/useWeather'
import { useConfigStore } from '@/stores/config'

const emit = defineEmits<{ wake: [] }>()

const now = useNow()
const weather = useWeather(() => useConfigStore().home.weatherEntityId)
const { nightHours } = useConfigStore().home

const isNight = computed(() => {
  const hour = now.value.getHours()
  return hour >= nightHours.from || hour < nightHours.to
})

// Nudge the content a few pixels every minute so static pixels don't burn in.
const shift = computed(() => {
  const minute = now.value.getHours() * 60 + now.value.getMinutes()
  const x = ((minute * 7) % 21) - 10
  const y = ((minute * 11) % 21) - 10
  return `${x}px, ${y}px`
})
</script>

<template>
  <div
    class="screen-saver"
    :class="{ '-night': isNight }"
    role="button"
    aria-label="Wake screen"
    :style="{ '--shift': shift }"
    @pointerdown.prevent="emit('wake')"
  >
    <div class="content">
      <ClockDisplay size="hero" />
      <WeatherSummary
        v-if="weather"
        size="hero"
        :icon="weather.icon"
        :temperature="weather.temperature"
        :unit="weather.unit"
        :label="weather.label"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.screen-saver {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: #000;
  cursor: pointer;

  > .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-l);
    transform: translate(var(--shift));
    transition:
      transform 4s ease,
      opacity 2s ease;
  }

  &.-night > .content {
    opacity: 0.35;
  }
}

// <Transition name="screensaver"> hooks
.screensaver-enter-active,
.screensaver-leave-active {
  transition: opacity var(--duration-slow) ease;
}

.screensaver-enter-from,
.screensaver-leave-to {
  opacity: 0;
}
</style>
