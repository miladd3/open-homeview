<script setup lang="ts">
import { House, Pause, Play, Sparkles, Wind } from '@lucide/vue'
import { computed } from 'vue'

import IconButton from '@/components/atoms/IconButton.vue'
import ProgressBar from '@/components/atoms/ProgressBar.vue'
import ModalDialog from '@/components/molecules/ModalDialog.vue'
import type { VacuumApp } from '.'
import { icons } from '@/config/icons'
import { useVacuum } from './useVacuum'

const props = defineProps<{ app: VacuumApp }>()
const emit = defineEmits<{ close: [] }>()

const { state, progress, battery, status, isCleaning, isPaused, press, command } = useVacuum(
  () => props.app,
)

const summary = computed(() =>
  battery.value === undefined ? status.value : `${status.value} · Battery ${battery.value}%`,
)
</script>

<template>
  <ModalDialog
    class="vacuum-panel"
    size="compact"
    :title="app.name"
    :status="summary"
    :icon="icons[app.icon]"
    :colors="app.colors"
    @close="emit('close')"
  >
    <div v-if="app.entities.progress" class="progress">
      <div class="labels">
        <span class="label">Progress</span>
        <span class="value">{{ progress }}%</span>
      </div>
      <ProgressBar :value="progress" />
    </div>

    <div v-if="app.entities.fullClean || app.entities.fullVacuum" class="actions">
      <button
        v-if="app.entities.fullClean"
        class="action"
        type="button"
        :disabled="isCleaning"
        @click="press(app.entities.fullClean)"
      >
        <Sparkles :size="30" />
        Full clean
      </button>
      <button
        v-if="app.entities.fullVacuum"
        class="action"
        type="button"
        :disabled="isCleaning"
        @click="press(app.entities.fullVacuum)"
      >
        <Wind :size="30" />
        Vacuum
      </button>
    </div>

    <div class="controls">
      <IconButton v-if="isCleaning" class="control" aria-label="Pause" @click="command('pause')">
        <Pause :size="30" />
      </IconButton>
      <IconButton
        v-else
        class="control"
        :aria-label="isPaused ? 'Resume' : 'Start'"
        @click="command('start')"
      >
        <Play :size="30" />
      </IconButton>
      <IconButton
        class="control"
        aria-label="Return to dock"
        :disabled="state === 'docked'"
        @click="command('return_to_base')"
      >
        <House :size="30" />
      </IconButton>
    </div>
  </ModalDialog>
</template>

<style scoped lang="scss">
.vacuum-panel {
  .progress {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  .progress > .labels {
    display: flex;
    justify-content: space-between;
    font-size: 20px;
  }

  .progress > .labels > .label {
    color: var(--color-text-secondary);
  }

  .progress > .labels > .value {
    font-weight: 600;
  }

  .actions {
    display: grid;
    grid-auto-columns: 1fr;
    grid-auto-flow: column;
    gap: var(--space-s);
  }

  .actions > .action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-l) var(--space-m);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-m);
    background: rgb(255 255 255 / 10%);
    font-size: 21px;
    font-weight: 600;
    cursor: pointer;
    transition: transform var(--duration-fast) var(--ease-spring);

    &:active {
      transform: scale(0.95);
    }

    &:disabled {
      opacity: 0.4;
      pointer-events: none;
    }
  }

  .controls {
    display: flex;
    justify-content: center;
    gap: var(--space-l);
  }

  .controls > .control {
    width: 80px;
    height: 80px;
  }
}
</style>
