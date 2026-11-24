<script setup lang="ts">
import { CameraFeed, Widget, WidgetLabel, type WidgetMode, type WidgetSize } from '@/kit'
import type { CameraApp } from '.'

// A snapshot that refreshes every few seconds. Tap opens the live camera.
const props = defineProps<{ app: CameraApp; size: WidgetSize; mode: WidgetMode }>()
const emit = defineEmits<{ open: [] }>()
</script>

<template>
  <Widget class="camera-widget" @tap="emit('open')">
    <CameraFeed class="feed" :entity-id="props.app.entities.camera" still />
    <WidgetLabel class="label" :name="app.name" detail="Camera" />
  </Widget>
</template>

<style scoped lang="scss">
.camera-widget {
  > .feed {
    position: absolute;
    inset: 0;
  }

  // Readable over any picture.
  > .label {
    position: relative;
    margin: auto calc(var(--u) * -9) calc(var(--u) * -9);
    padding: calc(var(--u) * 14) calc(var(--u) * 9) calc(var(--u) * 9);
    background: linear-gradient(transparent, rgb(0 0 0 / 60%));
    color: #fff;
    --widget-detail-color: rgb(255 255 255 / 75%);
  }
}
</style>
