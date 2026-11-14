// @vitest-environment node
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createApp } from '../app.ts'

let server: Server
let base: string
let dir: string

async function start(configPath: string) {
  const app = createApp({
    haUrl: 'http://127.0.0.1:9',
    token: 'secret-token',
    configPath,
    fallbackConfigPath: join(dir, 'example.yaml'),
    distDir: join(dir, 'dist'),
    schemaPath: join(dir, 'schema.json'),
  })
  server = createServer((req, res) => void app.handleRequest(req, res))
  await new Promise<void>((resolve) => server.listen(0, resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'homeview-'))
  await mkdir(join(dir, 'dist/assets'), { recursive: true })
  await writeFile(join(dir, 'dist/index.html'), '<html>shell</html>')
  await writeFile(join(dir, 'dist/assets/app-123.js'), 'console.log(1)')
  await writeFile(join(dir, 'secret.txt'), 'outside dist')
  await writeFile(join(dir, 'example.yaml'), 'rooms: [] # example')
  await writeFile(join(dir, 'kiosk.yaml'), 'rooms: [] # mine')
  await writeFile(join(dir, 'schema.json'), '{"title":"kiosk"}')
})

afterEach(() => server?.close())

describe('server', () => {
  it('serves the page shell uncached and hashed assets cached forever', async () => {
    await start(join(dir, 'kiosk.yaml'))
    const shell = await fetch(`${base}/some/route`)
    expect(await shell.text()).toBe('<html>shell</html>')
    expect(shell.headers.get('cache-control')).toBe('no-cache')

    const asset = await fetch(`${base}/assets/app-123.js`)
    expect(asset.headers.get('content-type')).toContain('text/javascript')
    expect(asset.headers.get('cache-control')).toContain('immutable')
    expect((await fetch(`${base}/assets/missing.js`)).status).toBe(404)
  })

  it('serves kiosk.yaml, or the example while it does not exist', async () => {
    await start(join(dir, 'kiosk.yaml'))
    const config = await fetch(`${base}/config/kiosk.yaml`)
    expect(await config.text()).toBe('rooms: [] # mine')
    expect(config.headers.get('cache-control')).toBe('no-store')
    expect(config.headers.get('x-kiosk-config')).toBeNull()
    server.close()

    await start(join(dir, 'missing.yaml'))
    const example = await fetch(`${base}/config/kiosk.yaml`)
    expect(await example.text()).toBe('rooms: [] # example')
    expect(example.headers.get('x-kiosk-config')).toBe('example')
  })

  it('serves the editor schema', async () => {
    await start(join(dir, 'kiosk.yaml'))
    expect(await (await fetch(`${base}/kiosk.schema.json`)).json()).toEqual({ title: 'kiosk' })
  })

  it('never serves files outside dist or leaks the token', async () => {
    await start(join(dir, 'kiosk.yaml'))
    for (const path of ['/..%2fsecret.txt', '/%2e%2e/secret.txt', '/assets/..%2f..%2fsecret.txt']) {
      const text = await (await fetch(`${base}${path}`)).text()
      expect(text).not.toContain('outside dist')
      expect(text).not.toContain('secret-token')
    }
  })

  it('sends /api/ to the HA proxy, which only allows cameras from kiosk.yaml', async () => {
    await start(join(dir, 'kiosk.yaml'))
    expect((await fetch(`${base}/api/states`)).status).toBe(404)
    expect((await fetch(`${base}/api/camera_proxy/camera.not_listed`)).status).toBe(404)
    expect((await fetch(`${base}/healthz`)).status).toBe(204)
  })
})
