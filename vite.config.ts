import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

import { createHaProxy } from './server/haProxy.ts'
import { createKioskRoutes } from './server/kiosk.ts'

// Local config: ./kiosk.yaml (git-ignored), or the example until you create one.
const CONFIG = fileURLToPath(new URL('./kiosk.yaml', import.meta.url))
const EXAMPLE_CONFIG = fileURLToPath(new URL('./kiosk.example.yaml', import.meta.url))

/**
 * Serves kiosk.yaml and the editor's ./layout.yaml (git-ignored) with the same
 * routes as the production server (server/kiosk.ts).
 */
function kioskConfig(): Plugin {
  return {
    name: 'kiosk-config',
    configureServer(server) {
      const routes = createKioskRoutes({ configPath: CONFIG, fallbackConfigPath: EXAMPLE_CONFIG })
      server.middlewares.use((req, res, next) => {
        void routes.handleRequest(req, res).then((handled) => handled || next())
      })
      // The editor schema, like the production server (without entity suggestions).
      server.middlewares.use('/kiosk.schema.json', (_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(readFileSync(new URL('./kiosk.schema.json', import.meta.url)))
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
