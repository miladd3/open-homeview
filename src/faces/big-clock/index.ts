import { defineFace } from '@/kit/define'

/** The time and date, big, with one widget under them (the weather by default). */
export default defineFace({
  id: 'big-clock',
  name: 'Big clock',
  description: 'The time and date, big, with one widget under them.',
  screen: () => import('./BigClockFace.vue'),
  slots: { bottom: { sizes: ['2x1'] } },
})
