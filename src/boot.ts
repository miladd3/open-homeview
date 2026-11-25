import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { createConnection } from './ha/connection'
import router from './router'
import { useConfigStore } from './stores/config'
import { useEntitiesStore } from './stores/entities'
import ConfigErrorView from './views/ConfigErrorView.vue'

const CONFIG_RETRY_SECONDS = 30

/** Loads kiosk.yaml and mounts the kiosk, or the error screen when kiosk.yaml is broken. */
export async function boot(addonWarnings: string[]) {
  const pinia = createPinia()
  const config = useConfigStore(pinia)
  config.addonWarnings = addonWarnings

  try {
    await config.load()
  } catch (error) {
    console.error(error)
    // A skipped pack often explains the error (its type is "not one of" the types).
    const message = [error instanceof Error ? error.message : String(error), ...addonWarnings]
    createApp(ConfigErrorView, {
      message: message.join('\n'),
      retrySeconds: CONFIG_RETRY_SECONDS,
    }).mount('#app')
    setTimeout(() => window.location.reload(), CONFIG_RETRY_SECONDS * 1000)
    return
  }

  const app = createApp(App)
  app.use(pinia)
  app.use(router)
  useEntitiesStore(pinia).connect(createConnection(config.home))
  app.mount('#app')
}
