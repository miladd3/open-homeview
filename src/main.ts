import '@fontsource-variable/inter'
import './styles/base.scss'

import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { createConnection } from './ha/connection'
import router from './router'
import { useConfigStore } from './stores/config'
import { useEntitiesStore } from './stores/entities'
import ConfigErrorView from './views/ConfigErrorView.vue'

const CONFIG_RETRY_SECONDS = 30

async function start() {
  const pinia = createPinia()

  try {
    await useConfigStore(pinia).load()
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : String(error)
    createApp(ConfigErrorView, { message, retrySeconds: CONFIG_RETRY_SECONDS }).mount('#app')
    setTimeout(() => window.location.reload(), CONFIG_RETRY_SECONDS * 1000)
    return
  }

  const app = createApp(App)
  app.use(pinia)
  app.use(router)
  useEntitiesStore(pinia).connect(createConnection(useConfigStore(pinia).home))
  app.mount('#app')
}

void start()
