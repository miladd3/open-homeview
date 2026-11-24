<script setup lang="ts">
import { computed } from 'vue'

import {
  useLightGroup,
  Widget,
  WidgetIcon,
  WidgetLabel,
  type WidgetMode,
  type WidgetSize,
} from '@/kit'
import type { LightsApp } from '.'

// With a `group` (a room): the icon toggles its lights, a tap anywhere else opens
// the Lights app at that group. Without: how many lights are on; tap opens the app.
const props = defineProps<{
  app: LightsApp
  size: WidgetSize
  mode: WidgetMode
  settings?: { group?: string }
}>()
const emit = defineEmits<{ open: [options?: { focus?: string }] }>()

const group = computed(() => props.app.groups.find((g) => g.id === props.settings?.group))
const { lights, isOn, isAvailable, brightness, rgb, toggle } = useLightGroup(() =>
  group.value
    ? group.value.lightEntityIds
    : [...new Set(props.app.groups.flatMap((g) => g.lightEntityIds))],
)

const onCount = computed(() => lights.value.filter((light) => light.state === 'on').length)
const detail = computed(() => {
  if (!isAvailable.value) return 'Unavailable'
  if (!group.value) return onCount.value ? `${onCount.value} on` : 'All off'
  if (!isOn.value) return 'Off'
  const count = props.size === '1x1' ? '' : ` · ${onCount.value} of ${lights.value.length}`
  return brightness.value ? `${brightness.value}%${count}` : 'On'
})
</script>

<template>
  <Widget
    class="lights-widget"
    :active="isOn"
    :color="rgb ? `rgb(${rgb.join(' ')})` : undefined"
    @tap="emit('open', group && { focus: group.id })"
  >
    <button
      v-if="group"
      class="toggle"
      type="button"
      :aria-label="`Turn ${group.name} ${isOn ? 'off' : 'on'}`"
      @click.stop="toggle()"
    >
      <WidgetIcon :icon="group.icon" />
    </button>
    <WidgetIcon v-else :icon="app.icon" />
    <WidgetLabel :name="group?.name ?? app.name" :detail="detail" />
  </Widget>
</template>

<style scoped lang="scss">
.lights-widget > .toggle {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  line-height: 0;
  cursor: pointer;
}
</style>
