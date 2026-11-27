/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'true' when `npm run dev` has no HA_URL/HA_TOKEN and runs against the mock. */
  readonly VITE_HA_MOCK: string
  /** 'true' in the public demo build (`npm run build:site`, see src/demo.ts). */
  readonly VITE_DEMO: string
}
