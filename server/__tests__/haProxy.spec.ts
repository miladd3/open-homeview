import { describe, expect, it } from 'vitest'

import { entityIdsIn, inspectClientMessage } from '../haProxy.ts'

const allowed = new Set(['light.bedroom', 'scene.bedroom_read', 'camera.doorbell'])
const inspect = (message: Record<string, unknown>) =>
  inspectClientMessage({ id: 1, ...message }, allowed, 'real-token')

describe('entityIdsIn', () => {
  it('finds entity IDs anywhere in the config and ignores other strings', () => {
    const ids = entityIdsIn({
      wallpaper: ['#000', '#fff'],
      apps: [
        { groups: [{ name: 'Bed Room', icon: 'shield-check', lights: ['light.bedroom'] }] },
        { entities: { sensors: ['sensor.speed'] } },
      ],
    })
    expect([...ids].sort()).toEqual(['light.bedroom', 'sensor.speed'])
  })
})

describe('inspectClientMessage', () => {
  it('swaps in the real token', () => {
    expect(
      inspectClientMessage({ type: 'auth', access_token: 'kiosk-proxy' }, allowed, 'real-token'),
    ).toEqual({ forward: { type: 'auth', access_token: 'real-token' } })
  })

  it('limits entity subscriptions to the allowlist', () => {
    expect(inspect({ type: 'subscribe_entities' })).toEqual({
      forward: { id: 1, type: 'subscribe_entities', entity_ids: [...allowed] },
    })
  })

  it('forwards service calls on allowed entities', () => {
    const message = {
      type: 'call_service',
      domain: 'light',
      service: 'turn_on',
      target: { entity_id: ['light.bedroom'] },
    }
    expect(inspect(message)).toEqual({ forward: { id: 1, ...message } })
  })

  it('forwards WebRTC messages for cameras in the config', () => {
    const message = { type: 'camera/webrtc/offer', entity_id: 'camera.doorbell', offer: 'v=0' }
    expect(inspect(message)).toEqual({ forward: { id: 1, ...message } })
  })

  it.each([
    [{ type: 'camera/webrtc/offer', entity_id: 'camera.garage' }, 'camera.garage is not a camera'],
    [{ type: 'camera/webrtc/offer', entity_id: 'light.bedroom' }, 'light.bedroom is not a camera'],
    [{ type: 'camera/webrtc/candidate' }, 'undefined is not a camera'],
    [{ type: 'call_service', domain: 'homeassistant', service: 'restart' }, 'need an entity_id'],
    [
      { type: 'call_service', target: { entity_id: 'lock.front_door' } },
      'lock.front_door is not in',
    ],
    [{ type: 'call_service', service_data: { entity_id: 'lock.front_door' } }, 'lock.front_door'],
    [
      { type: 'call_service', target: { entity_id: 'light.bedroom', area_id: 'all' } },
      'Only entity_id',
    ],
    [{ type: 'get_states' }, 'get_states is not allowed'],
    [{ type: 'config/entity_registry/list' }, 'is not allowed'],
  ])('rejects %j', (message, reason) => {
    const verdict = inspect(message)
    expect(verdict).toHaveProperty('reject')
    expect((verdict as { reject: string }).reject).toContain(reason)
  })
})
