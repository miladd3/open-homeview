import { describe, expect, it } from 'vitest'

import type { WidgetSize } from '@/kit/define'
import { packWidgets } from '../packWidgets'

const w = (...sizes: WidgetSize[]) => sizes.map((size, i) => ({ size, i }))
const spots = (pages: ReturnType<typeof packWidgets<{ size: WidgetSize; i: number }>>) =>
  pages.map((page) => page.map((p) => `${p.item.i}@${p.column},${p.row}`))

describe('packWidgets', () => {
  it('flows widgets in order into the first spot that fits', () => {
    // The example's page 1: clock, a 2x2 climate, then 1x1s and a 2x1.
    const page = w('1x1', '2x2', '1x1', '1x1', '1x1', '1x1', '1x1', '1x1', '2x1', '1x1', '1x1')
    expect(spots(packWidgets([page], 5, 3))).toEqual([
      [
        '0@1,1',
        '1@2,1',
        '2@4,1',
        '3@5,1',
        '4@1,2',
        '5@4,2',
        '6@5,2',
        '7@1,3',
        '8@2,3',
        '9@4,3',
        '10@5,3',
      ],
    ])
  })

  it('starts a new page when one is full, and for each page of kiosk.yaml', () => {
    expect(spots(packWidgets([w('2x2', '2x2', '1x1'), w('1x1')], 4, 2))).toEqual([
      ['0@1,1', '1@3,1'],
      ['2@1,1'],
      ['0@1,1'],
    ])
  })

  it('clamps a widget wider than the grid', () => {
    expect(packWidgets([w('4x2')], 3, 3)[0]![0]).toMatchObject({ width: 3, height: 2 })
  })
})
