<script setup lang="ts">
import { X } from '@lucide/vue'
import { onBeforeUnmount, onMounted } from 'vue'

import IconButton from '@/components/atoms/IconButton.vue'
import type { Gradient } from '@/config/fields'
import { type IconName, icons } from '@/config/icons'

// The frame of every app screen: full screen, ✕ on the left, then the app's
// icon, name and live status, optional `#actions` on the right, and a body the
// app fills. Closes on ✕ and Esc. Without `colors` the icon is glass.
defineProps<{
  app: { name: string; icon: IconName; colors?: Gradient }
  status?: string
}>()
const emit = defineEmits<{ close: [] }>()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <section
    class="kit-sheet"
    role="dialog"
    aria-modal="true"
    :aria-label="app.name"
    :style="app.colors && { '--icon-from': app.colors[0], '--icon-to': app.colors[1] }"
  >
    <header class="header">
      <IconButton class="close" aria-label="Close" @click="emit('close')">
        <X :size="30" />
      </IconButton>
      <span class="icon" :class="{ '-colored': app.colors }">
        <component :is="icons[app.icon]" :size="30" :stroke-width="1.8" />
      </span>
      <div class="titles">
        <h2 class="title">{{ app.name }}</h2>
        <p v-if="status" class="status">{{ status }}</p>
      </div>
      <div class="actions"><slot name="actions" /></div>
    </header>
    <div class="body">
      <slot />
    </div>
  </section>
</template>

<style scoped lang="scss">
.kit-sheet {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: var(--space-l);
  padding: var(--space-l) var(--space-xl);
  background: var(--sheet-bg);
  backdrop-filter: var(--sheet-filter);
  -webkit-backdrop-filter: var(--sheet-filter);

  > .header {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--space-m);
  }

  > .header > .icon {
    display: inline-grid;
    flex: none;
    place-items: center;
    width: 60px;
    height: 60px;
    border-radius: 16px;
    background: var(--fill-strong);

    &.-colored {
      background: linear-gradient(160deg, var(--icon-from), var(--icon-to));
      // fixed colour: on the app's colours
      color: #fff;
    }
  }

  > .header > .titles {
    flex: 1;
    min-width: 0;
  }

  > .header > .titles > .title {
    font-size: 34px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  > .header > .titles > .status {
    color: var(--text-secondary);
    font-size: 20px;
  }

  > .header > .actions {
    display: flex;
    align-items: center;
    gap: var(--space-s);
  }

  > .body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-m);
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
  }
}

// <Transition name="sheet">: zooms in from slightly smaller and fades.
.sheet-enter-active,
.sheet-leave-active {
  transition:
    opacity var(--duration-base) ease,
    transform var(--duration-base) var(--motion-spring);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
  transform: scale(0.94);
}

// Fading out: let taps through to the screen underneath.
.sheet-leave-active {
  pointer-events: none;
}
</style>
