import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { isEnabled } from '@/flags'
import { switchPath, type FlagCheck } from './rankNav'

/**
 * Router glue for RankNav: reads `/ranking/:comunidad/:temporada/:seccion/:vista` and builds
 * the navigation that keeps the open view when community or season change.
 */
export function useRankNav(isOn: FlagCheck = isEnabled) {
  const route = useRoute()
  const router = useRouter()
  const param = (k: string) => {
    const v = (route.params as Record<string, string | string[] | undefined>)[k]
    return Array.isArray(v) ? v[0] : v
  }
  const ctx = computed(() => ({
    comunidad: param('comunidad') ?? '',
    temporada: param('temporada') ?? '',
  }))
  const seccion = computed(() => param('seccion'))
  const vista = computed(() => param('vista'))

  function go(change: { comunidad?: string | number; temporada?: string | number }) {
    return router.push(switchPath(ctx.value, change, seccion.value, vista.value, isOn))
  }
  return {
    seccion,
    vista,
    ctx,
    changeCommunity: (id: string | number) => go({ comunidad: id }),
    changeSeason: (id: string | number) => go({ temporada: id }),
    navigate: (path: string) => router.push(path),
  }
}
