// Every standby face. `face:` in kiosk.yaml's `standby:` picks one.
//
// To add a face: make a folder next to these (`npm run new face <id>`) with an
// index.ts that does `export default defineFace(...)`. The folder name is the
// face id. It is found on its own, no list to update. Runtime packs are added to
// the same list (src/addons.ts).

import type { Component } from 'vue'
import type { z } from 'zod'

import { lazy } from '@/apps'
import type { FaceSpec } from '@/kit/define'

/** Every face: the folders next to this file, then the packs kiosk.yaml lists. */
export const faceTypes = Object.values(
  import.meta.glob<FaceSpec<z.ZodRawShape>>('./*/index.ts', { eager: true, import: 'default' }),
)

/** The face component, loaded the first time it shows. */
export function faceScreenOf(id: string): Component {
  return lazy(`face:${id}`, faceTypes.find((face) => face.id === id)!.screen)
}
