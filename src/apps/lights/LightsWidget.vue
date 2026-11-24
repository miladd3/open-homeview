<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
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

// With a `group` (a room): tap toggles its lights, the corner arrow opens the
// Lights app at that group. Without: how many lights are on; tap opens the app.
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

function tap() {
  if (group.value) void toggle()
  else emit('open')
}
</script>

<template>
  <Widget
    class="lights-widget"
    :active="isOn"
    :color="rgb ? `rgb(${rgb.join(' ')})` : undefined"
    @tap="tap"
  >
    <WidgetIcon :icon="group?.icon ?? app.icon" />
    <button
      v-if="group"
      class="open"
      type="button"
      :aria-label="`Open ${group.name} in ${app.name}`"
      @click.stop="emit('open', { focus: group.id })"
    >
      <ArrowUpRight class="glyph" />
    </button>
    <WidgetLabel :name="group?.name ?? app.name" :detail="detail" />
  </Widget>
</template>

<style scoped lang="scss">
.lights-widget > .open {
  position: absolute;
  top: 0;
  right: 0;
  display: grid;
  place-items: center;
  width: max(var(--touch-min), calc(var(--u) * 38));
  height: max(var(--touch-min), calc(var(--u) * 38));
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;

  > .glyph {
    width: calc(var(--u) * 16);
    height: calc(var(--u) * 16);
  }
}
</style>
