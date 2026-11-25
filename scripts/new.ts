// npm run new <app|face|theme> <name>
//
// Copies templates/<kind>/ to src/apps/<name>/ (or faces/, themes/), with the
// template's `example` renamed. The new folder works as is; see CONTRIBUTING.md.

import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const FOLDERS: Record<string, string> = { app: 'apps', face: 'faces', theme: 'themes' }

const [kind = '', name = ''] = process.argv.slice(2)
if (!FOLDERS[kind] || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('Usage: npm run new <app|face|theme> <name>, e.g. npm run new app garage-door')
  console.error('The name is lower case, with dashes: it is what kiosk.yaml will say.')
  process.exit(1)
}
const target = join('src', FOLDERS[kind], name)
if (existsSync(target)) {
  console.error(`${target} already exists`)
  process.exit(1)
}

// garage-door → GarageDoor, for file and type names.
const pascal = name.replace(/(^|-)(\w)/g, (_, _dash, letter: string) => letter.toUpperCase())
await mkdir(target)
for (const file of await readdir(join('templates', kind))) {
  const text = await readFile(join('templates', kind, file), 'utf8')
  const renamed = text.replaceAll('example', name).replaceAll('Example', pascal)
  await writeFile(join(target, file.replace('Example', pascal)), renamed)
}
console.info(`Made ${target}/. Next:
  - npm run schema, then use it in kiosk.yaml and look at it with npm run dev
  - add a preview.png (a screenshot of it); a test fails without one
  - share it: open a pull request, or build a pack with npm run build:addon ${target}`)
