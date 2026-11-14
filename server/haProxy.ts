// Home Assistant auth proxy. The kiosk is an unauthenticated LAN page, so it must
// never hold an HA token. Instead the browser talks to this proxy, which:
//  - swaps the placeholder token in the WebSocket `auth` message for the real one,
//  - only allows the entities listed in kiosk.yaml (state and service calls),
//  - serves the doorbell camera stream with the token added server-side.
// It runs inside the Vite dev server (vite.config.ts) and inside the production
// server (server/app.ts). Plain erasable TypeScript, so Node runs it directly.

import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Duplex } from 'node:stream'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream } from 'node:stream/web'

import { type RawData, WebSocket, WebSocketServer } from 'ws'
import { parse } from 'yaml'

export interface HaProxyOptions {
  /** e.g. http://homeassistant.local:8123 */
  haUrl: string
  /** Long-lived access token of a dedicated (non-admin) HA user. */
  token: string
  /** Path to kiosk.yaml; re-read on every connection so edits apply without a restart. */
  configPath: string
  /** Read instead when `configPath` doesn't exist (the bundled example). */
  fallbackConfigPath?: string
}

/** kiosk.yaml as text, or the fallback file when kiosk.yaml doesn't exist (yet). */
export async function readConfigFile(configPath: string, fallbackPath?: string): Promise<string> {
  try {
    return await readFile(configPath, 'utf8')
  } catch (error) {
    if (!fallbackPath || (error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return readFile(fallbackPath, 'utf8')
  }
}

type Message = Record<string, unknown> & { id?: number; type?: string }

const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/
const CAMERA_PATH = /^\/api\/(camera_proxy_stream|camera_proxy)\/(camera\.[a-z0-9_]+)(?:\?.*)?$/
// Message types home-assistant-js-websocket needs besides the filtered ones below.
const PASS_THROUGH = new Set(['supported_features', 'ping', 'unsubscribe_events'])
// Live camera video (WebRTC through HA's go2rtc). Each names its camera in `entity_id`.
const CAMERA_MESSAGES = new Set([
  'camera/capabilities',
  'camera/webrtc/get_client_config',
  'camera/webrtc/offer',
  'camera/webrtc/candidate',
])

/**
 * Every entity ID in the config, found by shape (`domain.object_id`) so the proxy
 * doesn't have to know the config schema.
 */
export function entityIdsIn(value: unknown, found = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    if (ENTITY_ID.test(value)) found.add(value)
  } else if (Array.isArray(value)) {
    for (const item of value) entityIdsIn(item, found)
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) entityIdsIn(item, found)
  }
  return found
}

/**
 * Decides what happens to one client → HA message: forward it (possibly rewritten)
 * or reject it with the reason sent back to the client.
 */
export function inspectClientMessage(
  message: Message,
  allowed: Set<string>,
  token: string,
): { forward: Message } | { reject: string } {
  switch (message.type) {
    case 'auth':
      return { forward: { type: 'auth', access_token: token } }
    case 'subscribe_entities':
      if (!allowed.size) return { reject: 'No entities in kiosk.yaml' }
      return { forward: { ...message, entity_ids: [...allowed] } }
    case 'call_service': {
      const target = (message.target ?? {}) as Record<string, unknown>
      const data = (message.service_data ?? {}) as Record<string, unknown>
      // Area/device/label targets could reach entities outside the allowlist.
      const keys = [...Object.keys(target), ...Object.keys(data)]
      if (keys.some((key) => ['area_id', 'device_id', 'floor_id', 'label_id'].includes(key)))
        return { reject: 'Only entity_id targets are allowed' }
      const ids = [target.entity_id, data.entity_id].flat().filter((id) => id !== undefined)
      if (!ids.length) return { reject: 'Service calls need an entity_id target' }
      const denied = ids.find((id) => typeof id !== 'string' || !allowed.has(id))
      if (denied !== undefined) return { reject: `${String(denied)} is not in kiosk.yaml` }
      return { forward: message }
    }
    default:
      if (message.type && CAMERA_MESSAGES.has(message.type)) {
        const id = message.entity_id
        if (typeof id !== 'string' || !id.startsWith('camera.') || !allowed.has(id))
          return { reject: `${String(id)} is not a camera in kiosk.yaml` }
        return { forward: message }
      }
      if (message.type && PASS_THROUGH.has(message.type)) return { forward: message }
      return { reject: `${String(message.type)} is not allowed by the kiosk proxy` }
  }
}

