import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import source from '../../../../kiosk.example.yaml?raw'
import { mountApp } from '@/__tests__/mountApp'
import { loadAllParts, testConfig } from '@/__tests__/testConfig'
import { useConfigStore } from '@/stores/config'
import WidgetCell from '../WidgetCell.vue'

enableAutoUnmount(afterEach)

/** Answers the kiosk's own routes; records what was sent. */
function fakeServer(pin?: string) {
  const calls: { method: string; url: string; pin?: string; body?: unknown }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const headers = (init.headers ?? {}) as Record<string, string>
      const call = {
        method: init.method ?? 'GET',
        url,
        pin: headers['x-kiosk-edit-pin'],
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      }
      calls.push(call)
      if (url.endsWith('/config/kiosk.yaml')) return new Response(source)
      if (call.method === 'GET') return new Response(null, { status: 404 })
      if (pin && call.pin !== pin) return new Response('Wrong PIN', { status: 403 })
      return new Response(null, { status: 204 })
    }),
  )
  return calls
}

async function longPress(wrapper: Awaited<ReturnType<typeof mountApp>>) {
  // The clock has no quick control, so a long-press on it enters edit mode.
  wrapper.findComponent(WidgetCell).vm.$emit('longpress')
  await flushPromises()
}

describe('editing the dashboard', () => {
  beforeAll(loadAllParts)
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.unstubAllGlobals())

  it('removes, resizes and adds widgets, and saves only the dashboard', async () => {
    const calls = fakeServer()
    const wrapper = await mountApp()
    await longPress(wrapper)
    expect(wrapper.find('.edit-bar').exists()).toBe(true)

    // – on the clock, then the climate (2x2) cycles to 1x1.
    await wrapper.find('.slot .remove').trigger('click')
    await wrapper.find('[aria-label="Size 2x2"]').trigger('click')
    await wrapper.find('.edit-bar .pill:not(.-done)').trigger('click')
    await flushPromises()
    const kitchen = wrapper.find('[aria-label="Add Kitchen"]')
    expect(kitchen.exists()).toBe(true)
    await kitchen.trigger('click')
    await wrapper.find('.edit-bar .-done').trigger('click')
    await flushPromises()

    const saved = calls.find((call) => call.method === 'PUT')!
    expect(saved.url).toBe('/kiosk/layout')
    const [first, ...rest] = (saved.body as { dashboard: unknown[][] }).dashboard
    expect(first![0]).toEqual({
      type: 'climate',
      entity: 'climate.living_room',
      name: 'Living Room',
      size: '1x1',
    })
    expect(first).toContainEqual({ type: 'light', entity: 'light.kitchen' })
    expect(first).not.toContain('clock')
    expect(rest.length).toBeGreaterThan(0)
    expect(wrapper.find('.edit-bar').exists()).toBe(false)
  })

  it('Done without changes saves nothing', async () => {
    const calls = fakeServer()
    const wrapper = await mountApp()
    await longPress(wrapper)
    await wrapper.find('.edit-bar .-done').trigger('click')
    await flushPromises()
    expect(calls.filter((call) => call.method !== 'GET')).toEqual([])
    expect(wrapper.find('.edit-bar').exists()).toBe(false)
  })

  it('asks for the PIN, checks it with the server and sends it with the save', async () => {
    const calls = fakeServer('42')
    const wrapper = await mountApp()
    useConfigStore().pinSet = true
    await longPress(wrapper)
    expect(wrapper.find('.edit-bar').exists()).toBe(false)

    const key = (label: string) =>
      wrapper
        .findAll('.pin-pad .key')
        .find((button) => button.text() === label)!
        .trigger('click')
    await key('1')
    await key('OK')
    await flushPromises()
    expect(wrapper.find('.pin-pad .dots').text()).toBe('Wrong PIN')

    await key('4')
    await key('2')
    await key('OK')
    await flushPromises()
    expect(wrapper.find('.edit-bar').exists()).toBe(true)

    await wrapper.find('.slot .remove').trigger('click')
    await wrapper.find('.edit-bar .-done').trigger('click')
    await flushPromises()
    expect(calls.find((call) => call.method === 'PUT')?.pin).toBe('42')
  })

  it('shows why a save failed and stays in edit mode', async () => {
    vi.stubGlobal(
      'fetch',
      async () => new Response('light.x is not in kiosk.yaml', { status: 400 }),
    )
    const wrapper = await mountApp()
    await longPress(wrapper)
    await wrapper.find('.slot .remove').trigger('click')
    await wrapper.find('.edit-bar .-done').trigger('click')
    await flushPromises()
    expect(wrapper.find('.edit-bar .problem').text()).toBe(
      'Not saved: light.x is not in kiosk.yaml',
    )
  })

  it('the example config offers a widget for each of its entities', () => {
    expect(testConfig.gallery.map((widget) => widget.app.name)).toEqual(
      expect.arrayContaining(['Kitchen', 'Bedroom read', 'Indoor temperature']),
    )
  })
})
