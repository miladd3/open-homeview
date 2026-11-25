// The kiosk's own routes, next to the HA proxy: kiosk.yaml, the on-screen
// editor's layout.yaml and runtime packs. Used by the production server (app.ts)
// and by `npm run dev` (vite.config.ts), so both behave the same.
//
//   GET    /config/kiosk.yaml   the config, without `editPin`
//   GET    /config/layout.yaml  the saved dashboard layout, 404 if none
//   POST   /kiosk/pin           checks X-Edit-Pin
//   PUT    /kiosk/layout        saves { dashboard } as layout.yaml
//   DELETE /kiosk/layout        removes layout.yaml (back to kiosk.yaml's dashboard)
//   GET    /kiosk/addons        the addon.json of each pack in kiosk.yaml's `addons:`
//   GET    /addons/<name>/…     a listed pack's files, from /config/addons/<name>/
//
// The server never runs pack code: it only serves the files.

import { createHash, timingSafeEqual } from 'node:crypto'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, extname, join, normalize, sep } from 'node:path'

import { parse, parseDocument, stringify } from 'yaml'

import { entityIdsIn, readConfig } from './haProxy.ts'

/** Marks a /config/kiosk.yaml response as the example config. */
const EXAMPLE_HEADER = 'x-kiosk-config'
/** The edit PIN, sent by the page; on /config/kiosk.yaml, `set` when kiosk.yaml has one. */
const PIN_HEADER = 'x-kiosk-edit-pin'

const ADDON_NAME = /^[a-z0-9][a-z0-9-]*$/
const MAX_TRIES = 5
const LOCKOUT_MS = 60_000
const MAX_BODY_BYTES = 100_000

interface KioskRoutesOptions {
  configPath: string
  fallbackConfigPath?: string
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.webp': 'image/webp',
}

export const contentType = (file: string) =>
  CONTENT_TYPES[extname(file)] ?? 'application/octet-stream'

type Json = Record<string, unknown>
const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Why a layout can't be saved, or undefined if it can. A layout must never widen
 * what the kiosk reaches: only `dashboard`, only apps from kiosk.yaml, and only
 * entity IDs that are already in kiosk.yaml. The browser checks the rest.
 */
