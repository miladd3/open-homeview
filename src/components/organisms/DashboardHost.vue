<script setup lang="ts">
import { Plus } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef } from 'vue'

import { widgetSizes } from '@/apps'
import { useLongPress } from '@/composables/useLongPress'
import type { DashboardWidget } from '@/config/home'
import { layoutOf, resetLayout, saveLayout } from '@/config/layout'
import { useConfigStore } from '@/stores/config'
import EditGallery from './EditGallery.vue'
import { packWidgets } from './packWidgets'
import PinPad from './PinPad.vue'
import WidgetCell from './WidgetCell.vue'

// The Home screen: kiosk.yaml's dashboard as pages of a grid you swipe through.
// 5 columns x 3 rows on 1280x720; other screens get a column per ~220 px of
// width, and the rows always fill the height. A widget asks for cells, not pixels.
//
// Long-press (the background, or a widget without a quick control) enters edit
// mode, after kiosk.yaml's `editPin` if it has one: drag to reorder (hold at the
// screen's edge to move to the next page), tap the size to cycle it, – removes,
// ＋ adds from the gallery, Done saves layout.yaml.
const COLUMN_PX = 220
const ROWS = 3
const GAP_PX = 16
const DOTS_PX = 36
const BAR_PX = 64
// Room around the page in edit mode, for the – buttons on the corners.
const EDIT_INSET_PX = 14
const DRAG_START_PX = 8
const EDGE_PX = 48
const FLIP_MS = 700

const config = useConfigStore()
const root = useTemplateRef('root')
const scroller = useTemplateRef('scroller')
const width = ref(1280)
const height = ref(720)
const current = ref(0)

const editing = ref(false)
/** The dashboard being edited. Its pages are the pages you see. */
const draft = shallowRef<DashboardWidget[][]>([])
let unchanged = ''
let pin: string | undefined
const askPin = ref(false)
const showGallery = ref(false)
const problem = ref<string>()

const columns = computed(() => Math.max(1, Math.floor(width.value / COLUMN_PX)))
const pages = computed(() =>
  packWidgets(editing.value ? draft.value : config.home.dashboard, columns.value, ROWS),
)
// The height of one cell. Widget parts size their text from it (see kit/Widget.vue).
const cell = computed(() => {
  const edit = editing.value ? BAR_PX + 2 * EDIT_INSET_PX : 0
  return (height.value - DOTS_PX - edit - (ROWS - 1) * GAP_PX) / ROWS
})

let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (!entry) return
    width.value = entry.contentRect.width
    height.value = entry.contentRect.height
  })
  if (root.value) observer.observe(root.value)
})

function onScroll() {
  const el = scroller.value
  if (el) current.value = Math.round(el.scrollLeft / el.clientWidth)
}

function goTo(page: number) {
  scroller.value?.scrollTo({ left: page * scroller.value.clientWidth, behavior: 'smooth' })
}

// v-for keys that follow a widget while it moves.
const keys = new WeakMap<DashboardWidget, number>()
let lastKey = 0
const keyOf = (widget: DashboardWidget) =>
  keys.get(widget) ?? (keys.set(widget, ++lastKey), lastKey)

// ---- edit mode ----

/** Sets the draft so its pages are the ones you see: a full page flows on to a new one. */
function setDraft(next: DashboardWidget[][]) {
  draft.value = packWidgets(
    next.filter((page) => page.length),
    columns.value,
    ROWS,
  ).map((page) => page.map((placed) => placed.item))
}

const pageOf = (widget: DashboardWidget) => draft.value.findIndex((page) => page.includes(widget))
const copy = () => draft.value.map((page) => [...page])

function startEditing() {
  if (editing.value) return
  if (config.pinSet && pin === undefined) return void (askPin.value = true)
  setDraft(config.home.dashboard.map((page) => page.map((widget) => ({ ...widget }))))
  unchanged = JSON.stringify(layoutOf(draft.value))
  problem.value = undefined
  editing.value = true
}

function unlock(value: string) {
  pin = value
  askPin.value = false
  startEditing()
}

function stopEditing() {
  editing.value = false
  pin = undefined
}

const background = useLongPress(
  startEditing,
  (event) => !editing.value && !(event.target as Element).closest('.slot'),
)

function cycleSize(widget: DashboardWidget) {
  const sizes = widgetSizes(widget.app)
  const resized = { ...widget, size: sizes[(sizes.indexOf(widget.size) + 1) % sizes.length]! }
  keys.set(resized, keyOf(widget))
  setDraft(draft.value.map((page) => page.map((item) => (item === widget ? resized : item))))
}

