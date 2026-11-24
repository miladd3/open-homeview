<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

import {
  useService,
  Widget,
  WidgetIcon,
  WidgetLabel,
  type WidgetMode,
  type WidgetSize,
} from '@/kit'
import type { SceneApp } from '.'

// A scene has no on/off state, so the widget lights up for a moment when tapped.
const FLASH_MS = 1500

const props = defineProps<{ app: SceneApp; size: WidgetSize; mode: WidgetMode }>()

const callService = useService()
const ran = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

function run() {
  void callService('scene', 'turn_on', {}, { entity_id: props.app.entities.entity })
  ran.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (ran.value = false), FLASH_MS)
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <Widget :active="ran" :color="app.colors[0]" @tap="run">
    <WidgetIcon :icon="app.icon" />
    <WidgetLabel :name="app.name" detail="Scene" />
  </Widget>
</template>