export function createHaProxy({ haUrl, token, configPath, fallbackConfigPath }: HaProxyOptions) {
  const wss = new WebSocketServer({ noServer: true })
  const upstreamUrl = `${haUrl.replace(/^http/, 'ws').replace(/\/$/, '')}/api/websocket`

  async function allowedEntities() {
    try {
      return entityIdsIn(parse(await readConfigFile(configPath, fallbackConfigPath)))
    } catch (error) {
      console.error(`[ha-proxy] cannot read ${configPath}:`, error)
      return new Set<string>()
    }
  }

  function bridge(client: WebSocket) {
    const allowed = allowedEntities()
    const upstream = new WebSocket(upstreamUrl)
    const pending: string[] = []

    const close = () => {
      client.close()
      upstream.close()
    }

    upstream.on('open', () => {
      for (const text of pending.splice(0)) upstream.send(text)
    })
    upstream.on('message', (data: RawData, isBinary: boolean) =>
      client.send(data, { binary: isBinary }),
    )
    upstream.on('close', close)
    upstream.on('error', (error) => {
      console.error('[ha-proxy] upstream error:', error.message)
      close()
    })

    client.on('message', async (data: RawData) => {
      let message: Message
      try {
        message = JSON.parse(data.toString()) as Message
      } catch {
        return close()
      }
      // Messages resolve in arrival order: they all await the same promise.
      const verdict = inspectClientMessage(message, await allowed, token)
      if ('reject' in verdict) {
        client.send(
          JSON.stringify({
            id: message.id,
            type: 'result',
            success: false,
            error: { code: 'unauthorized', message: verdict.reject },
          }),
        )
        return
      }
      const text = JSON.stringify(verdict.forward)
      if (upstream.readyState === WebSocket.OPEN) upstream.send(text)
      else pending.push(text)
    })
    client.on('close', close)
    client.on('error', close)
  }

  /** For the HTTP server's `upgrade` event; only `/api/websocket` is handled. */
  function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    wss.handleUpgrade(req, socket, head, bridge)
  }

  /** Camera stills and MJPEG streams for cameras in kiosk.yaml; everything else is 404. */
  async function handleRequest(req: IncomingMessage, res: ServerResponse) {
    const match = req.method === 'GET' ? CAMERA_PATH.exec(req.url ?? '') : null
    if (!match || !(await allowedEntities()).has(match[2]!)) {
      res.writeHead(404).end()
      return
    }

    const abort = new AbortController()
    res.on('close', () => abort.abort())
    try {
      const upstream = await fetch(`${haUrl.replace(/\/$/, '')}/api/${match[1]}/${match[2]}`, {
        headers: { authorization: `Bearer ${token}` },
        signal: abort.signal,
      })
      res.writeHead(upstream.status, {
        'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        'cache-control': 'no-store',
      })
      if (!upstream.body) return void res.end()
      // pipeline, not .pipe(): when the kiosk disconnects mid-stream the abort
      // errors the body stream, and an unhandled stream error kills the process.
      await pipeline(Readable.fromWeb(upstream.body as ReadableStream), res)
    } catch (error) {
      if (abort.signal.aborted) return
      console.error('[ha-proxy] camera request failed:', (error as Error).message)
      if (!res.headersSent) res.writeHead(502)
      res.end()
    }
  }

  return { handleUpgrade, handleRequest }
}
