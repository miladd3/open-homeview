<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import ToggleSwitch from '@/components/atoms/ToggleSwitch.vue'
import ModalDialog from '@/components/molecules/ModalDialog.vue'
import type { LightsApp } from '@/config/home'
import { icons } from '@/config/icons'
import { useRoomLight } from '@/composables/useRoomLight'
import { useEntitiesStore } from '@/stores/entities'
import LightControls from './LightControls.vue'
import LightTile from './LightTile.vue'

// Every light on its own, sorted into the groups from kiosk.yaml. Groups are
// listed on the left; tap a light's bulb to toggle it, or the tile for its
// brightness and color.
const props = defineProps<{ app: LightsApp }>()
const emit = defineEmits<{ close: [] }>()

const store = useEntitiesStore()

const groupIndex = ref(0)
const selectedLight = ref<string | null>(null)
const group = computed(() => props.app.groups[groupIndex.value] ?? props.app.groups[0]!)
const groupLight = useRoomLight(group)

watch(groupIndex, () => (selectedLight.value = null))

const isOn = (id: string) => store.get(id)?.state === 'on'
const onCount = (ids: string[]) => ids.filter(isOn).length

const allIds = computed(() => [...new Set(props.app.groups.flatMap((g) => g.lightEntityIds))])
const status = computed(() => {
  const on = onCount(allIds.value)
  return on ? `${on} of ${allIds.value.length} on` : 'All off'
})
const groupStatus = (ids: string[]) => {
  const on = onCount(ids)
  return on ? `${on} on` : 'Off'
}
</script>

<template>
  <ModalDialog
    class="lights-panel"
    :title="app.name"
    :status="status"
    :icon="icons[app.icon]"
    :colors="app.colors"
    @close="emit('close')"
  >
    <div class="layout">
      <nav class="groups" aria-label="Light groups">
        <button
          v-for="(item, i) in app.groups"
          :key="`${i}-${item.name}`"
          class="group"
          :class="{ '-selected': i === groupIndex, '-on': onCount(item.lightEntityIds) > 0 }"
          type="button"
          :aria-current="i === groupIndex"
          @click="groupIndex = i"
        >
          <component :is="icons[item.icon]" class="icon" :size="26" :stroke-width="1.8" />
          <span class="texts">
            <span class="name">{{ item.name }}</span>
            <span class="status">{{ groupStatus(item.lightEntityIds) }}</span>
          </span>
        </button>
      </nav>

      <LightControls
        v-if="selectedLight"
        class="content"
        :entity-id="selectedLight"
        @back="selectedLight = null"
      />
      <section v-else class="content">
        <header class="header">
          <h3 class="name">{{ group.name }}</h3>
          <span class="label">All</span>
          <ToggleSwitch
            :model-value="groupLight.isOn.value"
            :disabled="!groupLight.isAvailable.value"
            :aria-label="
              groupLight.isOn.value ? `Turn all ${group.name} off` : `Turn all ${group.name} on`
            "
            @update:model-value="groupLight.toggle"
          />
        </header>
        <div class="lights">
          <LightTile
            v-for="id in group.lightEntityIds"
            :key="id"
            :entity-id="id"
            @open="selectedLight = $event"
          />
        </div>
      </section>
    </div>
  </ModalDialog>
</template>

<style scoped lang="scss">
.lights-panel {
  .layout {
    display: flex;
    gap: var(--space-l);
    height: 460px;
  }

  .layout > .groups {
    display: flex;
    flex: 0 0 250px;
    flex-direction: column;
    gap: var(--space-xs);
    overflow-y: auto;
    scrollbar-width: none;
  }

  .layout > .groups > .group {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--space-s);
    min-height: var(--touch-min);
    padding: var(--space-s) var(--space-m);
    border: 0;
    border-radius: var(--radius-m);
    background: none;
    color: var(--color-text);
    text-align: left;
    cursor: pointer;
    transition: background-color var(--duration-base) ease;

    &.-selected {
      background: rgb(255 255 255 / 14%);
    }

    &.-on > .icon {
      color: var(--color-on);
    }
  }

  .layout > .groups > .group > .icon {
    flex: none;
    color: var(--color-text-secondary);
  }

  .layout > .groups > .group > .texts {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .layout > .groups > .group > .texts > .name {
    overflow: hidden;
    font-size: 20px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .layout > .groups > .group > .texts > .status {
    color: var(--color-text-secondary);
    font-size: 16px;
  }

  .layout > .content {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-m);
    min-width: 0;
  }

  .layout > .content > .header {
    display: flex;
    align-items: center;
    gap: var(--space-s);
  }

  .layout > .content > .header > .name {
    flex: 1;
    font-size: 26px;
    font-weight: 700;
  }

  .layout > .content > .header > .label {
    color: var(--color-text-secondary);
    font-size: 18px;
  }

  .layout > .content > .lights {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    align-content: start;
    gap: var(--space-s);
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
  }
}
</style>
