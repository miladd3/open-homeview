import { type FaceOptionsOf, defineFace, z } from '@/kit/define'

/** The date and time on the left, three widgets on the right. */
const modular = defineFace({
  id: 'modular',
  name: 'Modular',
  description: 'The date and time on the left, three widgets on the right.',
  screen: () => import('./ModularFace.vue'),
  options: {
    color: z
      .string()
      .default('#ff9f0a')
      .meta({ description: 'Color of the date, e.g. "#7aa7ff".' }),
  },
  slots: {
    right1: { sizes: ['1x1'] },
    right2: { sizes: ['1x1'] },
    right3: { sizes: ['1x1'] },
  },
})

export default modular
export type ModularOptions = FaceOptionsOf<typeof modular>
