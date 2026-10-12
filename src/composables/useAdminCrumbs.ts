import { onScopeDispose, ref, toValue, watchEffect, type MaybeRefOrGetter } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

export interface AdminCrumb {
  label: string
  to?: RouteLocationRaw
}

/** Deeper breadcrumb items that the admin pages append after the section («Grandes Premios › Singapur»). */
export const adminExtraCrumbs = ref<AdminCrumb[]>([])

/** A page publishes its own crumbs (they can depend on loaded data) and removes them on leaving. */
export function useAdminCrumbs(crumbs: MaybeRefOrGetter<AdminCrumb[]>): void {
  watchEffect(() => {
    adminExtraCrumbs.value = toValue(crumbs)
  })
  onScopeDispose(() => {
    adminExtraCrumbs.value = []
  })
}
