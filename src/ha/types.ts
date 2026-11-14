// Mirrors the subset of Home Assistant's WebSocket API the kiosk relies on, so the
// mock and the real connection (home-assistant-js-websocket) are interchangeable.

export interface HassEntity {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
  last_changed: string
  last_updated: string
}

export type HassEntities = Record<string, HassEntity>

export interface ServiceTarget {
  entity_id: string | string[]
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface CameraWatcher {
  /** The camera's live video, once WebRTC has connected. */
  onStream: (stream: MediaStream) => void
  /** WebRTC failed or the camera can't do it; callers fall back to MJPEG. */
  onError: (error: Error) => void
}

export interface HaConnection {
  /** Calls `callback` with the full entity map now and on every change. Returns an unsubscribe fn. */
  subscribeEntities(callback: (entities: HassEntities) => void): () => void
  /** Calls `callback` with the current status now and on every change. Returns an unsubscribe fn. */
  subscribeStatus(callback: (status: ConnectionStatus) => void): () => void
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: ServiceTarget,
  ): Promise<void>
  /** Live camera video over WebRTC. Optional: the mock has no video. Returns a stop fn. */
  watchCamera?(entityId: string, watcher: CameraWatcher): () => void
}
