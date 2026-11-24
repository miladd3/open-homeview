import { type FaceOptionsOf, defineFace, z } from '@/kit/define'

/** Six widgets on a tinted background, to work the home from standby. */
const homeModular = defineFace({
  id: 'home-modular',
  name: 'Home modular',
  description: 'Six widgets in two rows on a tinted background, to work the home from standby.',
  screen: () => import('./HomeModularFace.vue'),
  options: {
    color: z
      .string()
      .default('#5e5ce6')
      .meta({ description: 'The background tint, e.g. "#5e5ce6".' }),
  },
  slots: {
    top1: { sizes: ['1x1'] },
    top2: { sizes: ['1x1'] },
    top3: { sizes: ['1x1'] },
    bottom1: { sizes: ['1x1'] },
    bottom2: { sizes: ['1x1'] },
    bottom3: { sizes: ['1x1'] },
  },
})

export default homeModular
export type HomeModularOptions = FaceOptionsOf<typeof homeModular>
