<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PIcon from './PIcon.vue'
import { focusRing } from './styles'

const props = withDefaults(defineProps<{ total: number; perPage: number; siblings?: number }>(), {
  siblings: 1,
})
const page = defineModel<number>({ default: 1 })
const { t } = useI18n()
const ellipsis = '…'

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)))
const from = computed(() => (props.total === 0 ? 0 : (page.value - 1) * props.perPage + 1))
const to = computed(() => Math.min(props.total, page.value * props.perPage))

/** Page numbers with `null` as an ellipsis. */
const items = computed<(number | null)[]>(() => {
  const n = pageCount.value
  const s = props.siblings
  const set = new Set<number>([1, n])
  for (let i = page.value - s; i <= page.value + s; i++) if (i >= 1 && i <= n) set.add(i)
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | null)[] = []
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1]
    if (prev !== undefined && p - prev > 1) out.push(null)
    out.push(p)
  })
  return out
})

function go(p: number) {
  page.value = Math.min(pageCount.value, Math.max(1, p))
}

const btn = [
  'border-border-input bg-surface text-body hover:bg-surface-muted inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border px-2.5 text-sm md:min-h-9 md:min-w-9',
  'disabled:cursor-not-allowed disabled:opacity-50',
  focusRing,
]
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <p class="text-muted text-sm">{{ t('showing', { from, to, total }) }}</p>
    <nav :aria-label="t('ui.pagination.label')">
      <ul class="flex items-center gap-1">
        <li>
          <button
            type="button"
            :class="btn"
            :aria-label="t('ui.pagination.prev')"
            :disabled="page <= 1"
            @click="go(page - 1)"
          >
            <PIcon name="chevron-left" :size="16" />
          </button>
        </li>
        <li v-for="(p, i) in items" :key="p ?? `gap-${i}`">
          <span v-if="p === null" class="text-muted px-1" aria-hidden="true">{{ ellipsis }}</span>
          <button
            v-else
            type="button"
            :class="[
              btn,
              'tabular-nums',
              p === page ? 'bg-primary! text-on-primary! border-transparent font-semibold' : '',
            ]"
            :aria-label="t('ui.pagination.page', { n: p })"
            :aria-current="p === page ? 'page' : undefined"
            @click="go(p)"
          >
            {{ p }}
          </button>
        </li>
        <li>
          <button
            type="button"
            :class="btn"
            :aria-label="t('ui.pagination.next')"
            :disabled="page >= pageCount"
            @click="go(page + 1)"
          >
            <PIcon name="chevron-right" :size="16" />
          </button>
        </li>
      </ul>
    </nav>
  </div>
</template>