function remove(widget: DashboardWidget) {
  setDraft(draft.value.map((page) => page.filter((item) => item !== widget)))
}

function add(widget: DashboardWidget) {
  const added = { ...widget }
  const next = copy()
  ;(next[current.value] ??= []).push(added)
  setDraft(next)
  showGallery.value = false
  if (pageOf(added) !== current.value) goTo(pageOf(added))
}

async function save(request: () => Promise<void>) {
  problem.value = undefined
  try {
    await request()
    await config.load()
    stopEditing()
  } catch (error) {
    problem.value = `Not saved: ${(error as Error).message}`
  }
}

function done() {
  const layout = layoutOf(draft.value)
  if (JSON.stringify(layout) === unchanged) return stopEditing()
  void save(() => saveLayout(layout, pin))
}

// ---- dragging ----

const drag = shallowRef<{ widget: DashboardWidget; x: number; y: number }>()
let press:
  | { widget: DashboardWidget; x: number; y: number; dx: number; dy: number; w: number; h: number }
  | undefined
let flipTimer: ReturnType<typeof setTimeout> | undefined
let flipBy = 0

function onSlotDown(event: PointerEvent, widget: DashboardWidget) {
  if (!editing.value || (event.target as Element).closest('button')) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  press = {
    widget,
    x: event.clientX,
    y: event.clientY,
    dx: event.clientX - rect.left,
    dy: event.clientY - rect.top,
    w: rect.width,
    h: rect.height,
  }
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', endDrag)
  window.addEventListener('pointercancel', endDrag)
}

/** Moves the dragged widget to where `target` is. */
function moveTo(widget: DashboardWidget, target: DashboardWidget) {
  if (widget === target) return
  const next = copy()
  const [page, index] = [pageOf(target), draft.value[pageOf(target)]!.indexOf(target)]
  next[pageOf(widget)]!.splice(next[pageOf(widget)]!.indexOf(widget), 1)
  next[page]!.splice(index, 0, widget)
  setDraft(next)
}

/** Moves the dragged widget to the end of the next (or previous) page. */
function flip() {
  const widget = drag.value?.widget
  const page = current.value + flipBy
  if (!widget || page < 0) return
  const next = copy()
  next[pageOf(widget)]!.splice(next[pageOf(widget)]!.indexOf(widget), 1)
  ;(next[page] ??= []).push(widget)
  setDraft(next)
  goTo(pageOf(widget))
  flipTimer = setTimeout(flip, FLIP_MS)
}

function onDragMove(event: PointerEvent) {
  if (!press) return
  if (!drag.value && Math.hypot(event.clientX - press.x, event.clientY - press.y) < DRAG_START_PX)
    return
  drag.value = { widget: press.widget, x: event.clientX - press.dx, y: event.clientY - press.dy }
  const over = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest<HTMLElement>('[data-slot]')?.dataset.slot
  const target = over && pages.value.flat().find((placed) => String(keyOf(placed.item)) === over)
  if (target) moveTo(press.widget, target.item)
  const edge = event.clientX < EDGE_PX ? -1 : event.clientX > window.innerWidth - EDGE_PX ? 1 : 0
  if (edge === flipBy) return
  clearTimeout(flipTimer)
  flipBy = edge
  if (edge) flipTimer = setTimeout(flip, FLIP_MS)
}

function endDrag() {
  press = undefined
  drag.value = undefined
  clearTimeout(flipTimer)
  flipBy = 0
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointercancel', endDrag)
}

onBeforeUnmount(() => {
  observer?.disconnect()
  endDrag()
})
</script>

