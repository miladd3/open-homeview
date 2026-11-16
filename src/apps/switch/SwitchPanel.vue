<script setup lang="ts">
import { Gauge, Power } from '@lucide/vue'
import { computed } from 'vue'

import ModalDialog from '@/components/molecules/ModalDialog.vue'
import type { SwitchApp } from '.'
import { icons } from '@/config/icons'
import { useEntitiesStore } from '@/stores/entities'

// Any on/off entity (switch, input_boolean, fan…) as one big toggle, with
// optional read-only sensors underneath.
const props = defineProps<{ app: SwitchApp }>()
const emit = defineEmits<{ close: [] }>()

const store = useEntitiesStore()

const entity = computed(() => store.get(props.app.entities.switch))
const isOn = computed(() => entity.value?.state === 'on')
const isAvailable = computed(
  () => entity.value !== undefined && entity.value.state !== 'unavailable',
)
const status = computed(() => {
  if (!isAvailable.value) return 'Unavailable'
  return isOn.value ? 'On' : 'Off'
})
const sensors = computed(() =>
  props.app.entities.sensors.map((id) => {
    const sensor = store.get(id)
    const unit = sensor?.attributes.unit_of_measurement
    return {
      id,
      name: String(sensor?.attributes.friendly_name ?? id),
      value: sensor ? `${sensor.state}${unit ? ` ${String(unit)}` : ''}` : '–',
    }
  }),
)

// `homeassistant.toggle` works for every on/off domain.
const toggle = () =>
  store.callService(
    'homeassistant',
    'toggle',
    {},
    { entity_id: props.app.entities.switch },
    { state: isOn.value ? 'off' : 'on' },
  )
</script>

<template>
  <ModalDialog
    class="switch-panel"
    size="compact"
    :title="app.name"
    :status="status"
    :icon="icons[app.icon]"
    :colors="app.colors"
    @close="emit('close')"
  >
    <button
      class="toggle"
      :class="{ '-on': isOn }"
      type="button"
      :aria-pressed="isOn"
      :disabled="!isAvailable"
      :style="{ '--from': app.colors[0], '--to': app.colors[1] }"
      @click="toggle"
    >
      <Power class="icon" :size="64" :stroke-width="1.6" />
      <span class="label">{{ status }}</span>
    </button>

    <ul v-if="sensors.length" class="sensors">
      <li v-for="sensor in sensors" :key="sensor.id" class="sensor">
        <Gauge :size="26" />
        <span class="name">{{ sensor.name }}</span>
        <span class="value">{{ sensor.value }}</span>
      </li>
    </ul>
  </ModalDialog>
</template>

<style scoped lang="scss">
.switch-panel {
  .toggle {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-s);
    height: 240px;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-l);
    background: rgb(255 255 255 / 8%);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition:
      transform var(--duration-base) var(--ease-spring),
      background-color var(--duration-base) ease,
      color var(--duration-base) ease;

    &:active {
      transform: scale(0.97);
    }

    &:disabled {
      opacity: 0.4;
      pointer-events: none;
    }

    &.-on {
      background: linear-gradient(160deg, var(--from), var(--to));
      color: #fff;
    }
  }

  .toggle > .label {
    font-size: 26px;
    font-weight: 600;
  }

  .sensors {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .sensors > .sensor {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    padding: var(--space-m);
    border-radius: var(--radius-m);
    background: rgb(255 255 255 / 8%);
    font-size: 20px;
  }

  .sensors > .sensor > .name {
    flex: 1;
    color: var(--color-text-secondary);
  }

  .sensors > .sensor > .value {
    font-weight: 600;
  }
}
</style>
