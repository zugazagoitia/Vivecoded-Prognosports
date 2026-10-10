import { createApp } from 'vue'
import { isPreviewEnv } from './index'

/** Mounts the reviewer panel. Dead code in production builds (MODE is statically replaced). */
export async function mountFlagPanel(): Promise<void> {
  if (import.meta.env.MODE === 'production' || !isPreviewEnv()) return
  const { default: FlagPanel } = await import('./FlagPanel.vue')
  const host = document.createElement('div')
  document.body.append(host)
  createApp(FlagPanel).mount(host)
}
