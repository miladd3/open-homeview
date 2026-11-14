// @vitest-environment node
import { readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { kioskJsonSchema } from '../schema'

const FILE = new URL('../../../kiosk.schema.json', import.meta.url)
const generated = `${JSON.stringify(kioskJsonSchema(), null, 2)}\n`

describe('kiosk.schema.json', () => {
  it('matches the config schema (run `npm run schema` after changing it)', () => {
    if (process.env.UPDATE_SCHEMA) writeFileSync(FILE, generated)
    expect(readFileSync(FILE, 'utf8')).toBe(generated)
  })

  it('marks entity fields with their domain, for the server to fill in', () => {
    expect(generated).toContain('"x-entity-domain": "light"')
  })
})
