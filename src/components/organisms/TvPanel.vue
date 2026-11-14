<script setup lang="ts">
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  House,
  Minus,
  Plus,
  Power,
  Undo2,
  Volume2,
  VolumeX,
} from '@lucide/vue'
import { computed } from 'vue'

import IconButton from '@/components/atoms/IconButton.vue'
import ModalDialog from '@/components/molecules/ModalDialog.vue'
import type { TvApp } from '@/config/home'
import { icons } from '@/config/icons'
import { useEntitiesStore } from '@/stores/entities'

const props = defineProps<{ app: TvApp }>()
const emit = defineEmits<{ close: [] }>()

const store = useEntitiesStore()

const tv = computed(() => store.get(props.app.entities.player))
const isOn = computed(() => tv.value?.state === 'on')
const isMuted = computed(() => Boolean(tv.value?.attributes.is_volume_muted))
const volume = computed(() => Math.round(Number(tv.value?.attributes.volume_level ?? 0) * 100))
const status = computed(() => (isOn.value ? `On · Volume ${volume.value}` : 'Off'))

const player = (service: string, data: Record<string, unknown> = {}) =>
  store.callService('media_player', service, data, { entity_id: props.app.entities.player })

// Android TV Remote key names.
const send = (command: string) =>
  store.callService(
    'remote',
    'send_command',
    { command },
    { entity_id: props.app.entities.remote! },
  )
</script>

<template>
  <ModalDialog
    class="tv-panel"
    size="compact"
    :title="app.name"
    :status="status"
    :icon="icons[app.icon]"
    :colors="app.colors"
    @close="emit('close')"
  >
    <template #actions>
      <IconButton
        :active="isOn"
        :aria-label="isOn ? 'Turn TV off' : 'Turn TV on'"
        @click="player('toggle')"
      >
        <Power :size="28" />
      </IconButton>
    </template>

    <div class="remote" :class="{ '-disabled': !isOn }">
      <div v-if="app.entities.remote" class="dpad">
        <button class="key -up" type="button" aria-label="Up" @click="send('DPAD_UP')">
          <ChevronUp :size="36" />
        </button>
        <button class="key -left" type="button" aria-label="Left" @click="send('DPAD_LEFT')">
          <ChevronLeft :size="36" />
        </button>
        <button class="key -ok" type="button" @click="send('DPAD_CENTER')">OK</button>
        <button class="key -right" type="button" aria-label="Right" @click="send('DPAD_RIGHT')">
          <ChevronRight :size="36" />
        </button>
        <button class="key -down" type="button" aria-label="Down" @click="send('DPAD_DOWN')">
          <ChevronDown :size="36" />
        </button>
      </div>

      <div class="side">
        <div class="row">
          <template v-if="app.entities.remote">
            <IconButton class="key" aria-label="Back" @click="send('BACK')">
              <Undo2 :size="28" />
            </IconButton>
            <IconButton class="key" aria-label="Home" @click="send('HOME')">
              <House :size="28" />
            </IconButton>
          </template>
          <IconButton
            class="key"
            :active="isMuted"
            :aria-label="isMuted ? 'Unmute' : 'Mute'"
            @click="player('volume_mute', { is_volume_muted: !isMuted })"
          >
            <VolumeX v-if="isMuted" :size="28" />
            <Volume2 v-else :size="28" />
          </IconButton>
        </div>

        <div class="volume">
          <IconButton class="key" aria-label="Volume down" @click="player('volume_down')">
            <Minus :size="28" />
          </IconButton>
          <span class="value">{{ volume }}</span>
          <IconButton class="key" aria-label="Volume up" @click="player('volume_up')">
            <Plus :size="28" />
          </IconButton>
        </div>
      </div>
    </div>
  </ModalDialog>
</template>

<style scoped lang="scss">
.tv-panel {
  .remote {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xl);
    transition: opacity var(--duration-base) ease;

    &.-disabled {
      opacity: 0.4;
      pointer-events: none;
    }
  }

  .remote > .dpad {
    display: grid;
    grid-template-areas:
      '. up .'
      'left ok right'
      '. down .';
    grid-template-columns: repeat(3, 96px);
    grid-template-rows: repeat(3, 96px);
    gap: var(--space-xs);
    padding: var(--space-s);
    border-radius: var(--radius-pill);
    background: rgb(255 255 255 / 8%);
  }

  .remote > .dpad > .key {
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: var(--radius-pill);
    background: transparent;
    cursor: pointer;
    transition:
      transform var(--duration-fast) var(--ease-spring),
      background-color var(--duration-fast) ease;

    &:active {
      background: rgb(255 255 255 / 15%);
      transform: scale(0.9);
    }

    &.-up {
      grid-area: up;
    }

    &.-down {
      grid-area: down;
    }

    &.-left {
      grid-area: left;
    }

    &.-right {
      grid-area: right;
    }

    &.-ok {
      grid-area: ok;
      background: rgb(255 255 255 / 14%);
      font-size: 22px;
      font-weight: 700;
    }
  }

  // Two rows of equal width: Back / Home / Mute, then the volume pill.
  .remote > .side {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-m);
  }

  .remote > .side > .row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-m);
  }

  .remote > .side > .volume {
    display: flex;
    align-items: center;
    padding: var(--space-xs);
    border-radius: var(--radius-pill);
    background: rgb(255 255 255 / 8%);
  }

  .remote > .side > .volume > .value {
    flex: 1;
    font-size: 26px;
    font-weight: 600;
    text-align: center;
  }

  .remote > .side .key {
    width: 72px;
    height: 72px;
  }
}
</style>
