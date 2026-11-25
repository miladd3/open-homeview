import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default defineConfig((env) =>
  mergeConfig(viteConfig(env), {
    // A runtime pack imports the kit by these names (tests load built packs).
    resolve: {
      alias: {
        '@open-homeview/kit/define': fileURLToPath(new URL('./src/kit/define.ts', import.meta.url)),
        '@open-homeview/kit': fileURLToPath(new URL('./src/kit/index.ts', import.meta.url)),
      },
    },
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
