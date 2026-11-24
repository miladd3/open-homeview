<script setup lang="ts">
import { Sun } from '@lucide/vue'
import { computed } from 'vue'

import { RangeSlider, useLightGroup } from '@/kit'
import type { LightsApp } from '.'

// Long-press on the widget: the brightness of its group (or of every light).
const props = defineProps<{ app: LightsApp; settings?: { group?: string } }>()

const group = computed(() => props.app.groups.find((g) => g.id === props.settings?.group))
const { brightness, setBrightness } = useLightGroup(() =>
  group.value
    ? group.value.lightEntityIds
    : [...new Set(props.app.groups.flatMap((g) => g.lightEntityIds))],
)
</script>

<template>
  <RangeSlider
    :model-value="brightness"
    :label="`${group?.name ?? app.name} brightness`"
    @update:model-value="setBrightness"
  >
    <Sun :size="30" />
  </RangeSlider>
</template>
