<script setup lang="ts">
import { type LucideIcon, X } from '@lucide/vue'
import { onBeforeUnmount, onMounted } from 'vue'

import IconButton from '@/components/atoms/IconButton.vue'
import type { Gradient } from '@/config/home'

// Centered card over a blurred backdrop, like an Apple Home accessory detail.
// `colors` paints the header icon like an app icon; without it the icon is glass.
// Title and status have slot fallbacks; `#actions` sits next to the close button.
withDefaults(
  defineProps<{
    title: string
    status?: string
    icon?: LucideIcon
    colors?: Gradient
    size?: 'default' | 'compact'
  }>(),
  { size: 'default' },
)
const emit = defineEmits<{ close: [] }>()

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
    class="modal-dialog"
    :class="`-${size}`"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
    :style="colors && { '--icon-from': colors[0], '--icon-to': colors[1] }"
  >
    <div class="backdrop" @click="emit('close')" />
    <section class="card">
      <header class="header">
        <span v-if="icon" class="icon" :class="{ '-colored': colors }">
          <component :is="icon" :size="30" :stroke-width="1.8" />
        </span>
        <div class="titles">
          <h2 class="title">
            <slot name="title">{{ title }}</slot>
          </h2>
          <p class="status">
            <slot name="status">{{ status }}</slot>
          </p>
        </div>
        <div class="actions"><slot name="actions" /></div>
        <IconButton class="close" aria-label="Close" @click="emit('close')">
          <X :size="28" />
        </IconButton>
      </header>
      <div class="body">
        <slot />
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.modal-dialog {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: var(--space-l);

  > .backdrop {
    position: absolute;
    inset: 0;
    background: var(--scrim-bg);
    backdrop-filter: var(--scrim-filter);
    -webkit-backdrop-filter: var(--scrim-filter);
  }

  > .card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-l);
    width: min(1080px, 100%);
    max-height: 100%;
    padding: var(--space-l);
    border: 1px solid var(--glass-border);
    border-radius: 40px;
    background: var(--sheet-bg);
    box-shadow: var(--shadow-dialog);
    backdrop-filter: var(--sheet-filter);
    -webkit-backdrop-filter: var(--sheet-filter);
  }

  &.-compact > .card {
    width: min(760px, 100%);
  }

  > .card > .header {
    display: flex;
    align-items: center;
    gap: var(--space-m);
  }

  > .card > .header > .icon {
    display: inline-grid;
    flex: none;
    place-items: center;
    width: 60px;
    height: 60px;
    border-radius: 16px;
    background: rgb(255 255 255 / 12%);

    &.-colored {
      background: linear-gradient(160deg, var(--icon-from), var(--icon-to));
      color: #fff;
    }
  }

  > .card > .header > .titles {
    flex: 1;
    min-width: 0;
  }

  > .card > .header > .titles > .title {
    font-size: 34px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  > .card > .header > .titles > .status {
    color: var(--color-text-secondary);
    font-size: 20px;
  }

  > .card > .header > .actions {
    display: flex;
    align-items: center;
    gap: var(--space-s);
  }

  > .card > .body {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
    min-height: 0;
    overflow-y: auto;
  }
}

// <Transition name="dialog"> hooks
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity var(--duration-base) ease;

  > .card {
    transition: transform var(--duration-slow) var(--ease-spring);
  }
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;

  > .card {
    transform: scale(0.9) translateY(24px);
  }
}

// Fading out: let taps through to the screen underneath.
.dialog-leave-active {
  pointer-events: none;
}
</style>
