import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import { createHaProxy, readConfigFile } from './server/haProxy.ts'

// Local config: ./kiosk.yaml (git-ignored), or the example until you create one.
const CONFIG = fileURLToPath(new URL('./kiosk.yaml', import.meta.url))
const EXAMPLE_CONFIG = fileURLToPath(new URL('./kiosk.example.yaml', import.meta.url))

/** Serves kiosk.yaml at /config/kiosk.yaml, like the production server does. */
function kioskConfig(): Plugin {
  return {
    name: 'kiosk-config',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/config/kiosk.yaml')) return next()
        readConfigFile(CONFIG, EXAMPLE_CONFIG).then(
          (text) => {
            res.writeHead(200, { 'content-type': 'text/yaml', 'cache-control': 'no-store' })
            res.end(text)
          },
          () => res.writeHead(404).end(),
        )
      })
      // Edits to kiosk.yaml are picked up by the kiosk's own polling.
      server.watcher.add([CONFIG, EXAMPLE_CONFIG])
    },
  }
}

/**
 * Runs the HA auth proxy inside `npm run dev`, so local development talks to the
 * real Home Assistant exactly like production does (through `/api/`).
 */
function haProxy(haUrl: string, token: string): Plugin {
  return {
    name: 'ha-proxy',
    configureServer(server) {
      const proxy = createHaProxy({
        haUrl,
        token,
        configPath: CONFIG,
        fallbackConfigPath: EXAMPLE_CONFIG,
      })
      server.httpServer?.on('upgrade', (req, socket, head) => {
        if (req.url === '/api/websocket') proxy.handleUpgrade(req, socket, head)
      })
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/api/')) void proxy.handleRequest(req, res)
        else next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // HA_URL / HA_TOKEN come from .env.local and stay on the server side: only
  // VITE_-prefixed variables reach the browser.
  const { HA_URL, HA_TOKEN } = loadEnv(mode, process.cwd(), '')
  const live = command === 'serve' && Boolean(HA_URL && HA_TOKEN)
  const mock = command === 'serve' && !live

  return {
    plugins: [vue(), vueDevTools(), kioskConfig(), ...(live ? [haProxy(HA_URL!, HA_TOKEN!)] : [])],
    define: {
      'import.meta.env.VITE_HA_MOCK': JSON.stringify(String(mock)),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
