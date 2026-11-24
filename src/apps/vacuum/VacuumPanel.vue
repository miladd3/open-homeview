<script setup lang="ts">
import { House, Pause, Play, Sparkles, Wind } from '@lucide/vue'

import { AppSheet, IconButton, ProgressBar } from '@/kit'
import type { VacuumApp } from '.'
import { useVacuum } from './useVacuum'

const props = defineProps<{ app: VacuumApp }>()
const emit = defineEmits<{ close: [] }>()

const { state, progress, battery, status, isCleaning, isPaused, press, command } = useVacuum(
  () => props.app,
)
</script>

<template>
  <AppSheet class="vacuum-panel" :app="app" :status="status" @close="emit('close')">
    <template #actions>
      <IconButton
        aria-label="Return to dock"
        :disabled="state === 'docked'"
        @click="command('return_to_base')"
      >
        <House :size="28" />
      </IconButton>
      <IconButton v-if="isCleaning" aria-label="Pause" @click="command('pause')">
        <Pause :size="28" />
      </IconButton>
      <IconButton v-else :aria-label="isPaused ? 'Resume' : 'Start'" @click="command('start')">
        <Play :size="28" />
      </IconButton>
    </template>

    <div class="panes">
      <section class="pane -state">
        <span class="label">{{ app.entities.progress ? 'Progress' : 'Status' }}</span>
        <span class="value">{{ app.entities.progress ? `${progress}%` : status }}</span>
        <ProgressBar v-if="app.entities.progress" :value="progress" />
        <span v-if="battery !== undefined" class="label">Battery {{ battery }}%</span>
      </section>

      <section v-if="app.entities.fullClean || app.entities.fullVacuum" class="pane -actions">
        <button
          v-if="app.entities.fullClean"
          class="action -primary"
          type="button"
          :disabled="isCleaning"
          :style="{ '--from': app.colors[0], '--to': app.colors[1] }"
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
          Vacuum only
        </button>
      </section>
    </div>
  </AppSheet>
</template>

<style scoped lang="scss">
.vacuum-panel {
  .panes {
    display: grid;
    flex: 1;
    grid-template-columns: 1.3fr 1fr;
    gap: var(--space-m);
  }

  .panes > .pane {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-m);
    padding: var(--space-l);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-l);
    background: rgb(255 255 255 / 6%);
  }

  .panes > .pane > .label {
    color: var(--color-text-secondary);
    font-size: 22px;
  }

  .panes > .pane > .value {
    font-size: 72px;
    font-weight: 600;
    line-height: 1;
  }

  .panes > .pane > .action {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: var(--space-s);
    border: 0;
    border-radius: var(--radius-m);
    background: rgb(255 255 255 / 12%);
    font-size: 24px;
    font-weight: 600;
    cursor: pointer;
    transition: transform var(--duration-fast) var(--ease-spring);

    &.-primary {
      background: linear-gradient(160deg, var(--from), var(--to));
      color: #fff;
    }

    &:active {
      transform: scale(0.97);
    }

    &:disabled {
      opacity: 0.4;
      pointer-events: none;
    }
  }
}
</style>
