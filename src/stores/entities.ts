import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

import { createConnection } from '@/ha/connection'
import { MockConnection } from '@/ha/mock/MockConnection'
import type {
  CameraWatcher,
  ConnectionStatus,
  HaConnection,
  HassEntities,
  HassEntity,
  ServiceTarget,
} from '@/ha/types'
import { useConfigStore } from './config'

/** How long a predicted state may show without Home Assistant confirming it. */
const PREDICTION_TIMEOUT_MS = 5_000
/** Brightness reported back by lights is rounded; accept this much difference (0–255). */
const BRIGHTNESS_TOLERANCE = 4

/**
 * The state the UI shows right after a tap, until HA reports it. Without this
 * every switch waits for the round trip to HA and the lights (~250 ms or more).
 */
export interface Prediction {
  state: string
  /** Only `brightness` is predicted; colors come back converted, so they can't be matched. */
  brightness?: number | null
}

interface PendingPrediction extends Prediction {
  timer: ReturnType<typeof setTimeout>
}

function isConfirmed(entity: HassEntity | undefined, prediction: Prediction) {
  if (!entity || entity.state !== prediction.state) return false
  if (prediction.brightness === undefined || prediction.brightness === null) return true
  const brightness = entity.attributes.brightness
  return (
    typeof brightness === 'number' &&
    Math.abs(brightness - prediction.brightness) <= BRIGHTNESS_TOLERANCE
  )
}

export const useEntitiesStore = defineStore('entities', () => {
  const entities = shallowRef<HassEntities>({})
  const status = ref<ConnectionStatus>('connecting')
  const predictions = shallowRef<Record<string, PendingPrediction>>({})
  let connection: HaConnection | null = null
  let unsubscribe: (() => void)[] = []

  function connect(conn: HaConnection = createConnection(useConfigStore().home)) {
    disconnect()
    connection = conn
    unsubscribe = [
      conn.subscribeEntities((next) => {
        entities.value = next
        forget(
          Object.keys(predictions.value).filter((id) =>
            isConfirmed(next[id], predictions.value[id]!),
          ),
        )
      }),
      conn.subscribeStatus((next) => {
        status.value = next
      }),
    ]
  }

  function disconnect() {
    for (const fn of unsubscribe) fn()
    unsubscribe = []
    connection = null
    forget(Object.keys(predictions.value))
  }

  /** The entity as HA reported it, with any not-yet-confirmed prediction applied on top. */
  function get(entityId: string | undefined): HassEntity | undefined {
    if (!entityId) return undefined
    const entity = entities.value[entityId]
    const prediction = predictions.value[entityId]
    if (!entity || !prediction) return entity
    const attributes =
      prediction.state === 'off'
        ? { ...entity.attributes, brightness: null }
        : prediction.brightness === undefined
          ? entity.attributes
          : { ...entity.attributes, brightness: prediction.brightness }
    return { ...entity, state: prediction.state, attributes }
  }

  function predict(entityIds: string[], prediction: Prediction) {
    const next = { ...predictions.value }
    for (const id of entityIds) {
      if (!entities.value[id]) continue
      clearTimeout(next[id]?.timer)
      next[id] = { ...prediction, timer: setTimeout(() => forget([id]), PREDICTION_TIMEOUT_MS) }
    }
    predictions.value = next
  }

  function forget(entityIds: string[]) {
    if (!entityIds.length) return
    const next = { ...predictions.value }
    for (const id of entityIds) {
      clearTimeout(next[id]?.timer)
      delete next[id]
    }
    predictions.value = next
  }

  /**
   * Calls an HA service. With `prediction`, the targeted entities show that state
   * right away; it's dropped when HA confirms it, the call fails, or after 5 s.
   */
  async function callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>,
    target?: ServiceTarget,
    prediction?: Prediction,
  ) {
    if (!connection) throw new Error('Home Assistant is not connected')
    const ids = [target?.entity_id ?? []].flat()
    if (prediction) predict(ids, prediction)
    try {
      await connection.callService(domain, service, data, target)
    } catch (error) {
      if (prediction) forget(ids)
      throw error
    }
  }

  /** `null` when the connection has no live video (the mock). Returns a stop fn otherwise. */
  function watchCamera(entityId: string, watcher: CameraWatcher): (() => void) | null {
    return connection?.watchCamera?.(entityId, watcher) ?? null
  }

  /** Only set while running against the mock; used by the dev toolbar. */
  function mock(): MockConnection | null {
    return connection instanceof MockConnection ? connection : null
  }

  return { entities, status, connect, disconnect, get, callService, watchCamera, mock }
})
