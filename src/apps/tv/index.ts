import { onOffStatus } from '@/kit'
import { type AppOf, defineAppType, entity, mockEntity, optional } from '@/kit/define'

/** A TV remote: power, volume, and a d-pad when there is a remote entity. */
export const tv = defineAppType({
  type: 'tv',
  description: 'A TV remote.',
  entities: {
    player: entity('media_player'),
    remote: optional(entity('remote')),
  },
  screen: () => import('./TvPanel.vue'),
  status: (app) => onOffStatus(app.entities.player),
  mock: ({ name, entities: e }) => [
    mockEntity(e.player, 'off', {
      friendly_name: name,
      volume_level: 0.25,
      is_volume_muted: false,
    }),
    ...(e.remote ? [mockEntity(e.remote, 'off', { friendly_name: name })] : []),
  ],
})

export type TvApp = AppOf<typeof tv>
