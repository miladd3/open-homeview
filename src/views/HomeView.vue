<script setup lang="ts">
import { FileCog, WifiOff } from '@lucide/vue'
import { computed, ref } from 'vue'

import ConfigHelpDialog from '@/components/organisms/ConfigHelpDialog.vue'
import DashboardHost from '@/components/organisms/DashboardHost.vue'
import { useMissingEntities } from '@/composables/useMissingEntities'
import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'

// The Home screen: the dashboard, with a small banner on top while Home Assistant
// is offline or kiosk.yaml needs a look.
const config = useConfigStore()
const store = useEntitiesStore()
const missing = useMissingEntities()
const showConfigHelp = ref(false)
const configNotice = computed(() => {
  if (config.isExample) return 'Example config'
  return missing.value.length ? `${missing.value.length} not found` : null
})
</script>

<template>
  <main class="home-view">
    <div v-if="store.status !== 'connected' || configNotice" class="banner" role="status">
      <span v-if="store.status !== 'connected'" class="notice -offline">
        <WifiOff :size="18" />
        Home Assistant {{ store.status === 'connecting' ? 'connecting…' : 'reconnecting…' }}
      </span>
      <button
        v-if="configNotice"
        class="notice -warning"
        type="button"
        @click="showConfigHelp = true"
      >
        <FileCog :size="18" /> kiosk.yaml: {{ configNotice }}
      </button>
    </div>

    <DashboardHost class="dashboard" />

    <Transition name="sheet">
      <ConfigHelpDialog
        v-if="showConfigHelp"
        :is-example="config.isExample"
        :missing="missing"
        @close="showConfigHelp = false"
      />
    </Transition>
  </main>
</template>

<style scoped lang="scss">
.home-view {
  position: relative;
  height: 100%;
  padding: var(--space-l) 40px 0;

  > .dashboard {
    height: 100%;
  }

  // Sits in the top padding, so the grid never moves.
  > .banner {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 2;
    display: flex;
    justify-content: center;
    gap: var(--space-s);
    padding-top: 2px;
  }

  > .banner > .notice {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    height: 28px;
    padding: 0 var(--space-s);
    border: 0;
    border-radius: var(--radius-pill);
    // fixed colour: a status pill reads the same in every theme
    color: #1c1c1e;
    font-size: 15px;
    font-weight: 600;

    &.-offline {
      background: var(--danger);
      // fixed colour: a status pill reads the same in every theme
      color: #fff;
    }

    &.-warning {
      // fixed colour: a status pill reads the same in every theme
      background: #ff9f0a;
      cursor: pointer;
    }
  }
}
</style>
