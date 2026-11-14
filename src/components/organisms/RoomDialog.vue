<script setup lang="ts">
import { Lightbulb, Sun } from '@lucide/vue'
import { computed } from 'vue'

import RangeSlider from '@/components/atoms/RangeSlider.vue'
import ToggleSwitch from '@/components/atoms/ToggleSwitch.vue'
import ColorPresets from '@/components/molecules/ColorPresets.vue'
import ModalDialog from '@/components/molecules/ModalDialog.vue'
import SceneButton from '@/components/molecules/SceneButton.vue'
import type { ColorPreset, RoomConfig, SceneConfig } from '@/config/home'
import { icons } from '@/config/icons'
import { useRoomLight } from '@/composables/useRoomLight'
import type { HassEntity } from '@/ha/types'
import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'

const props = defineProps<{ room: RoomConfig }>()
const emit = defineEmits<{ close: [] }>()

const config = useConfigStore()
const store = useEntitiesStore()
const {
  lights,
  isOn,
  isAvailable,
  brightness,
  rgb,
  features,
  toggle,
  toggleLight,
  setBrightness,
  setRgb,
  setKelvin,
  activateScene,
} = useRoomLight(() => props.room)

const status = computed(() => {
  if (!isAvailable.value) return 'Unavailable'
  if (!isOn.value) return 'Off'
  return brightness.value ? `${brightness.value}% brightness` : 'On'
})
// Only offer the swatches the room's lights can show.
const presets = computed(() =>
  config.home.colors.filter((preset) =>
    'kelvin' in preset ? features.value.temperature : features.value.color,
  ),
)
const fill = computed(() => (rgb.value ? `rgb(${rgb.value.join(' ')})` : undefined))

function selectColor(preset: ColorPreset) {
  return 'kelvin' in preset ? setKelvin(preset.kelvin) : setRgb(preset.rgb)
}

const sceneName = (scene: SceneConfig) =>
  scene.name ?? String(store.get(scene.entityId)?.attributes.friendly_name ?? scene.entityId)
const lightName = (light: HassEntity) => String(light.attributes.friendly_name ?? light.entity_id)
</script>

<template>
  <ModalDialog
    class="room-dialog"
    :title="room.name"
    :status="status"
    :icon="icons[room.icon]"
    @close="emit('close')"
  >
    <template #actions>
      <ToggleSwitch
        :model-value="isOn"
        :disabled="!isAvailable"
        :aria-label="isOn ? 'Turn lights off' : 'Turn lights on'"
        @update:model-value="toggle"
      />
    </template>

    <div class="controls">
      <RangeSlider
        v-if="features.dimmable"
        class="brightness"
        :class="{ '-on': isOn }"
        label="Brightness"
        :model-value="brightness"
        :style="{ '--slider-fill': fill }"
        @update:model-value="setBrightness"
      >
        <Sun :size="40" />
      </RangeSlider>

      <div class="options">
        <section v-if="presets.length" class="group">
          <h3 class="heading">Colors</h3>
          <ColorPresets :presets="presets" @select="selectColor" />
        </section>

        <section v-if="room.scenes.length" class="group">
          <h3 class="heading">Scenes</h3>
          <div class="scenes">
            <SceneButton
              v-for="scene in room.scenes"
              :key="scene.entityId"
              :label="sceneName(scene)"
              :colors="scene.colors"
              @click="activateScene(scene.entityId)"
            />
          </div>
        </section>

        <section v-if="lights.length > 1" class="group">
          <h3 class="heading">Lights</h3>
          <ul class="lights">
            <li v-for="light in lights" :key="light.entity_id" class="light">
              <Lightbulb class="icon" :size="26" />
              <span class="name">{{ lightName(light) }}</span>
              <ToggleSwitch
                :model-value="light.state === 'on'"
                :disabled="light.state === 'unavailable'"
                :aria-label="`Toggle ${lightName(light)}`"
                @update:model-value="toggleLight(light.entity_id)"
              />
            </li>
          </ul>
        </section>
      </div>
    </div>
  </ModalDialog>
</template>

<style scoped lang="scss">
.room-dialog {
  .controls {
    display: flex;
    gap: var(--space-xl);
    min-height: 0;
  }

  .controls > .brightness {
    flex: 0 0 180px;
    height: 420px;
    border-radius: 44px;

    &.-on {
      --slider-icon-color: #1c1c1e;
    }
  }

  .controls > .options {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-l);
    min-width: 0;
  }

  .controls > .options > .group {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  .controls > .options > .group > .heading {
    color: var(--color-text-secondary);
    font-size: 17px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .controls > .options > .group > .scenes {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--space-s);
  }

  .controls > .options > .group > .lights {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .controls > .options > .group > .lights > .light {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    padding: var(--space-xs) var(--space-xs) var(--space-xs) var(--space-m);
    border-radius: var(--radius-m);
    background: rgb(255 255 255 / 8%);
    font-size: 20px;
  }

  .controls > .options > .group > .lights > .light > .name {
    flex: 1;
  }
}
</style>
