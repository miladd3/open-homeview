// Production entry: `node server/main.ts` (Node 24 strips the types natively).
// Settings come from environment variables only; see the README.

import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

import { createApp } from './app.ts'

const {
  HA_URL,
  HA_TOKEN,
  PORT = '8080',
  CONFIG_PATH = '/config/kiosk.yaml',
  DIST_DIR = fileURLToPath(new URL('../dist', import.meta.url)),
  SCHEMA_ENTITIES = 'false',
} = process.env
const EXAMPLE_CONFIG = fileURLToPath(new URL('../kiosk.example.yaml', import.meta.url))

const missing = [!HA_URL && 'HA_URL', !HA_TOKEN && 'HA_TOKEN'].filter(Boolean)
if (missing.length) {
  console.error(
    `[server] ${missing.join(' and ')} must be set. HA_URL is your Home Assistant address ` +
      '(e.g. http://192.168.1.10:8123), HA_TOKEN a long-lived token of a non-admin HA user.',
  )
  process.exit(1)
}

if (!existsSync(CONFIG_PATH))
  console.warn(
    `[server] ${CONFIG_PATH} not found: showing the example config. ` +
      'Copy kiosk.example.yaml there and edit it; the kiosk reloads by itself.',
  )

const app = createApp({
  haUrl: HA_URL!,
  token: HA_TOKEN!,
  configPath: CONFIG_PATH,
  fallbackConfigPath: EXAMPLE_CONFIG,
  distDir: DIST_DIR,
  schemaPath: fileURLToPath(new URL('../kiosk.schema.json', import.meta.url)),
  schemaEntities: SCHEMA_ENTITIES === 'true',
})

const server = createServer((req, res) => void app.handleRequest(req, res))
server.on('upgrade', app.handleUpgrade)
server.listen(Number(PORT), () =>
  console.info(`[server] listening on :${PORT}, Home Assistant at ${HA_URL}`),
)

// Docker sends SIGTERM on stop; exit right away instead of waiting 10 s for SIGKILL.
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => process.exit(0))
