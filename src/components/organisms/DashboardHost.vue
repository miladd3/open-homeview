<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'

import { useConfigStore } from '@/stores/config'
import { packWidgets } from './packWidgets'
import WidgetCell from './WidgetCell.vue'

// The Home screen: kiosk.yaml's dashboard as pages of a grid you swipe through.
// 5 columns x 3 rows on 1280x720; other screens get a column per ~220 px of
// width, and the rows always fill the height. A widget asks for cells, not pixels.
const COLUMN_PX = 220
const ROWS = 3
const GAP_PX = 16
const DOTS_PX = 36

const dashboard = useConfigStore().home.dashboard
const root = useTemplateRef('root')
const scroller = useTemplateRef('scroller')
const width = ref(1280)
const height = ref(720)
const current = ref(0)

const columns = computed(() => Math.max(1, Math.floor(width.value / COLUMN_PX)))
const pages = computed(() => packWidgets(dashboard, columns.value, ROWS))
// The height of one cell. Widget parts size their text from it (see kit/Widget.vue).
const cell = computed(() => (height.value - DOTS_PX - (ROWS - 1) * GAP_PX) / ROWS)

let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (!entry) return
    width.value = entry.contentRect.width
    height.value = entry.contentRect.height
  })
  if (root.value) observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())

function onScroll() {
  const el = scroller.value
  if (el) current.value = Math.round(el.scrollLeft / el.clientWidth)
}

function goTo(page: number) {
  scroller.value?.scrollTo({ left: page * scroller.value.clientWidth, behavior: 'smooth' })
}
</script>

<template>
  <div
    ref="root"
    class="dashboard-host"
    :style="{
      '--columns': columns,
      '--rows': ROWS,
      '--gap': `${GAP_PX}px`,
      '--cell': `${cell}px`,
      '--dots-height': `${DOTS_PX}px`,
    }"
  >
    <div ref="scroller" class="pages" @scroll.passive="onScroll">
      <section
        v-for="(page, p) in pages"
        :key="p"
        class="page"
        :aria-label="`Page ${p + 1} of ${pages.length}`"
      >
        <WidgetCell
          v-for="placed in page"
          :key="placed.item.app.id + JSON.stringify(placed.item.settings)"
          :widget="placed.item"
          :style="{
            gridColumn: `${placed.column} / span ${placed.width}`,
            gridRow: `${placed.row} / span ${placed.height}`,
          }"
        />
      </section>
    </div>
    <nav v-if="pages.length > 1" class="dots" aria-label="Pages">
      <button
        v-for="(_, p) in pages"
        :key="p"
        class="dot"
        :class="{ '-current': p === current }"
        type="button"
        :aria-label="`Page ${p + 1}`"
        :aria-current="p === current ? 'page' : undefined"
        @click="goTo(p)"
      />
    </nav>
  </div>
</template>

<style scoped lang="scss">
.dashboard-host {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;

  > .pages {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
  }

  > .pages > .page {
    display: grid;
    flex: 0 0 100%;
    grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
    grid-template-rows: repeat(var(--rows), minmax(0, 1fr));
    gap: var(--gap);
    scroll-snap-align: start;
  }

  > .dots {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    height: var(--dots-height);
  }

  > .dots > .dot {
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;

    &::after {
      display: block;
      width: 9px;
      height: 9px;
      margin: auto;
      border-radius: var(--radius-pill);
      background: var(--text-tertiary);
      content: '';
      transition: background-color var(--duration-fast) ease;
    }

    &.-current::after {
      background: var(--text-primary);
    }
  }
}
</style>
