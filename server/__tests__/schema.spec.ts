// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { withEntityExamples } from '../schema.ts'

describe('withEntityExamples', () => {
  const schema = {
    properties: {
      lights: { type: 'array', items: { type: 'string', 'x-entity-domain': 'light' } },
      switch: { type: 'string', 'x-entity-domain': '*' },
      name: { type: 'string' },
    },
  }
  const ids = ['light.desk', 'light.hall', 'switch.fan']

  it('suggests the IDs of the right domain on every entity field', () => {
    const out = withEntityExamples(schema, ids) as typeof schema & Record<string, never>
    expect(out.properties.lights.items).toMatchObject({ examples: ['light.desk', 'light.hall'] })
    expect(out.properties.switch).toMatchObject({ examples: ids })
    expect(out.properties.name).not.toHaveProperty('examples')
    expect(schema.properties.switch).not.toHaveProperty('examples')
  })
})
