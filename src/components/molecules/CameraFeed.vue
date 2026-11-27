<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

import { isDemo } from '@/demo'
import { useEntitiesStore } from '@/stores/entities'

// Live camera view. Full-quality WebRTC video when HA supports it, with HA's MJPEG
// stream shown meanwhile and kept as the fallback (it's only ~2 fps snapshots).
// The kiosk's auth proxy adds the token, so a plain <img> works for MJPEG.
// `still` shows a snapshot every few seconds instead (a dashboard widget), which
// costs the Pi almost nothing. Against the mock it shows a placeholder scene.
const STILL_REFRESH_MS = 10_000

const props = defineProps<{ entityId: string; still?: boolean }>()

const store = useEntitiesStore()
const isMock = store.mock() !== null
const stillAt = ref(Date.now())
const src = computed(() =>
  props.still
    ? `${import.meta.env.BASE_URL}api/camera_proxy/${props.entityId}?t=${stillAt.value}`
    : `${import.meta.env.BASE_URL}api/camera_proxy_stream/${props.entityId}`,
)

const video = useTemplateRef('video')
const isLive = ref(false)
let stop: (() => void) | null = null

let stillTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  if (isMock) return
  if (props.still) {
    stillTimer = setInterval(() => (stillAt.value = Date.now()), STILL_REFRESH_MS)
    return
  }
  stop = store.watchCamera(props.entityId, {
    onStream(stream) {
      if (video.value) video.value.srcObject = stream
    },
    onError(error) {
      console.warn('[camera] WebRTC unavailable, staying on MJPEG:', error.message)
      isLive.value = false
      stop?.()
      stop = null
    },
  })
})

onBeforeUnmount(() => {
  stop?.()
  clearInterval(stillTimer)
})
</script>

<template>
  <div class="camera-feed" :class="{ '-live': isLive }" :data-entity="entityId">
    <template v-if="!isMock">
      <!-- MJPEG is dropped once video frames arrive (not just audio), so only one stream runs. -->
      <img v-if="!isLive" class="stream" :src="src" alt="" />
      <video
        v-if="!still"
        ref="video"
        class="stream -video"
        autoplay
        muted
        playsinline
        @resize="isLive = (video?.videoWidth ?? 0) > 0"
      />
    </template>
    <template v-else>
      <div class="scene" aria-hidden="true" />
      <p v-if="!still" class="caption">{{ isDemo ? 'Demo camera feed' : 'Mock camera feed' }}</p>
    </template>
  </div>
</template>

<style scoped lang="scss">
.camera-feed {
  position: relative;
  overflow: hidden;
  // fixed colour: behind the camera image
  background: #0b0d10;

  > .stream {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  > .stream.-video {
    opacity: 0;
    transition: opacity var(--duration-base) ease;
  }

  &.-live > .stream.-video {
    opacity: 1;
  }

  > .scene {
    position: absolute;
    inset: -20%;
    // fixed colour: a stand-in camera image
    background:
      radial-gradient(circle at 30% 40%, rgb(120 140 170 / 35%), transparent 40%),
      radial-gradient(circle at 70% 70%, rgb(200 160 110 / 25%), transparent 45%),
      linear-gradient(180deg, #1a2029, #0b0d10 70%);
    filter: blur(8px);
    animation: drift 14s ease-in-out infinite alternate;
  }

  > .caption {
    position: absolute;
    inset: auto 0 var(--space-xl);
    color: var(--text-tertiary);
    font-size: 18px;
    text-align: center;
  }
}

@keyframes drift {
  to {
    transform: translate(4%, -3%) scale(1.05);
  }
}
</style>
