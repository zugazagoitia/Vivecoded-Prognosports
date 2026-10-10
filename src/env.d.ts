/// <reference types="vite/client" />

// Never put secrets in VITE_* variables: they are bundled into the client.
interface ImportMetaEnv {
  /** Base URL of the PrognoSports API, e.g. https://api.prognosports.com/v2 (required). */
  readonly VITE_API_BASE_URL: string
  /** Short git SHA of the build (computed in vite.config.ts when not provided). */
  readonly VITE_GIT_SHA: string
  /** ISO date of the build commit (computed in vite.config.ts when not provided). */
  readonly VITE_GIT_DATE: string
  /** App version, from package.json unless overridden. */
  readonly VITE_APP_VERSION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
