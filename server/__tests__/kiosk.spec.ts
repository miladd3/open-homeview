// @vitest-environment node
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createKioskRoutes, layoutProblem } from '../kiosk.ts'

const KIOSK = `# my kiosk
editPin: '0123'
weather: weather.home
apps:
  - { id: tv, type: tv, name: TV, player: media_player.tv }
dashboard:
  - [clock, { type: lock, entity: lock.front }]
addons: [cover, broken, missing, ../etc]
`

let server: Server
let base: string
let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'homeview-kiosk-'))
  await writeFile(join(dir, 'kiosk.yaml'), KIOSK)
  const routes = createKioskRoutes({ configPath: join(dir, 'kiosk.yaml') })
  server = createServer((req, res) => {
    void routes.handleRequest(req, res).then((handled) => handled || res.writeHead(418).end())
  })
  await new Promise<void>((resolve) => server.listen(0, resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterEach(() => server?.close())

const put = (body: unknown, pin = '0123') =>
  fetch(`${base}/kiosk/layout`, {
    method: 'PUT',
    headers: { 'x-kiosk-edit-pin': pin },
    body: JSON.stringify(body),
  })

describe('kiosk routes', () => {
  it('serves kiosk.yaml without the PIN, and says that one is set', async () => {
    const response = await fetch(`${base}/config/kiosk.yaml`)
    const text = await response.text()
    expect(text).not.toContain('0123')
    expect(text).toContain('weather: weather.home')
    expect(text).toContain('media_player.tv')
    expect(response.headers.get('x-kiosk-edit-pin')).toBe('set')
  })

  it('checks the PIN, and locks for a minute after 5 wrong tries', async () => {
    const check = (pin: string) =>
      fetch(`${base}/kiosk/pin`, { method: 'POST', headers: { 'x-kiosk-edit-pin': pin } })
    expect((await check('0123')).status).toBe(204)
    expect((await fetch(`${base}/kiosk/pin`, { method: 'POST' })).status).toBe(403)
    for (let i = 0; i < 4; i++) expect((await check('9999')).status).toBe(403)
    expect((await check('0123')).status).toBe(429)
  })

  it('saves, serves and deletes layout.yaml', async () => {
    expect((await fetch(`${base}/config/layout.yaml`)).status).toBe(404)
    const dashboard = [
      [{ app: 'tv', size: '2x1' }, 'clock'],
      [{ type: 'lock', entity: 'lock.front' }],
    ]
    expect((await put({ dashboard })).status).toBe(204)
    const saved = await fetch(`${base}/config/layout.yaml`)
    expect(saved.headers.get('cache-control')).toBe('no-store')
    expect(await saved.text()).toContain('app: tv')
    expect(await readFile(join(dir, 'layout.yaml'), 'utf8')).toContain('size: 2x1')

    const del = (pin?: string) =>
      fetch(`${base}/kiosk/layout`, {
        method: 'DELETE',
        headers: pin ? { 'x-kiosk-edit-pin': pin } : {},
      })
    expect((await del()).status).toBe(403)
    expect((await del('0123')).status).toBe(204)
    expect((await fetch(`${base}/config/layout.yaml`)).status).toBe(404)
  })

  it('rejects a layout that would widen what the kiosk reaches, or has a wrong PIN', async () => {
    expect((await put({ dashboard: [['clock']] }, 'nope')).status).toBe(403)
    const rejected = async (body: unknown) => {
      const response = await put(body)
      expect(response.status).toBe(400)
      return response.text()
    }
    expect(await rejected({ dashboard: [['clock']], theme: 'glass' })).toMatch(/only `dashboard`/)
    expect(await rejected({ dashboard: [[{ app: 'vacuum' }]] })).toMatch(/"vacuum" is not an app/)
    expect(await rejected({ dashboard: [[{ type: 'lock', entity: 'lock.back' }]] })).toMatch(
      /lock\.back is not in kiosk\.yaml/,
    )
    expect(await rejected({ dashboard: [] })).toMatch(/list of pages/)
  })

  it('leaves other paths alone', async () => {
    expect((await fetch(`${base}/somewhere`)).status).toBe(418)
    expect((await fetch(`${base}/kiosk/nothing`)).status).toBe(404)
  })
})

describe('addon routes', () => {
  beforeEach(async () => {
    for (const name of ['cover', 'broken', 'unlisted']) {
      await mkdir(join(dir, 'addons', name, 'chunks'), { recursive: true })
      await writeFile(join(dir, 'addons', name, 'index.js'), 'export default {}')
    }
    const manifest = { name: 'renamed', kind: 'app', version: '1.0.0', kit: 1, files: ['index.js'] }
    await writeFile(join(dir, 'addons/cover/addon.json'), JSON.stringify(manifest))
    await writeFile(join(dir, 'addons/unlisted/addon.json'), JSON.stringify(manifest))
    await writeFile(join(dir, 'addons/broken/addon.json'), '{ nope')
    await writeFile(join(dir, 'addons/cover/chunks/Panel.js'), 'export default 1')
    await writeFile(join(dir, 'secret.txt'), 'outside')
  })

  it('lists the addon.json of every pack in `addons:`, named by its folder', async () => {
    const response = await fetch(`${base}/kiosk/addons`)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual([
      { name: 'cover', kind: 'app', version: '1.0.0', kit: 1, files: ['index.js'] },
      { name: 'broken', error: '/config/addons/broken/addon.json is missing or broken' },
      { name: 'missing', error: '/config/addons/missing/addon.json is missing or broken' },
      { name: '../etc', error: 'is not a folder name (a-z, 0-9 and -)' },
    ])
  })

  it('serves the files of listed packs only, never outside their folder', async () => {
    const index = await fetch(`${base}/addons/cover/index.js`)
    expect(index.headers.get('content-type')).toContain('text/javascript')
    expect(await index.text()).toBe('export default {}')
    expect(await (await fetch(`${base}/addons/cover/chunks/Panel.js`)).text()).toBe(
      'export default 1',
    )
    const paths = [
      '/addons/unlisted/index.js',
      '/addons/cover/missing.js',
      '/addons/cover/..%2f..%2fsecret.txt',
      '/addons/..%2fsecret.txt',
    ]
    const statuses = await Promise.all(paths.map(async (path) => (await fetch(base + path)).status))
    expect(statuses).toEqual([404, 404, 404, 404])
  })
})

describe('layoutProblem', () => {
  it('allows entities from anywhere in kiosk.yaml', () => {
    const kiosk = { apps: [{ id: 'tv' }], entities: ['light.kitchen'] }
    expect(
      layoutProblem({ dashboard: [[{ type: 'light', entity: 'light.kitchen' }]] }, kiosk),
    ).toBe(undefined)
  })
})
