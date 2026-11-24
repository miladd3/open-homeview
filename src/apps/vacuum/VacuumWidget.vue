<script setup lang="ts">
import {
  ProgressBar,
  Widget,
  WidgetIcon,
  WidgetLabel,
  type WidgetMode,
  type WidgetSize,
} from '@/kit'
import type { VacuumApp } from '.'
import { useVacuum } from './useVacuum'

const props = defineProps<{ app: VacuumApp; size: WidgetSize; mode: WidgetMode }>()
const emit = defineEmits<{ open: [] }>()

const { status, progress, isCleaning } = useVacuum(() => props.app)
</script>

<template>
  <Widget :active="isCleaning" :color="app.colors[0]" @tap="emit('open')">
    <WidgetIcon :icon="app.icon" />
    <WidgetLabel
      :name="app.name"
      :detail="isCleaning && app.entities.progress ? `${status} · ${progress}%` : status"
    />
    <ProgressBar v-if="size === '2x1' && app.entities.progress" :value="progress" />
  </Widget>
</template>