export function layoutProblem(layout: unknown, kiosk: unknown): string | undefined {
  if (!isObject(layout) || Object.keys(layout).some((key) => key !== 'dashboard'))
    return 'A layout has only `dashboard`'
  const { dashboard } = layout
  if (!Array.isArray(dashboard) || !dashboard.length) return '`dashboard` must be a list of pages'
  if (dashboard.some((page) => !Array.isArray(page) || !page.length))
    return 'Each page must be a list of widgets'
  const apps = isObject(kiosk) && Array.isArray(kiosk.apps) ? kiosk.apps : []
  const appIds = new Set(apps.map((app) => (isObject(app) ? app.id : undefined)))
  for (const entry of dashboard.flat()) {
    if (isObject(entry) && 'app' in entry && !appIds.has(entry.app))
      return `"${String(entry.app)}" is not an app in kiosk.yaml`
  }
  const allowed = entityIdsIn(kiosk)
  const added = [...entityIdsIn(dashboard)].find((id) => !allowed.has(id))
  if (added) return `${added} is not in kiosk.yaml`
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('too large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const digest = (text: string) => createHash('sha256').update(text).digest()

export function createKioskRoutes({ configPath, fallbackConfigPath }: KioskRoutesOptions) {
  const layoutPath = join(dirname(configPath), 'layout.yaml')
  const addonsDir = join(dirname(configPath), 'addons')
  let failures = 0
  let lockedUntil = 0

  const send = (res: ServerResponse, status: number, message?: string) => {
    res.writeHead(status, {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    })
    res.end(message)
  }

  async function readKiosk(): Promise<unknown> {
    return parse((await readConfig(configPath, fallbackConfigPath)).text)
  }

  /** The names in kiosk.yaml's `addons:`. */
  async function listedAddons(): Promise<string[]> {
    const kiosk = await readKiosk()
    const names = isObject(kiosk) && Array.isArray(kiosk.addons) ? kiosk.addons : []
    return names.map(String)
  }

  async function serveAddonList(res: ServerResponse) {
    const manifests = await Promise.all(
      (await listedAddons()).map(async (name) => {
        if (!ADDON_NAME.test(name)) return { name, error: 'is not a folder name (a-z, 0-9 and -)' }
        try {
          const manifest = JSON.parse(await readFile(join(addonsDir, name, 'addon.json'), 'utf8'))
          // The folder name is the pack's name, whatever addon.json says.
          return { ...manifest, name }
        } catch {
          return { name, error: `/config/addons/${name}/addon.json is missing or broken` }
        }
      }),
    )
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
    res.end(JSON.stringify(manifests))
  }

  async function serveAddonFile(res: ServerResponse, pathname: string) {
    const [name = '', ...path] = pathname.slice('/addons/'.length).split('/')
    if (!ADDON_NAME.test(name) || !(await listedAddons()).includes(name)) return send(res, 404)
    const folder = join(addonsDir, name) + sep
    // Never anything outside the pack's folder (`..` in the path).
    const file = normalize(join(folder, decodeURIComponent(path.join('/'))))
    const body = file.startsWith(folder) ? await readFile(file).catch(() => undefined) : undefined
    if (!body) return send(res, 404)
    res.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-cache' })
    res.end(body)
  }

  /** Checks X-Edit-Pin against kiosk.yaml's `editPin`. Sends 403/429 and returns false if wrong. */
  function pinOk(req: IncomingMessage, res: ServerResponse, kiosk: unknown): boolean {
    const pin = isObject(kiosk) ? kiosk.editPin : undefined
    if (pin === undefined || pin === null) return true
    if (Date.now() < lockedUntil) {
      send(res, 429, 'Too many tries. Wait a minute.')
      return false
    }
    const given = req.headers[PIN_HEADER]
    if (typeof given === 'string' && timingSafeEqual(digest(given), digest(String(pin)))) {
      failures = 0
      return true
    }
    if (++failures >= MAX_TRIES) [failures, lockedUntil] = [0, Date.now() + LOCKOUT_MS]
    send(res, 403, 'Wrong PIN')
    return false
  }

  async function serveConfig(res: ServerResponse) {
    const read = await readConfig(configPath, fallbackConfigPath).catch((error: Error) => {
      console.error(`[server] cannot read ${configPath}:`, error.message)
    })
    if (!read) return send(res, 404)
    const { text, isExample } = read
    // The PIN stays on the server: the page only learns that one is set.
    const doc = parseDocument(text)
    const hasPin = doc.has('editPin')
    doc.delete('editPin')
    res.writeHead(200, {
      'content-type': 'text/yaml; charset=utf-8',
      // Polled for changes by the kiosk: never cache it.
      'cache-control': 'no-store',
      // The kiosk shows a "this is the example" banner.
      ...(isExample && { [EXAMPLE_HEADER]: 'example' }),
      ...(hasPin && { [PIN_HEADER]: 'set' }),
    })
    res.end(hasPin ? doc.toString() : text)
  }

  async function serveLayout(res: ServerResponse) {
    const text = await readFile(layoutPath, 'utf8').catch(() => undefined)
    if (text === undefined) return send(res, 404)
    res.writeHead(200, { 'content-type': 'text/yaml; charset=utf-8', 'cache-control': 'no-store' })
    res.end(text)
  }

  async function saveLayout(req: IncomingMessage, res: ServerResponse) {
    const kiosk = await readKiosk()
    if (!pinOk(req, res, kiosk)) return
    const layout = await readBody(req).catch(() => undefined)
    if (layout === undefined) return send(res, 400, 'The body must be JSON')
    const problem = layoutProblem(layout, kiosk)
    if (problem) return send(res, 400, problem)
    const text =
      "# Written by the kiosk's on-screen editor. Delete it to go back to kiosk.yaml's dashboard.\n" +
      stringify(layout, { flowCollectionPadding: false })
    // Write then rename, so the kiosk never reads half a file.
    await writeFile(`${layoutPath}.tmp`, text)
    await rename(`${layoutPath}.tmp`, layoutPath)
    send(res, 204)
  }

  /** Handles the request if it is one of these routes; false if it isn't. */
  async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const pathname = new URL(req.url ?? '/', 'http://kiosk').pathname
    const route = `${req.method} ${pathname}`
    try {
      if (req.method === 'GET' && pathname.startsWith('/addons/')) {
        await serveAddonFile(res, pathname)
        return true
      }
      switch (route) {
        case 'GET /config/kiosk.yaml':
          await serveConfig(res)
          return true
        case 'GET /config/layout.yaml':
          await serveLayout(res)
          return true
        case 'GET /kiosk/addons':
          await serveAddonList(res)
          return true
        case 'POST /kiosk/pin':
          if (pinOk(req, res, await readKiosk())) send(res, 204)
          return true
        case 'PUT /kiosk/layout':
          await saveLayout(req, res)
          return true
        case 'DELETE /kiosk/layout': {
          if (!pinOk(req, res, await readKiosk())) return true
          await rm(layoutPath, { force: true })
          send(res, 204)
          return true
        }
      }
    } catch (error) {
      const message = (error as Error).message
      console.error(`[server] ${route} failed:`, message)
      if (!res.headersSent) send(res, 500, message)
      return true
    }
    return pathname.startsWith('/kiosk/') ? (send(res, 404), true) : false
  }

  return { handleRequest }
}
