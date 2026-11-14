<script setup lang="ts">
import type { Component } from 'vue'

import type { AppConfig } from '@/config/home'
import LightsPanel from './LightsPanel.vue'
import SwitchPanel from './SwitchPanel.vue'
import TvPanel from './TvPanel.vue'
import VacuumPanel from './VacuumPanel.vue'

// Opens the panel for an app's `type`. The doorbell type opens the full-screen
// camera instead, so it never gets here.
defineProps<{ app: Exclude<AppConfig, { type: 'doorbell' }> }>()
const emit = defineEmits<{ close: [] }>()

const panels: Record<Exclude<AppConfig['type'], 'doorbell'>, Component> = {
  vacuum: VacuumPanel,
  tv: TvPanel,
  switch: SwitchPanel,
  lights: LightsPanel,
}
</script>

<template>
  <component :is="panels[app.type]" :app="app" @close="emit('close')" />
</template>
