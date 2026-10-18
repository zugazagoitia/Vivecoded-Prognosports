import { defineAsyncComponent } from 'vue'

/** TeamBadge loaded on demand, so its styles and code stay out of the eager bundle (issue 223). */
export const LazyTeamBadge = defineAsyncComponent(() => import('./TeamBadge.vue'))
