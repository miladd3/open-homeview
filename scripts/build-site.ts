// npm run build:site
//
// Builds the project site for GitHub Pages into _site/: the landing page from
// site/ at the root, and the live demo (the kiosk against the mock, see
// src/demo.ts) in _site/demo/. SITE_BASE is the path the site is served from:
// /<repo>/ on GitHub Pages (the default, /open-homeview/), / on a custom domain.

import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { build } from 'vite'

const ROOT = process.cwd()
const OUT = join(ROOT, '_site')
const base = process.env.SITE_BASE ?? '/open-homeview/'

await rm(OUT, { recursive: true, force: true })

await build({
  root: ROOT,
  mode: 'demo',
  base: `${base}demo/`,
  build: { outDir: join(OUT, 'demo'), emptyOutDir: true },
  logLevel: 'warn',
})

// The landing page: everything in site/ but the demo's config (built in above).
for (const name of await readdir(join(ROOT, 'site')))
  if (name !== 'kiosk.demo.yaml')
    await cp(join(ROOT, 'site', name), join(OUT, name), { recursive: true })

// Previews for the gallery, as img/<kind>-<name>.png.
await mkdir(join(OUT, 'img'), { recursive: true })
for (const kind of ['themes', 'faces'])
  for (const name of await readdir(join(ROOT, 'src', kind)))
    if (!name.startsWith('_'))
      await cp(
        join(ROOT, 'src', kind, name, 'preview.png'),
        join(OUT, 'img', `${kind}-${name}.png`),
      ).catch(() => {})

console.log(`Site built in _site/ for ${base} (demo at ${base}demo/)`)
