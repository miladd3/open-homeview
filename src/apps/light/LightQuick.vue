<script setup lang="ts">
import { Sun } from '@lucide/vue'

import { RangeSlider, useLightGroup } from '@/kit'
import type { LightApp } from '.'

// Long-press on the widget: the light's brightness.
const props = defineProps<{ app: LightApp }>()

const { brightness, setBrightness } = useLightGroup(() => [props.app.entities.entity])
</script>

<template>
  <RangeSlider
    :model-value="brightness"
    :label="`${app.name} brightness`"
    @update:model-value="setBrightness"
  >
    <Sun :size="30" />
  </RangeSlider>
</template>
