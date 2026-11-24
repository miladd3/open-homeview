import { type AppOf, defineAppType } from '@/kit/define'

/** The time and date. Write just `clock` on the dashboard. */
const clock = defineAppType({
  type: 'clock',
  description: 'The time and date.',
  icon: 'clock',
  entities: {},
  widget: {
    widgetScreen: () => import('./ClockWidget.vue'),
    sizes: ['1x1', '2x1'],
    complication: true,
  },
  mock: () => [],
})

export default clock
export type ClockApp = AppOf<typeof clock>
