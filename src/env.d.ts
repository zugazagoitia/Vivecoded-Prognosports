/// <reference types="vite/client" />

// Never put secrets in VITE_* variables: they are bundled into the client.
interface ImportMetaEnv {
  /** Origin of the PrognoSports API, e.g. https://api.prognosports.com, without the `/v2` prefix (the wrappers add it) (required). */
  readonly VITE_API_BASE_URL: string
  /** `true` starts the MSW service worker (src/mocks) so the app runs without the real API. */
  readonly VITE_API_MOCK?: string
  /** Short git SHA of the build (computed in vite.config.ts when not provided). */
  readonly VITE_GIT_SHA: string
  /** ISO date of the build commit (computed in vite.config.ts when not provided). */
  readonly VITE_GIT_DATE: string
  /** App version, from package.json unless overridden. */
  readonly VITE_APP_VERSION: string
  /** 'true' in PR previews (set by the previews job, T12): shows the flag panel and badge. */
  readonly VITE_PREVIEW?: string
  /** Feature flags (T6): 'true' turns one on; absent means off. See src/flags. */
  readonly VITE_FF_MY_SEASON?: string
  readonly VITE_FF_HONOURS?: string
  readonly VITE_FF_GAP?: string
  readonly VITE_FF_BUMP?: string
  readonly VITE_FF_TITLE_RACE?: string
  readonly VITE_FF_CONSISTENCY?: string
  readonly VITE_FF_HEAD_TO_HEAD?: string
  readonly VITE_FF_DISTRIBUTION?: string
  readonly VITE_FF_HEATMAP?: string
  readonly VITE_FF_HITS_BY_TYPE?: string
  readonly VITE_FF_POINTS_BY_SESSION?: string
  readonly VITE_FF_COMMUNITY_PERCENTILE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
