<script setup lang="ts">
import { computed, ref } from 'vue'

import { icons, RangeSlider, ToggleSwitch } from '@/kit'
import type { ColorPreset, IconName } from '@/kit/define'
import ColorPresets from './ColorPresets.vue'
import { useLightGroup } from './useLightGroup'

// One row of the Lights app: a whole group (its header) or the options of the
// light picked from the cards.
// Toggle and brightness on the row, and the color swatches the lights support
// underneath: always for a single light, on a tap of the icon for a group.
const props = defineProps<{
  lightEntityIds: string[]
  presets: ColorPreset[]
  /** Defaults to the light's name in Home Assistant. */
  name?: string
  icon?: IconName
  /** Always show the color swatches, with no icon (the light's options). */
  colorsOpen?: boolean
}>()

const {
  lights,
  isOn,
  isAvailable,
  brightness,
  rgb,
  features,
  toggle,
  setBrightness,
  setRgb,
  setKelvin,
} = useLightGroup(() => props.lightEntityIds)

const showColors = ref(false)
const name = computed(
  () =>
    props.name ??
    String(lights.value[0]?.attributes.friendly_name ?? props.lightEntityIds[0] ?? ''),
)
const status = computed(() => {
  if (!isAvailable.value) return 'Unavailable'
  if (!isOn.value) return 'Off'
  const on = lights.value.filter((light) => light.state === 'on').length
  const count = lights.value.length > 1 ? `${on} of ${lights.value.length} on` : 'On'
  return brightness.value ? `${count} · ${brightness.value}%` : count
})
const shownPresets = computed(() =>
  props.presets.filter((preset) =>
    'kelvin' in preset ? features.value.temperature : features.value.color,
  ),
)
const glow = computed(() => (rgb.value ? `rgb(${rgb.value.join(' ')})` : undefined))

function selectColor(preset: ColorPreset) {
  return 'kelvin' in preset ? setKelvin(preset.kelvin) : setRgb(preset.rgb)
}
</script>

<template>
  <div
    class="light-row"
    :class="{ '-on': isOn, '-unavailable': !isAvailable, '-options': colorsOpen }"
  >
    <div class="main">
      <button
        v-if="!colorsOpen"
        class="icon"
        type="button"
        :aria-expanded="showColors"
        :aria-label="`${name} colors`"
        :disabled="!shownPresets.length"
        :style="{ '--glow': glow }"
        @click="showColors = !showColors"
      >
        <component :is="icons[icon ?? 'lightbulb']" :size="28" :stroke-width="1.8" />
      </button>
      <span class="texts">
        <span class="name">{{ name }}</span>
        <span class="status">{{ status }}</span>
      </span>
      <RangeSlider
        v-if="features.dimmable"
        class="brightness"
        orientation="horizontal"
        :label="`${name} brightness`"
        :model-value="brightness"
        :style="{ '--slider-fill': glow }"
        @update:model-value="setBrightness"
      />
      <ToggleSwitch
        :model-value="isOn"
        :disabled="!isAvailable"
        :aria-label="isOn ? `Turn ${name} off` : `Turn ${name} on`"
        @update:model-value="toggle"
      />
    </div>
    <ColorPresets
      v-if="colorsOpen || showColors"
      class="colors"
      :presets="shownPresets"
      @select="selectColor"
    />
  </div>
</template>

<style scoped lang="scss">
.light-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-s);

  > .main {
    display: flex;
    align-items: center;
    gap: var(--space-m);
  }

  > .main > .icon {
    display: inline-grid;
    flex: none;
    place-items: center;
    width: 56px;
    height: 56px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-pill);
    background: rgb(255 255 255 / 14%);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition:
      transform var(--duration-fast) var(--ease-spring),
      background-color var(--duration-base) ease;

    &:active {
      transform: scale(0.88);
    }

    &:disabled {
      cursor: default;
    }
  }

  > .main > .texts {
    display: flex;
    flex: 0 0 280px;
    flex-direction: column;
    min-width: 0;
  }

  > .main > .texts > .name {
    overflow: hidden;
    font-size: 20px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  > .main > .texts > .status {
    color: var(--color-text-secondary);
    font-size: 16px;
  }

  > .main > .brightness {
    flex: 1;
    height: 48px;
    border-radius: var(--radius-pill);
  }

  > .main > .toggle-switch {
    margin-left: auto;
  }

  > .colors {
    padding-left: calc(56px + var(--space-m));

    :deep(.swatch) {
      width: 52px;
      height: 52px;
    }
  }

  &.-options > .colors {
    padding-left: 0;
  }

  &.-on > .main > .icon {
    background: var(--glow, var(--color-on));
    color: #1c1c1e;
  }

  &.-unavailable {
    opacity: 0.55;
  }
}
</style>
