// Serves kiosk.schema.json for editor autocomplete. With SCHEMA_ENTITIES=true it
// also lists this home's entity IDs as suggestions on every entity field, so
// typing `lights:` offers your light.* entities. Off by default: the list of
// entity names is then readable by anyone on the network.

import { readFile } from 'node:fs/promises'

const CACHE_MS = 60_000

type Json = Record<string, unknown>

/**
 * A copy of `schema` where every entity field (marked `x-entity-domain` by the
 * config schema) suggests the matching IDs from `entityIds` as `examples`.
 */
export function withEntityExamples(schema: unknown, entityIds: string[]): unknown {
  if (Array.isArray(schema)) return schema.map((item) => withEntityExamples(item, entityIds))
  if (!schema || typeof schema !== 'object') return schema
  const out: Json = {}
  for (const [key, value] of Object.entries(schema)) out[key] = withEntityExamples(value, entityIds)
  const domain = (schema as Json)['x-entity-domain']
  if (typeof domain === 'string') {
    const ids = domain === '*' ? entityIds : entityIds.filter((id) => id.startsWith(`${domain}.`))
    if (ids.length) out.examples = ids
  }
  return out
}

export function createSchemaHandler(options: {
  schemaPath: string
  /** Fill in entity IDs from Home Assistant (needs haUrl + token). */
  withEntities: boolean
  haUrl: string
  token: string
}) {
  let cached: { at: number; body: string } | null = null

  async function entityIds(): Promise<string[]> {
    const response = await fetch(`${options.haUrl.replace(/\/$/, '')}/api/states`, {
      headers: { authorization: `Bearer ${options.token}` },
      signal: AbortSignal.timeout(5_000),
    })
    if (!response.ok) throw new Error(`Home Assistant returned HTTP ${response.status}`)
    const states = (await response.json()) as { entity_id: string }[]
    return states.map((state) => state.entity_id).sort()
  }

  /** The schema as JSON text. Falls back to the plain schema if HA can't be reached. */
  return async function schemaBody(): Promise<string> {
    const schema = JSON.parse(await readFile(options.schemaPath, 'utf8')) as unknown
    if (!options.withEntities) return JSON.stringify(schema)
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.body
    try {
      const body = JSON.stringify(withEntityExamples(schema, await entityIds()))
      cached = { at: Date.now(), body }
      return body
    } catch (error) {
      console.error('[server] cannot list entities for the schema:', (error as Error).message)
      return JSON.stringify(schema)
    }
  }
}
