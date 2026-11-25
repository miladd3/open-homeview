// The whole production server in one process: the built page, kiosk.yaml (and the
// editor's layout.yaml, see kiosk.ts) and the Home Assistant auth proxy. The HA token only ever lives here, never in the
// browser (see haProxy.ts).

import { readFile, stat } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join, normalize, sep } from 'node:path'
import type { Duplex } from 'node:stream'

import { createHaProxy } from './haProxy.ts'
import { contentType, createKioskRoutes } from './kiosk.ts'
import { createSchemaHandler } from './schema.ts'

export interface AppOptions {
  haUrl: string
  token: string
  /** The user's kiosk.yaml. */
  configPath: string
  /** Served (and allowed by the proxy) while `configPath` doesn't exist. */
  fallbackConfigPath?: string
  /** The built page (`dist/`). */
  distDir: string
  /** kiosk.schema.json, served at /kiosk.schema.json for editor autocomplete. */
  schemaPath?: string
  /** Suggest this home's entity IDs in the served schema (SCHEMA_ENTITIES). */
  schemaEntities?: boolean
}

export function createApp({
  haUrl,
  token,
  configPath,
  fallbackConfigPath,
  distDir,
  schemaPath,
  schemaEntities = false,
}: AppOptions) {
  const proxy = createHaProxy({ haUrl, token, configPath, fallbackConfigPath })
  const kiosk = createKioskRoutes({ configPath, fallbackConfigPath })
  const schema =
    schemaPath && createSchemaHandler({ schemaPath, withEntities: schemaEntities, haUrl, token })
  const root = normalize(distDir + sep)

  async function sendFile(res: ServerResponse, file: string, cacheControl: string) {
    const body = await readFile(file)
    res.writeHead(200, {
      'content-type': contentType(file),
      'cache-control': cacheControl,
    })
    res.end(body)
  }

  async function serveStatic(res: ServerResponse, pathname: string) {
    const file = normalize(join(root, decodeURIComponent(pathname)))
    // Never serve anything outside dist/ (`..` in the path).
    const isFile = file.startsWith(root) && (await stat(file).catch(() => null))?.isFile()
    if (isFile) {
      // Hashed build assets never change; everything else must be revalidated so
      // the kiosk picks up a new version on its next reload.
      const hashed = pathname.startsWith('/assets/')
      return sendFile(res, file, hashed ? 'public, max-age=31536000, immutable' : 'no-cache')
    }
    if (pathname.startsWith('/assets/')) return void res.writeHead(404).end()
    // Single-page app: unknown paths get the shell.
    return sendFile(res, join(root, 'index.html'), 'no-cache')
  }

  async function handleRequest(req: IncomingMessage, res: ServerResponse) {
    const pathname = new URL(req.url ?? '/', 'http://kiosk').pathname
    try {
      if (pathname === '/healthz') return void res.writeHead(204).end()
      if (pathname.startsWith('/api/')) return await proxy.handleRequest(req, res)
      if (await kiosk.handleRequest(req, res)) return
      if (req.method !== 'GET' && req.method !== 'HEAD') return void res.writeHead(405).end()
      if (pathname === '/kiosk.schema.json' && schema) {
        const body = await schema()
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-cache' })
        return void res.end(body)
      }
      return await serveStatic(res, pathname)
    } catch (error) {
      console.error(`[server] ${req.method} ${pathname} failed:`, (error as Error).message)
      if (!res.headersSent) res.writeHead(500)
      res.end()
    }
  }

  function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    if (req.url === '/api/websocket') proxy.handleUpgrade(req, socket, head)
    else socket.destroy()
  }

  return { handleRequest, handleUpgrade }
}
