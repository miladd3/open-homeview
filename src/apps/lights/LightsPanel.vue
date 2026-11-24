<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

import { AppSheet, useEntities, useService } from '@/kit'
import type { LightsApp, SceneConfig } from '.'
import LightCard from './LightCard.vue'
import LightRow from './LightRow.vue'
import SceneButton from './SceneButton.vue'

// Every light, one section per group (like the Hue app's rooms): the group's
// own row, its scenes, then its lights as a row of cards. Tapping a card's
// name shows that light's options under the row. `focus` scrolls to one group and
// highlights it for a moment (a room tile opens it that way).
const props = defineProps<{ app: LightsApp; focus?: string }>()
const emit = defineEmits<{ close: [] }>()

const callService = useService()
const allLights = useEntities(() => [
  ...new Set(props.app.groups.flatMap((group) => group.lightEntityIds)),
])
const status = computed(() => {
  const on = allLights.value.filter((light) => light.state === 'on').length
  return on ? `${on} of ${allLights.value.length} on` : 'All off'
})
const scenes = useEntities(() =>
  props.app.groups.flatMap((group) => group.scenes.map((scene) => scene.entityId)),
)
const sceneName = (scene: SceneConfig) =>
  scene.name ??
  String(
    scenes.value.find((entity) => entity.entity_id === scene.entityId)?.attributes.friendly_name ??
      scene.entityId,
  )

// The light whose options show under its group's cards, as `group/light`.
const selected = ref<string>()
const select = (key: string) => (selected.value = selected.value === key ? undefined : key)

const sections = useTemplateRef<HTMLElement[]>('sections')
const highlighted = ref<string>()
let highlightTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  if (!props.focus) return
  const section = sections.value?.find((el) => el.dataset.group === props.focus)
  section?.scrollIntoView({ block: 'start' })
  highlighted.value = props.focus
  highlightTimer = setTimeout(() => (highlighted.value = undefined), 2000)
})
onBeforeUnmount(() => clearTimeout(highlightTimer))
</script>

<template>
  <AppSheet class="lights-panel" :app="app" :status="status" @close="emit('close')">
    <section
      v-for="group in app.groups"
      :key="group.id"
      ref="sections"
      class="group"
      :class="{ '-highlighted': highlighted === group.id }"
      :data-group="group.id"
    >
      <LightRow
        class="header"
        :light-entity-ids="group.lightEntityIds"
        :name="group.name"
        :icon="group.icon"
        :presets="app.colorPresets"
      />
      <div v-if="group.scenes.length" class="scenes">
        <SceneButton
          v-for="scene in group.scenes"
          :key="scene.entityId"
          :label="sceneName(scene)"
          :colors="scene.colors"
          @click="callService('scene', 'turn_on', {}, { entity_id: scene.entityId })"
        />
      </div>
      <div class="lights">
        <LightCard
          v-for="id in group.lightEntityIds"
          :key="id"
          :entity-id="id"
          :selected="selected === `${group.id}/${id}`"
          @select="select(`${group.id}/${id}`)"
        />
      </div>
      <LightRow
        v-if="selected?.startsWith(`${group.id}/`)"
        :key="selected"
        class="options"
        :light-entity-ids="[selected.slice(group.id.length + 1)]"
        :presets="app.colorPresets"
        colors-open
      />
    </section>
  </AppSheet>
</template>

<style scoped lang="scss">
.lights-panel {
  .group {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: var(--space-m);
    padding: var(--space-m);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-l);
    background: rgb(255 255 255 / 6%);
    transition:
      background-color var(--duration-slow) ease,
      border-color var(--duration-slow) ease;

    &.-highlighted {
      border-color: rgb(255 255 255 / 70%);
      background: rgb(255 255 255 / 16%);
    }
  }

  .group > .header :deep(.name) {
    font-size: 26px;
    font-weight: 700;
  }

  .group > .scenes,
  .group > .lights {
    display: flex;
    gap: var(--space-s);
    overflow-x: auto;
    scrollbar-width: none;

    > .scene-button {
      flex: none;
    }
  }

  .group > .options {
    padding: var(--space-m);
    border-radius: var(--radius-m);
    background: rgb(255 255 255 / 8%);
  }
}
</style>
