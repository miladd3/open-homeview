import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { mountApp } from '@/__tests__/mountApp'
import { loadAllParts, testConfig } from '@/__tests__/testConfig'
import type { FaceEntry } from '@/config/home'
import { useEntitiesStore } from '@/stores/entities'
import { useKioskStore } from '@/stores/kiosk'
import { faceTypes } from '..'

const DAY = new Date(2026, 10, 24, 14, 5)
const NIGHT = new Date(2026, 10, 24, 23, 41)
enableAutoUnmount(afterEach)

const examples = [...testConfig.standby.faces, testConfig.standby.night.face]

/** The kiosk in standby at `time`, showing only `face` (by day and by night). */
async function standbyWith(face: FaceEntry, time: Date) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(time)
  const standby = {
    ...testConfig.standby,
    faces: [face],
    night: { ...testConfig.standby.night, face },
  }
  const wrapper = await mountApp({ ...testConfig, standby })
  useKioskStore().sleep()
  await flushPromises()
  return wrapper.find('.standby-host')
}

describe('faces', () => {
  beforeAll(loadAllParts)
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.useRealTimers())

  it('every folder has a face of its own name', () => {
    const modules = import.meta.glob<{ id: string }>('../*/index.ts', {
      eager: true,
      import: 'default',
    })
    for (const [path, face] of Object.entries(modules)) expect(path).toBe(`../${face.id}/index.ts`)
  })

  it('the example config uses every face, so the checks below cover them all', () => {
    expect(new Set(examples.map((entry) => entry.face))).toEqual(
      new Set(faceTypes.map((face) => face.id)),
    )
  })

  it.each(faceTypes.flatMap(({ id }) => [`${id} by day`, `${id} by night`]))(
    'renders %s, with its slots filled',
    async (name) => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
      const entry = examples.find((item) => name.startsWith(`${item.face} `))!
      const night = name.endsWith('night')
      const host = await standbyWith(entry, night ? NIGHT : DAY)
      expect(host.classes('-night')).toBe(night)
      expect(host.text()).toContain(night ? '23:41' : '14:05')
      expect(host.findAll('.widget-cell')).toHaveLength(Object.keys(entry.slots).length)
      expect(host.find('.widget-cell .error').exists()).toBe(false)
      expect(errors).not.toHaveBeenCalled()
    },
  )
})

describe('standby', () => {
  beforeAll(loadAllParts)
  beforeEach(() => setActivePinia(createPinia()))
  afterEach(() => vi.useRealTimers())

  it('starts after afterSeconds without a touch, and shows the faces to swipe through', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.setSystemTime(DAY)
    const wrapper = await mountApp()
    vi.advanceTimersByTime(testConfig.standby.afterMs - 1)
    expect(useKioskStore().standby).toBe(false)
    vi.advanceTimersByTime(1)
    await flushPromises()
    expect(wrapper.findAll('.standby-host > .page')).toHaveLength(3)
    expect(wrapper.find('.modular-face').exists()).toBe(true)
  })

  it('at night shows only the night face', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NIGHT)
    const wrapper = await mountApp()
    useKioskStore().sleep()
    await flushPromises()
    expect(wrapper.findAll('.standby-host > .page')).toHaveLength(1)
    expect(wrapper.find('.night-face').exists()).toBe(true)
  })

  it('wakes on a tap, but a tap on a slot widget does its action', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(DAY)
    const wrapper = await mountApp()
    const kiosk = useKioskStore()
    kiosk.sleep()
    await flushPromises()

    // home-modular's top2 is the Living Room group: its icon toggles it.
    const group = wrapper.find('.home-modular-face .widget-cell .toggle')
    const before = useEntitiesStore().get('light.living_room_ceiling')?.state
    await group.trigger('click')
    expect(useEntitiesStore().get('light.living_room_ceiling')?.state).not.toBe(before)
    expect(kiosk.standby).toBe(true)

    await wrapper.find('.modular-face').trigger('click')
    expect(kiosk.standby).toBe(false)
  })

  it('a slot widget that opens its app wakes to it', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(DAY)
    const wrapper = await mountApp()
    const kiosk = useKioskStore()
    kiosk.sleep()
    await flushPromises()
    // modular's right3 is the whole-home Lights widget: a tap opens Lights.
    await wrapper.findAll('.modular-face .widget-cell .kit-widget')[2]!.trigger('click')
    await flushPromises()
    expect(kiosk.standby).toBe(false)
    expect(kiosk.activeAppId).toBe('lights')
  })
})
