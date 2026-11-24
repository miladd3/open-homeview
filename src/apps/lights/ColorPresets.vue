<script setup lang="ts">
import { kelvinToRgb } from '@/kit'
import type { ColorPreset } from '@/kit/define'

defineProps<{ presets: ColorPreset[] }>()
const emit = defineEmits<{ select: [preset: ColorPreset] }>()

function swatch(preset: ColorPreset) {
  const [r, g, b] = 'kelvin' in preset ? kelvinToRgb(preset.kelvin) : preset.rgb
  return `rgb(${r} ${g} ${b})`
}
</script>

<template>
  <ul class="color-presets">
    <li v-for="preset in presets" :key="preset.name" class="item">
      <button
        class="swatch"
        type="button"
        :aria-label="preset.name"
        :style="{ '--swatch': swatch(preset) }"
        @click="emit('select', preset)"
      />
    </li>
  </ul>
</template>

<style scoped lang="scss">
.color-presets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-m);
  padding: 0;
  margin: 0;
  list-style: none;

  > .item > .swatch {
    width: 60px;
    height: 60px;
    padding: 0;
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--swatch);
    box-shadow: inset 0 0 0 1px rgb(255 255 255 / 25%);
    cursor: pointer;
    transition: transform var(--duration-base) var(--ease-bounce);

    &:active {
      transform: scale(0.88);
    }
  }
}
</style>
