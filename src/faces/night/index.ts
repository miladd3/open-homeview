import { defineFace } from '@/kit/define'

/** Dim red digits on black, for night hours. */
export default defineFace({
  id: 'night',
  name: 'Night',
  description: 'Dim red digits on black, for night hours.',
  screen: () => import('./NightFace.vue'),
})