<template>
  <div
    ref="root"
    class="dashboard-host"
    :class="{ '-editing': editing }"
    :style="{
      '--columns': columns,
      '--rows': ROWS,
      '--gap': `${GAP_PX}px`,
      '--cell': `${cell}px`,
      '--dots-height': `${DOTS_PX}px`,
      '--bar-height': `${BAR_PX}px`,
      '--edit-inset': `${EDIT_INSET_PX}px`,
    }"
  >
    <div v-if="editing" class="edit-bar">
      <button
        v-if="config.source.layout !== undefined"
        class="pill"
        type="button"
        @click="save(() => resetLayout(pin))"
      >
        Reset layout
      </button>
      <button class="pill" type="button" @click="showGallery = true">
        <Plus :size="22" /> Add
      </button>
      <button class="pill -done" type="button" @click="done">Done</button>
      <p v-if="problem" class="problem" role="alert">{{ problem }}</p>
    </div>
    <div
      ref="scroller"
      class="pages"
      @scroll.passive="onScroll"
      @pointerdown="background.onPointerdown"
      @pointermove="background.onPointermove"
      @pointerup="background.onPointerup"
      @pointercancel="background.onPointercancel"
      @click.capture="background.onClickCapture"
      @contextmenu.prevent
    >
      <section
        v-for="(page, p) in pages"
        :key="p"
        class="page"
        :aria-label="`Page ${p + 1} of ${pages.length}`"
      >
        <div
          v-for="placed in page"
          :key="keyOf(placed.item)"
          class="slot"
          :class="{ '-dragging': drag?.widget === placed.item }"
          :data-slot="keyOf(placed.item)"
          :style="{
            gridColumn: `${placed.column} / span ${placed.width}`,
            gridRow: `${placed.row} / span ${placed.height}`,
          }"
          @pointerdown="onSlotDown($event, placed.item)"
        >
          <WidgetCell class="cell" :widget="placed.item" @longpress="startEditing" />
          <template v-if="editing">
            <button
              class="remove"
              type="button"
              :aria-label="`Remove ${placed.item.app.name}`"
              @click="remove(placed.item)"
            >
              –
            </button>
            <button
              v-if="widgetSizes(placed.item.app).length > 1"
              class="size"
              type="button"
              :aria-label="`Size ${placed.item.size}`"
              @click="cycleSize(placed.item)"
            >
              {{ placed.item.size.replace('x', '×') }}
            </button>
          </template>
        </div>
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

    <div
      v-if="drag && press"
      class="ghost"
      :style="{
        left: `${drag.x}px`,
        top: `${drag.y}px`,
        width: `${press.w}px`,
        height: `${press.h}px`,
      }"
    >
      <WidgetCell :widget="drag.widget" />
    </div>

    <Transition name="sheet">
      <PinPad v-if="askPin" @close="askPin = false" @unlock="unlock" />
    </Transition>
    <Transition name="sheet">
      <EditGallery v-if="showGallery" @close="showGallery = false" @add="add" />
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.dashboard-host {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;

  > .edit-bar {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    gap: var(--space-s);
    height: var(--bar-height);
    padding-bottom: var(--space-s);
  }

  > .edit-bar > .pill {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    height: 48px;
    padding: 0 var(--space-m);
    border: 1px solid var(--surface-border);
    border-radius: var(--radius-pill);
    background: var(--sheet-bg);
    color: var(--text-primary);
    font: inherit;
    font-size: 19px;
    font-weight: 600;
    cursor: pointer;

    &.-done {
      border-color: transparent;
      background: var(--accent);
    }
  }

  > .edit-bar > .problem {
    margin: 0;
    color: var(--danger);
    font-size: 17px;
  }

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

  > .pages > .page > .slot {
    position: relative;
    min-width: 0;
    min-height: 0;

    > .cell {
      height: 100%;
    }
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

  &.-editing > .pages > .page {
    padding: var(--edit-inset);
  }

  // Edit mode: widgets jiggle and don't react; the slot is what you drag.
  &.-editing > .pages > .page > .slot {
    touch-action: none;
    cursor: grab;

    > .cell {
      pointer-events: none;
      animation: jiggle 0.3s ease-in-out infinite alternate;
    }

    &:nth-child(2n) > .cell {
      animation-delay: -0.15s;
    }

    &.-dragging {
      opacity: 0.3;
    }

    > .remove,
    > .size {
      position: absolute;
      z-index: 1;
      display: grid;
      place-items: center;
      border: 1px solid var(--surface-border);
      background: var(--sheet-bg);
      color: var(--text-primary);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      box-shadow: var(--widget-shadow);
    }

    > .remove {
      top: calc(var(--edit-inset) * -1);
      left: calc(var(--edit-inset) * -1);
      width: 44px;
      height: 44px;
      border-radius: var(--radius-pill);
      font-size: 26px;
      line-height: 1;
    }

    > .size {
      right: 10px;
      bottom: 10px;
      height: 36px;
      padding: 0 var(--space-s);
      border-radius: var(--radius-pill);
      font-size: 17px;
    }
  }

  > .ghost {
    position: fixed;
    z-index: 30;
    pointer-events: none;
    border-radius: var(--radius-l);
    box-shadow: var(--sheet-shadow);
    transform: scale(1.05);
  }

  > .ghost > * {
    height: 100%;
  }
}

@keyframes jiggle {
  from {
    transform: rotate(-0.6deg);
  }

  to {
    transform: rotate(0.6deg);
  }
}
</style>
