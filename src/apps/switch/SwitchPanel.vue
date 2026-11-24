<script setup lang="ts">
import { Gauge, Power } from '@lucide/vue'
import { computed } from 'vue'

import { AppSheet, useEntities, useEntity, useService } from '@/kit'
import type { SwitchApp } from '.'

// Any on/off entity (switch, input_boolean, fan…) as one big toggle, with
// optional read-only sensors underneath.
const props = defineProps<{ app: SwitchApp }>()
const emit = defineEmits<{ close: [] }>()

const callService = useService()

const entity = useEntity(() => props.app.entities.switch)
const sensorEntities = useEntities(() => props.app.entities.sensors)
const isOn = computed(() => entity.value?.state === 'on')
const isAvailable = computed(
  () => entity.value !== undefined && entity.value.state !== 'unavailable',
)
const status = computed(() => {
  if (!isAvailable.value) return 'Unavailable'
  return isOn.value ? 'On' : 'Off'
})
const sensors = computed(() =>
  sensorEntities.value.map((sensor) => {
    const unit = sensor.attributes.unit_of_measurement
    return {
      id: sensor.entity_id,
      name: String(sensor.attributes.friendly_name ?? sensor.entity_id),
      value: `${sensor.state}${unit ? ` ${String(unit)}` : ''}`,
    }
  }),
)

// `homeassistant.toggle` works for every on/off domain.
const toggle = () =>
  callService(
    'homeassistant',
    'toggle',
    {},
    { entity_id: props.app.entities.switch },
    { state: isOn.value ? 'off' : 'on' },
  )
</script>

<template>
  <AppSheet class="switch-panel" :app="app" :status="status" @close="emit('close')">
    <div class="layout">
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
    </div>
  </AppSheet>
</template>

<style scoped lang="scss">
.switch-panel {
  .layout {
    display: flex;
    flex: 1;
    gap: var(--space-l);
  }

  .layout > .toggle {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-s);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-l);
    background: var(--fill);
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      transform var(--duration-base) var(--motion-spring),
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
      // fixed colour: on the app's colours
      color: #fff;
    }
  }

  .layout > .toggle > .label {
    font-size: 26px;
    font-weight: 600;
  }

  .layout > .sensors {
    display: flex;
    flex: 0 0 440px;
    flex-direction: column;
    gap: var(--space-xs);
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .layout > .sensors > .sensor {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    padding: var(--space-m);
    border-radius: var(--radius-m);
    background: var(--fill);
    font-size: 20px;
  }

  .layout > .sensors > .sensor > .name {
    flex: 1;
    color: var(--text-secondary);
  }

  .layout > .sensors > .sensor > .value {
    font-weight: 600;
  }
}
</style>
