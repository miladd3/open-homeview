<script setup lang="ts">
import { Delete } from '@lucide/vue'
import { ref } from 'vue'

import { checkPin } from '@/config/layout'
import { AppSheet } from '@/kit'

// Asks for kiosk.yaml's `editPin` before edit mode. The server checks it (the
// page never sees the PIN) and emits `unlock` with it, for the save.
const emit = defineEmits<{ close: []; unlock: [pin: string] }>()

const pin = ref('')
const problem = ref<string>()
const checking = ref(false)

function press(key: string) {
  problem.value = undefined
  if (key === 'back') pin.value = pin.value.slice(0, -1)
  else if (pin.value.length < 12) pin.value += key
}

async function submit() {
  if (!pin.value || checking.value) return
  checking.value = true
  try {
    await checkPin(pin.value)
    emit('unlock', pin.value)
  } catch (error) {
    problem.value = (error as Error).message
    pin.value = ''
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <AppSheet
    class="pin-pad"
    :app="{ name: 'Edit the dashboard', icon: 'lock' }"
    status="Enter the PIN"
    @close="emit('close')"
  >
    <div class="pad">
      <p class="dots" :class="{ '-wrong': problem }" aria-live="polite">
        <template v-if="problem">{{ problem }}</template>
        <template v-else>
          <span
            v-for="i in Math.max(pin.length, 4)"
            :key="i"
            class="dot"
            :class="{ '-on': i <= pin.length }"
          />
        </template>
      </p>
      <div class="keys">
        <button v-for="key in '123456789'" :key="key" class="key" type="button" @click="press(key)">
          {{ key }}
        </button>
        <button class="key -icon" type="button" aria-label="Delete" @click="press('back')">
          <Delete :size="30" />
        </button>
        <button class="key" type="button" @click="press('0')">0</button>
        <button class="key -ok" type="button" :disabled="!pin || checking" @click="submit">
          OK
        </button>
      </div>
    </div>
  </AppSheet>
</template>

<style scoped lang="scss">
.pin-pad .pad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-l);
  margin: auto;

  > .dots {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    height: 32px;
    margin: 0;
    font-size: 20px;

    &.-wrong {
      color: var(--danger);
    }
  }

  > .dots > .dot {
    width: 16px;
    height: 16px;
    border: 2px solid var(--text-secondary);
    border-radius: var(--radius-pill);

    &.-on {
      border-color: var(--text-primary);
      background: var(--text-primary);
    }
  }

  > .keys {
    display: grid;
    grid-template-columns: repeat(3, 88px);
    gap: var(--space-s);
  }

  > .keys > .key {
    display: grid;
    place-items: center;
    height: 72px;
    border: 0;
    border-radius: var(--radius-pill);
    background: var(--fill);
    color: var(--text-primary);
    font: inherit;
    font-size: 30px;
    cursor: pointer;

    &:active {
      background: var(--fill-strong);
    }

    &.-icon {
      background: none;
    }

    &.-ok {
      background: var(--accent);
      font-size: 22px;
      font-weight: 600;
    }

    &:disabled {
      opacity: 0.4;
    }
  }
}
</style>
