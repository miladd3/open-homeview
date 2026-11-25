<script setup lang="ts">
import type { DashboardWidget } from '@/config/home'
import { AppSheet } from '@/kit'
import { useConfigStore } from '@/stores/config'
import WidgetCell from './WidgetCell.vue'

// The editor's ＋: every widget kiosk.yaml allows (its apps, Lights groups, the
// clock and weather, and its `entities:`), shown live. A tap adds one.
const emit = defineEmits<{ close: []; add: [widget: DashboardWidget] }>()
const gallery = useConfigStore().home.gallery
</script>

<template>
  <AppSheet
    class="edit-gallery"
    :app="{ name: 'Add a widget', icon: 'plus' }"
    :status="`${gallery.length} to choose from`"
    @close="emit('close')"
  >
    <div class="grid">
      <button
        v-for="widget in gallery"
        :key="widget.app.id"
        class="choice"
        type="button"
        :aria-label="`Add ${widget.app.name}`"
        :style="{
          gridColumn: `span ${widget.size.split('x')[0]}`,
          gridRow: `span ${widget.size.split('x')[1]}`,
        }"
        @click="emit('add', widget)"
      >
        <WidgetCell class="preview" :widget="widget" />
      </button>
    </div>
  </AppSheet>
</template>

<style scoped lang="scss">
.edit-gallery .grid {
  --cell: 150px;

  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  grid-auto-rows: var(--cell);
  grid-auto-flow: dense;
  gap: var(--space-m);
  padding-bottom: var(--space-l);

  > .choice {
    min-width: 0;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    transition: transform var(--duration-fast) var(--motion-spring);

    &:active {
      transform: scale(0.95);
    }
  }

  // A preview, not the real thing: taps go to the button.
  > .choice > .preview {
    height: 100%;
    pointer-events: none;
  }
}
</style>
