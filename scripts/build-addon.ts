// npm run build:addon <folder> [version]
//
// Builds an app type, face or theme folder into a runtime pack in
// dist-addon/<name>/: addon.json, index.js, chunks/ (its lazy screens and
// widgets), style.css and preview.png. Copy that folder to /config/addons/ on the
// server and list it in kiosk.yaml's `addons:`. See CONTRIBUTING.md.
//
// `vue`, `zod` and the kit are not bundled: the kiosk provides them (an import
// map in index.html), so a pack shares the kiosk's Vue and Home Assistant state.

import { copyFile, readdir, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'

import vue from '@vitejs/plugin-vue'
import { build, type Plugin, runnerImport } from 'vite'

import { KIT_VERSION } from '../src/kit/version.ts'

// The repo (npm runs scripts there).
const ROOT = process.cwd()
const EXTERNAL = ['vue', 'zod', '@open-homeview/kit', '@open-homeview/kit/define']
const ENTRY = 'virtual:addon-entry'
// A theme's CSS, in the order the kiosk loads its built-in themes' (ThemeHost.ts).
const THEME_FILES = ['tokens.scss', 'lite.scss', 'material.scss']

interface Definition {
  type?: string
  id?: string
  modes?: unknown
  description: string
}

/** The pack's entry: the folder's index.ts, plus a theme's stylesheets. */
function entry(folder: string, styles: string[]): Plugin {
  return {
    name: 'addon-entry',
    enforce: 'pre',
    // Lib mode passes the entry as a path under the root.
    resolveId: (id) => (id.endsWith(ENTRY) ? `\0${ENTRY}` : undefined),
    load: (id) =>
      id === `\0${ENTRY}`
        ? [
            `export { default } from ${JSON.stringify(join(folder, 'index.ts'))}`,
            ...styles.map((file) => `import ${JSON.stringify(join(folder, file))}`),
          ].join('\n')
        : undefined,
  }
}

export async function buildAddon(
  folder: string,
  { outRoot = join(ROOT, 'dist-addon'), version = '0.0.0' } = {},
): Promise<string> {
  folder = resolve(folder)
  const name = basename(folder)
  const outDir = join(outRoot, name)

  // What the folder holds, from its index.ts. Only its description and kind are
  // needed, so .vue files (the kit's too) load as empty stubs.
  const noUi: Plugin = {
    name: 'no-ui',
    enforce: 'pre',
    load: (id) => (/\.vue($|\?)/.test(id) ? 'export default {}' : undefined),
  }
  const { module } = await runnerImport<{ default: Definition }>(join(folder, 'index.ts'), {
    configFile: false,
    logLevel: 'warn',
    plugins: [noUi],
    resolve: { alias: { '@': join(ROOT, 'src') } },
  })
  const definition = module.default
  const kind = definition.type ? 'app' : definition.modes ? 'theme' : 'face'
  if ((definition.type ?? definition.id) !== name)
    throw new Error(`${name}/index.ts must define "${name}", like its folder`)

  const present = await readdir(folder)
  await build({
    configFile: false,
    logLevel: 'warn',
    publicDir: false,
    plugins: [
      vue(),
      entry(
        folder,
        THEME_FILES.filter((file) => present.includes(file)),
      ),
    ],
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    resolve: {
      // From this repo's node_modules, wherever the folder is.
      dedupe: ['@lucide/vue'],
      alias: [
        { find: /^@\/kit$/, replacement: '@open-homeview/kit' },
        { find: /^@\/kit\/define$/, replacement: '@open-homeview/kit/define' },
      ],
    },
    build: {
      outDir,
      emptyOutDir: true,
      cssCodeSplit: false,
      lib: { entry: ENTRY, formats: ['es'], fileName: () => 'index.js', cssFileName: 'style' },
      rollupOptions: {
        external: EXTERNAL,
        output: { chunkFileNames: 'chunks/[name]-[hash].js' },
      },
    },
  })
  if (present.includes('preview.png'))
    await copyFile(join(folder, 'preview.png'), join(outDir, 'preview.png'))

  const files = (await readdir(outDir, { withFileTypes: true })).map((file) =>
    file.isDirectory() ? `${file.name}/` : file.name,
  )
  const manifest = {
    name,
    kind,
    version,
    kit: Number(KIT_VERSION.split('.')[0]),
    description: definition.description,
    files: files.sort(),
  }
  await writeFile(join(outDir, 'addon.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return outDir
}

if (process.argv[1]?.endsWith('build-addon.ts')) {
  const [folder, version] = process.argv.slice(2)
  if (!folder) {
    console.error('Usage: npm run build:addon <folder> [version], e.g. src/apps/switch 1.0.0')
    process.exit(1)
  }
  console.info(`Built ${await buildAddon(folder, { version })}`)
}
