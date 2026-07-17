/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Overrides the API the frontend talks to. See .env.example. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
