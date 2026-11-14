import {
  callService,
  type Connection,
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
} from 'home-assistant-js-websocket'

import type {
  CameraWatcher,
  ConnectionStatus,
  HaConnection,
  HassEntities,
  ServiceTarget,
} from './types'

const RETRY_MS = 5_000

/**
 * Live Home Assistant over WebSocket. The browser connects to `/api/websocket` on
 * its own origin, where the kiosk's auth proxy (server/haProxy.ts) swaps in the real
 * token and only lets through the entities listed in kiosk.yaml. The token below is
 * a placeholder; the browser never sees the real one.
 */
export class LiveConnection implements HaConnection {
  private connection: Promise<Connection>
  private status: ConnectionStatus = 'connecting'
  private statusListeners = new Set<(status: ConnectionStatus) => void>()

  constructor(origin = window.location.origin) {
    this.connection = this.connect(origin)
  }

  subscribeEntities(callback: (entities: HassEntities) => void) {
    let unsubscribe: (() => void) | null = null
    let cancelled = false
    this.connection.then((conn) => {
      if (!cancelled)
        unsubscribe = subscribeEntities(conn, (next) => callback(next as HassEntities))
    })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }

  subscribeStatus(callback: (status: ConnectionStatus) => void) {
    this.statusListeners.add(callback)
    callback(this.status)
    return () => {
      this.statusListeners.delete(callback)
    }
  }

  async callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: ServiceTarget,
  ) {
    await callService(await this.connection, domain, service, data, target)
  }

  watchCamera(entityId: string, watcher: CameraWatcher) {
    let stopped = false
    let stop = () => {}
    this.connection
      .then((conn) => startWebRtc(conn, entityId, watcher, () => stopped))
      .then((fn) => {
        if (stopped) fn()
        else stop = fn
      })
      .catch((error: unknown) => {
        if (!stopped) watcher.onError(error instanceof Error ? error : new Error(String(error)))
      })
    return () => {
      stopped = true
      stop()
    }
  }

  // The library reconnects on its own once connected; only the first connect needs a retry loop.
  private async connect(origin: string): Promise<Connection> {
    const auth = createLongLivedTokenAuth(origin, 'kiosk-proxy')
    for (;;) {
      try {
        const conn = await createConnection({ auth })
        conn.addEventListener('ready', () => this.setStatus('connected'))
        conn.addEventListener('disconnected', () => this.setStatus('disconnected'))
        conn.addEventListener('reconnect-error', () => this.setStatus('disconnected'))
        this.setStatus('connected')
        return conn
      } catch (error) {
        console.warn('[ha] connection failed, retrying', error)
        this.setStatus('disconnected')
        await new Promise((resolve) => setTimeout(resolve, RETRY_MS))
      }
    }
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status
    for (const listener of this.statusListeners) listener(status)
  }
}

type WebRtcEvent =
  | { type: 'session'; session_id: string }
  | { type: 'answer'; answer: string }
  | { type: 'candidate'; candidate: RTCIceCandidateInit }
  | { type: 'error'; code: string; message: string }

/**
 * Negotiates WebRTC with HA's go2rtc, the same way HA's own frontend does: send an
 * offer, get a session ID and an answer back, and trade ICE candidates both ways.
 * Video then flows straight from the server to the browser, not through the proxy.
 */
async function startWebRtc(
  conn: Connection,
  entityId: string,
  watcher: CameraWatcher,
  isStopped: () => boolean,
): Promise<() => void> {
  const { configuration } = await conn.sendMessagePromise<{ configuration: RTCConfiguration }>({
    type: 'camera/webrtc/get_client_config',
    entity_id: entityId,
  })
  const pc = new RTCPeerConnection(configuration)
  pc.addTransceiver('video', { direction: 'recvonly' })
  pc.addTransceiver('audio', { direction: 'recvonly' })
  pc.ontrack = (event) => {
    const [stream] = event.streams
    if (stream) watcher.onStream(stream)
  }
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed') watcher.onError(new Error('WebRTC connection failed'))
  }

  // Candidates found before HA has assigned a session wait here.
  let sessionId: string | null = null
  const queued: RTCIceCandidateInit[] = []
  const sendCandidate = (candidate: RTCIceCandidateInit) =>
    void conn
      .sendMessagePromise({
        type: 'camera/webrtc/candidate',
        entity_id: entityId,
        session_id: sessionId,
        candidate,
      })
      .catch(() => {})
  pc.onicecandidate = ({ candidate }) => {
    if (!candidate) return
    if (sessionId) sendCandidate(candidate.toJSON())
    else queued.push(candidate.toJSON())
  }

  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  if (isStopped()) {
    pc.close()
    return () => {}
  }

  const unsubscribe = await conn.subscribeMessage<WebRtcEvent>(
    (event) => {
      switch (event.type) {
        case 'session':
          sessionId = event.session_id
          queued.splice(0).forEach(sendCandidate)
          return
        case 'answer':
          void pc.setRemoteDescription({ type: 'answer', sdp: event.answer }).then(() => {
            // go2rtc turns video off when the camera's codec isn't one the browser
            // offered, e.g. a UniFi camera with "Enhanced encoding" (H.265).
            const video = pc.getTransceivers().find((t) => t.receiver.track.kind === 'video')
            if (video?.currentDirection === 'inactive')
              watcher.onError(new Error("camera codec isn't supported by this browser (H.265?)"))
          })
          return
        case 'candidate':
          void pc.addIceCandidate(event.candidate).catch(() => {})
          return
        case 'error':
          watcher.onError(new Error(`${event.code}: ${event.message}`))
      }
    },
    { type: 'camera/webrtc/offer', entity_id: entityId, offer: offer.sdp },
  )

  return () => {
    pc.close()
    void unsubscribe().catch(() => {})
  }
}
