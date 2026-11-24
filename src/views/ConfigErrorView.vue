<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'

import { Surface } from '@/kit'

// Shown instead of the app when kiosk.yaml can't be loaded or is invalid.
defineProps<{ message: string; retrySeconds: number }>()
</script>

<template>
  <main class="config-error-view">
    <Surface class="panel">
      <TriangleAlert class="icon" :size="56" />
      <h1 class="title">Can't load kiosk.yaml</h1>
      <p class="message">{{ message }}</p>
      <p class="hint">Fix kiosk.yaml. Retrying in {{ retrySeconds }}s.</p>
    </Surface>
  </main>
</template>

<style scoped lang="scss">
.config-error-view {
  display: grid;
  place-items: center;
  height: 100%;
  padding: var(--space-xl);

  > .panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-s);
    max-width: 900px;
    padding: var(--space-xl);
    text-align: center;
  }

  > .panel > .icon {
    color: var(--on-color);
  }

  > .panel > .title {
    font-size: 34px;
    font-weight: 700;
  }

  > .panel > .message {
    font-family: ui-monospace, monospace;
    font-size: 20px;
  }

  > .panel > .hint {
    color: var(--text-secondary);
    font-size: 18px;
  }
}
</style>
