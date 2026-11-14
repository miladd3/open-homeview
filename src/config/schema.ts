import { z } from 'zod'

import { kioskYamlSchema } from './home'

/**
 * kiosk.yaml as a JSON Schema, for editor autocomplete and checks while typing.
 * Generated from the same Zod schema the kiosk validates with, so they never drift.
 * Written to kiosk.schema.json by `npm run schema`.
 */
export function kioskJsonSchema(): Record<string, unknown> {
  return {
    ...z.toJSONSchema(kioskYamlSchema, { io: 'input', unrepresentable: 'any' }),
    $id: 'https://raw.githubusercontent.com/miladd3/open-homeview/main/kiosk.schema.json',
    title: 'Open HomeView kiosk.yaml',
  }
}
