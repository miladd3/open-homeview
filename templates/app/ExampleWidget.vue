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
import type { ExampleApp } from '.'

// The dashboard widget. It looks right in every size the type declares (text
// follows the cell, so no pixel sizes), and emits `open` for the host to open
// the screen. One tap does one thing.
const props = defineProps<{ app: ExampleApp; size: WidgetSize; mode: WidgetMode }>()
const emit = defineEmits<{ open: [] }>()

// Pass IDs as getters, so they follow prop changes.
const entity = useEntity(() => props.app.entities.entity)
const on = computed(() => entity.value?.state === 'on')
</script>

<template>
  <Widget :active="on" @tap="emit('open')">
    <WidgetIcon :icon="app.icon" />
    <WidgetValue v-if="size === '2x1'">{{ on ? 'On' : 'Off' }}</WidgetValue>
    <WidgetLabel :name="app.name" :detail="entity?.state ?? 'Unavailable'" />
  </Widget>
</template>
