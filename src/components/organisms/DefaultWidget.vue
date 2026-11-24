<script setup lang="ts">
import { computed } from 'vue'

import { type AppConfig, statusOf } from '@/apps'
import { Widget, WidgetIcon, WidgetLabel, type WidgetMode, type WidgetSize } from '@/kit'

// The widget of an app type that has a screen but no widget of its own: its icon,
// name and status, tinted while the app is active. Tap opens the screen.
const props = defineProps<{ app: AppConfig; size: WidgetSize; mode: WidgetMode }>()
const emit = defineEmits<{ open: [] }>()

const status = statusOf(props.app) ?? computed(() => null)
</script>

<template>
  <Widget :active="status?.active" :color="app.colors[0]" @tap="emit('open')">
    <WidgetIcon :icon="app.icon" />
    <WidgetLabel :name="app.name" :detail="status?.text" />
  </Widget>
</template>
