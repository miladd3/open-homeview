// Runtime packs: app types, faces and themes built with `npm run build:addon`,
// copied to /config/addons/<name>/ and listed in kiosk.yaml's `addons:`. They are
// added to the same lists as the built-in folders.
//
// This runs before src/config/home.ts loads (main.ts imports the rest of the
// kiosk after it), because kiosk.yaml's schema is built from those lists. A pack
// imports `vue`, `zod` and `@open-homeview/kit(/define)`, which the import map in
// index.html points at the kiosk's own copies (see vite.config.ts).
//
// A pack that can't load is skipped with a warning; the kiosk keeps running.

import { appTypes } from '@/apps'
import { faceTypes } from '@/faces'
import { KIT_VERSION } from '@/kit/version'
import { themeTypes } from '@/themes'

/** A pack's addon.json (see `npm run build:addon`), or why the server couldn't read it. */
export type AddonManifest =
  | { name: string; kind: 'app' | 'face' | 'theme'; version: string; kit: number; files: string[] }
  | { name: string; error: string }

const lists = { app: appTypes, face: faceTypes, theme: themeTypes } as const
const KIT_MAJOR = Number(KIT_VERSION.split('.')[0])

/**
 * Checks a pack and adds what its index.js exports to its list. `load` imports
 * the index.js. Throws the reason it was skipped.
 */
export async function registerAddon(
  manifest: AddonManifest,
  load: () => Promise<{ default?: unknown }>,
): Promise<void> {
  if ('error' in manifest) throw new Error(manifest.error)
  const { name, kind, kit } = manifest
  if (kit !== KIT_MAJOR)
    throw new Error(`it was built for kit ${kit}, this kiosk has kit ${KIT_MAJOR}. Rebuild it.`)
  const list: { type?: string; id?: string }[] = lists[kind]
  if (!list) throw new Error(`"${String(kind)}" is not a kind of pack`)
  const definition = (await load()).default as { type?: string; id?: string } | undefined
  const id = definition?.type ?? definition?.id
  if (id !== name) throw new Error(`its ${kind} is called "${String(id)}", not "${name}"`)
  if (list.some((item) => (item.type ?? item.id) === id))
    throw new Error(`a built-in ${kind} is already called "${id}"; using the built-in`)
  list.push(definition!)
}

/** Loads every pack kiosk.yaml lists. Returns the warnings for the ones it skipped. */
export async function loadAddons(): Promise<string[]> {
  const base = import.meta.env.BASE_URL
  const response = await fetch(`${base}kiosk/addons`, { cache: 'no-store' }).catch(() => undefined)
  if (!response?.ok) return []
  const manifests = (await response.json()) as AddonManifest[]
  const warnings: string[] = []
  await Promise.all(
    manifests.map(async (manifest) => {
      const folder = `${base}addons/${manifest.name}/`
      try {
        await registerAddon(manifest, () => import(/* @vite-ignore */ `${folder}index.js`))
        if (!('error' in manifest) && manifest.files.includes('style.css')) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = `${folder}style.css`
          document.head.append(link)
        }
      } catch (error) {
        const warning = `addon ${manifest.name} is skipped: ${(error as Error).message}`
        console.warn(`[addons] ${warning}`)
        warnings.push(warning)
      }
    }),
  )
  return warnings
}
