// Small Zod building blocks shared by kiosk.yaml's schema (home.ts) and the app
// types (src/apps). They add friendly error messages and editor hover help.

import { z } from 'zod'

import { type IconName, icons } from './icons'

export type Gradient = [string, string]

export const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/
const ICON_NAMES = Object.keys(icons) as [IconName, ...IconName[]]

// ---- did you mean ----

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]!
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]!
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1))
      previous = current
    }
  }
  return row[b.length]!
}

/** ` Did you mean "scenes"?` when one of `options` is close to `word`, else ''. */
export function didYouMean(word: unknown, options: readonly string[]): string {
  if (typeof word !== 'string') return ''
  const lower = word.toLowerCase()
  let best: string | undefined
  let bestDistance = Math.max(2, Math.floor(lower.length / 3)) + 1
  for (const option of options) {
    const d = option.toLowerCase().startsWith(lower) ? 1 : distance(lower, option.toLowerCase())
    if (d < bestDistance) [best, bestDistance] = [option, d]
  }
  return best ? ` Did you mean "${best}"?` : ''
}

// ---- building blocks ----

/** An object that rejects unknown keys, naming the closest known one. */
export function object<Shape extends z.ZodRawShape>(shape: Shape) {
  const keys = Object.keys(shape)
  return z.strictObject(shape, {
    error: (issue) =>
      issue.code === 'unrecognized_keys'
        ? issue.keys.map((key) => `.${key} is not a known key.${didYouMean(key, keys)}`).join('\n')
        : undefined,
  })
}

/** Optional key; YAML `key:` with no value (null) counts as not set. */
export function optional<T extends z.ZodType>(schema: T) {
  return schema.nullish().transform((value) => value ?? undefined)
}

/** Optional list; a missing or empty (null) list is []. */
export function list<T extends z.ZodType>(item: T) {
  return z
    .array(item)
    .nullish()
    .transform((value) => value ?? [])
}

export const text = z.string().trim().min(1, 'must not be empty')

/** A Home Assistant entity ID, optionally of one domain (`entity('camera')`). */
export function entity(domain?: string, description?: string) {
  const pattern = domain ? new RegExp(`^${domain}\\.[a-z0-9_]+$`) : ENTITY_ID
  return z
    .string()
    .regex(pattern, {
      error: (issue) =>
        domain && ENTITY_ID.test(String(issue.input))
          ? `"${String(issue.input)}" must be a ${domain}.* entity`
          : `"${String(issue.input)}" is not a valid entity ID (like ${domain ?? 'light'}.kitchen)`,
    })
    .meta({
      // Lets the server fill in this home's entity IDs as suggestions (see server/schema.ts).
      'x-entity-domain': domain ?? '*',
      description:
        description ??
        (domain
          ? `A ${domain}.* entity ID from Home Assistant.`
          : 'An entity ID from Home Assistant.'),
    })
}

export function icon(fallback: IconName) {
  return z
    .enum(ICON_NAMES, {
      error: (issue) =>
        `"${String(issue.input)}" is not a known icon.${didYouMean(issue.input, ICON_NAMES)}`,
    })
    .default(fallback)
    .meta({ description: 'Icon name (Lucide). The full list is in src/config/icons.ts.' })
}

const color = text.meta({ description: 'Any CSS color, e.g. "#ff9f0a".' })

export function gradient(fallback: Gradient) {
  return z
    .tuple([color, color], { error: 'must be two colors: [from, to]' })
    .default(fallback)
    .meta({ description: 'Two colors for a gradient: [from, to].' })
}

export const seconds = (fallback: number, description: string) =>
  z.number().positive().default(fallback).meta({ description })

export const lightList = z
  .array(entity('light'), { error: 'must be a list of light.* entities' })
  .min(1, 'needs at least one light')
