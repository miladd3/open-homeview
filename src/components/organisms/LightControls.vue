<script setup lang="ts">
import { ChevronLeft, Sun } from '@lucide/vue'
import { computed } from 'vue'

import IconButton from '@/components/atoms/IconButton.vue'
import RangeSlider from '@/components/atoms/RangeSlider.vue'
import ToggleSwitch from '@/components/atoms/ToggleSwitch.vue'
import ColorPresets from '@/components/molecules/ColorPresets.vue'
import type { ColorPreset } from '@/config/home'
import { useRoomLight } from '@/composables/useRoomLight'
import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'

// Brightness and color for a single light, shown inside the Lights app.
const props = defineProps<{ entityId: string }>()
const emit = defineEmits<{ back: [] }>()

const config = useConfigStore()
const store = useEntitiesStore()
const { isOn, isAvailable, brightness, rgb, features, toggle, setBrightness, setRgb, setKelvin } =
  useRoomLight(() => ({ lightEntityIds: [props.entityId] }))

const name = computed(() =>
  String(store.get(props.entityId)?.attributes.friendly_name ?? props.entityId),
)
const status = computed(() => {
  if (!isAvailable.value) return 'Unavailable'
  if (!isOn.value) return 'Off'
  return brightness.value ? `${brightness.value}% brightness` : 'On'
})
// Only offer the swatches this light can show.
const presets = computed(() =>
  config.home.colors.filter((preset) =>
    'kelvin' in preset ? features.value.temperature : features.value.color,
  ),
)
const fill = computed(() => (rgb.value ? `rgb(${rgb.value.join(' ')})` : undefined))

function selectColor(preset: ColorPreset) {
  return 'kelvin' in preset ? setKelvin(preset.kelvin) : setRgb(preset.rgb)
}
</script>

<template>
  <div class="light-controls">
    <header class="header">
      <IconButton class="back" aria-label="Back to lights" @click="emit('back')">
        <ChevronLeft :size="30" />
      </IconButton>
      <div class="titles">
        <h3 class="name">{{ name }}</h3>
        <p class="status">{{ status }}</p>
      </div>
      <ToggleSwitch
        :model-value="isOn"
        :disabled="!isAvailable"
        :aria-label="isOn ? `Turn ${name} off` : `Turn ${name} on`"
        @update:model-value="toggle"
      />
    </header>

    <div class="body">
      <RangeSlider
        v-if="features.dimmable"
        class="brightness"
        :class="{ '-on': isOn }"
        :label="`${name} brightness`"
        :model-value="brightness"
        :style="{ '--slider-fill': fill }"
        @update:model-value="setBrightness"
      >
        <Sun :size="36" />
      </RangeSlider>

      <section v-if="presets.length" class="colors">
        <h4 class="heading">Colors</h4>
        <ColorPresets :presets="presets" @select="selectColor" />
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.light-controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);
  height: 100%;

  > .header {
    display: flex;
    align-items: center;
    gap: var(--space-m);
  }

  > .header > .titles {
    flex: 1;
    min-width: 0;
  }

  > .header > .titles > .name {
    overflow: hidden;
    font-size: 26px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  > .header > .titles > .status {
    color: var(--color-text-secondary);
    font-size: 18px;
  }

  > .body {
    display: flex;
    flex: 1;
    gap: var(--space-l);
    min-height: 0;
  }

  > .body > .brightness {
    flex: 0 0 140px;
    border-radius: 36px;

    &.-on {
      --slider-icon-color: #1c1c1e;
    }
  }

  > .body > .colors {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-s);
    min-width: 0;
  }

  > .body > .colors > .heading {
    color: var(--color-text-secondary);
    font-size: 17px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
}
</style>
