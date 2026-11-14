<script setup lang="ts">
import { FileCog, Lightbulb, WifiOff } from '@lucide/vue'
import { computed, ref } from 'vue'

import AppIcon from '@/components/molecules/AppIcon.vue'
import ClockDisplay from '@/components/molecules/ClockDisplay.vue'
import StatusChip from '@/components/molecules/StatusChip.vue'
import WeatherSummary from '@/components/molecules/WeatherSummary.vue'
import ConfigHelpDialog from '@/components/organisms/ConfigHelpDialog.vue'
import RoomTile from '@/components/organisms/RoomTile.vue'
import type { AppConfig } from '@/config/home'
import { icons } from '@/config/icons'
import { useAppStatus } from '@/composables/useAppStatus'
import { useMissingEntities } from '@/composables/useMissingEntities'
import { useWeather } from '@/composables/useWeather'
import { useConfigStore } from '@/stores/config'
import { useEntitiesStore } from '@/stores/entities'
import { useKioskStore } from '@/stores/kiosk'

const config = useConfigStore()
const store = useEntitiesStore()
const kiosk = useKioskStore()
const weather = useWeather()
const missing = useMissingEntities()
const showConfigHelp = ref(false)
const configNotice = computed(() => {
  if (config.isExample) return 'Example config'
  return missing.value.length ? `${missing.value.length} not found` : null
})

// With a Lights app, count its individual lights and open it from the chip.
const lightsApp = config.home.apps.find((app) => app.type === 'lights')
const countedLights = [
  ...new Set(
    lightsApp
      ? lightsApp.groups.flatMap((group) => group.lightEntityIds)
      : config.home.rooms.flatMap((room) => room.lightEntityIds),
  ),
]
const lightsOn = computed(() => countedLights.filter((id) => store.get(id)?.state === 'on').length)
// The config never changes while mounted (an edit reloads the page).
// Hidden apps only open from events, so they get no icon or chip.
const shownApps = config.home.apps.filter((app) => !app.hidden)
const appChips = shownApps.map((app) => ({ app, status: useAppStatus(app) }))

function openApp(app: AppConfig) {
  kiosk.openApp(app.id)
}
</script>

<template>
  <main class="home-view">
    <header class="header">
      <ClockDisplay />
      <WeatherSummary
        v-if="weather"
        :icon="weather.icon"
        :temperature="weather.temperature"
        :unit="weather.unit"
        :label="weather.label"
      />
    </header>

    <nav class="chips" aria-label="Status">
      <StatusChip
        v-if="store.status !== 'connected'"
        class="chip -offline"
        tag="div"
        active
        label="Home Assistant"
        :value="store.status === 'connecting' ? 'Connecting…' : 'Reconnecting…'"
      >
        <template #icon><WifiOff :size="24" /></template>
      </StatusChip>
      <StatusChip
        v-if="configNotice"
        class="chip -warning"
        active
        label="kiosk.yaml"
        :value="configNotice"
        @click="showConfigHelp = true"
      >
        <template #icon><FileCog :size="24" /></template>
      </StatusChip>
      <StatusChip
        class="chip"
        :tag="lightsApp ? 'button' : 'div'"
        label="Lights"
        :value="lightsOn ? `${lightsOn} On` : 'All Off'"
        :active="lightsOn > 0"
        @click="lightsApp && openApp(lightsApp)"
      >
        <template #icon><Lightbulb :size="24" /></template>
      </StatusChip>
      <template v-for="{ app, status } in appChips" :key="app.id">
        <StatusChip
          v-if="status.value"
          class="chip"
          :label="app.name"
          :value="status.value.text"
          :active="status.value.active"
          :style="{ '--chip-color': app.colors[0] }"
          @click="openApp(app)"
        >
          <template #icon><component :is="icons[app.icon]" :size="24" /></template>
        </StatusChip>
      </template>
    </nav>

    <div class="sections">
      <section v-if="config.home.rooms.length" class="section" aria-labelledby="rooms-heading">
        <h2 id="rooms-heading" class="heading">Rooms</h2>
        <div class="rooms">
          <RoomTile
            v-for="room in config.home.rooms"
            :key="room.id"
            :room="room"
            @open="kiosk.openRoom"
          />
        </div>
      </section>

      <section v-if="shownApps.length" class="section" aria-labelledby="apps-heading">
        <h2 id="apps-heading" class="heading">Apps</h2>
        <div class="apps">
          <AppIcon
            v-for="app in shownApps"
            :key="app.id"
            :label="app.name"
            :icon="icons[app.icon]"
            :colors="app.colors"
            @click="openApp(app)"
          />
        </div>
      </section>
    </div>

    <Transition name="dialog">
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
  display: flex;
  flex-direction: column;
  gap: var(--space-m);
  height: 100%;
  padding: var(--space-l) var(--space-xl);

  > .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  > .header > .clock-display {
    :deep(.time) {
      font-size: 80px;
    }
  }

  > .chips {
    display: flex;
    gap: var(--space-s);
    overflow-x: auto;
    scrollbar-width: none;
  }

  > .chips > .chip.-offline {
    --chip-color: var(--color-danger);
  }

  > .chips > .chip.-warning {
    --chip-color: #ff9f0a;
  }

  > .sections {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-l);
    min-height: 0;
    padding-top: var(--space-s);
    overflow-y: auto;
    scrollbar-width: none;
  }

  > .sections > .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  > .sections > .section > .heading {
    font-size: 24px;
    font-weight: 700;
  }

  > .sections > .section > .rooms {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--space-m);
  }

  > .sections > .section > .apps {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-m) var(--space-l);
  }
}
</style>
