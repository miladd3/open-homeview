<script setup lang="ts">
import { AppSheet } from '@/kit'

// Explains what to fix in kiosk.yaml: still on the example, or entity IDs that
// Home Assistant doesn't know.
defineProps<{ isExample: boolean; missing: string[] }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <AppSheet
    class="config-help-dialog"
    :app="{ name: 'kiosk.yaml', icon: 'file-cog' }"
    :status="isExample ? 'Showing the example' : `${missing.length} not found`"
    @close="emit('close')"
  >
    <section v-if="isExample" class="section">
      <h3 class="heading">This is the example config</h3>
      <p class="text">
        Put your own <code>kiosk.yaml</code> in the <code>/config</code> folder of the container.
        Start from <code>kiosk.example.yaml</code>. The screen reloads by itself within a minute.
      </p>
    </section>

    <section v-if="missing.length" class="section">
      <h3 class="heading">Not found in Home Assistant</h3>
      <p class="text">Check these entity IDs in kiosk.yaml for typos:</p>
      <ul class="ids">
        <li v-for="id in missing" :key="id" class="id">{{ id }}</li>
      </ul>
    </section>
  </AppSheet>
</template>

<style scoped lang="scss">
.config-help-dialog {
  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  .section > .heading {
    font-size: 22px;
    font-weight: 600;
  }

  .section > .text {
    color: var(--color-text-secondary);
    font-size: 19px;
    line-height: 1.4;
  }

  .section > .ids {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .section > .ids > .id {
    padding: var(--space-s) var(--space-m);
    border-radius: var(--radius-m);
    background: rgb(255 255 255 / 8%);
    font-family: ui-monospace, monospace;
    font-size: 18px;
  }

  code {
    font-family: ui-monospace, monospace;
    color: var(--color-text);
  }
}
</style>
