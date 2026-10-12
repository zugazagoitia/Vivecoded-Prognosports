<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import FaqAccordion from '@/components/faq/FaqAccordion.vue'
import FaqContact from '@/components/faq/FaqContact.vue'
import EmptyState from '@/components/states/EmptyState.vue'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import Chip from '@/components/ui/Chip.vue'
import PInput from '@/components/ui/PInput.vue'
import { FAQ_CATEGORIES, FAQ_ITEMS, filterFaq } from '@/content/faq'
import { useSessionStore } from '@/stores/session'

definePage({
  meta: {
    layout: 'app',
    title: 'route.faq',
  },
})

const { t } = useI18n()
const route = useRoute()
const session = useSessionStore()

function queryString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}
function queryCat(v: unknown): number {
  const n = Number(queryString(v))
  return Number.isInteger(n) && n > 0 && n < FAQ_CATEGORIES.length ? n : 0
}

const NONE = '-1' // no item open (an id never matches)
const q = ref(queryString(route.query.q))
const cat = ref(queryCat(route.query.cat))

const itemId = (item: (typeof FAQ_ITEMS)[number]) => `faq-${FAQ_ITEMS.indexOf(item) + 1}`
const items = computed(() => filterFaq(FAQ_ITEMS, q.value, cat.value))
const ids = computed(() => items.value.map(itemId))

// The first visible question starts open; typing or changing category closes everything.
const open = ref(ids.value[0] ?? NONE)
watch([q, cat], () => {
  open.value = NONE
  const query: Record<string, string> = {}
  if (q.value.trim()) query.q = q.value
  if (cat.value) query.cat = String(cat.value)
  // App.vue keys the view by fullPath, so router.replace would remount the page and lose the focus
  // in the search box; update the address bar in place (state restored from route.query on load).
  const search = new URLSearchParams(query).toString()
  window.history.replaceState(
    window.history.state,
    '',
    `${route.path}${search ? `?${search}` : ''}${route.hash}`,
  )
})

const crumbs = computed(() => [
  { label: t('nav.links.home'), to: session.isAuthenticated ? '/home' : '/' },
  { label: t('faq.title') },
])

async function openFromHash() {
  const id = route.hash.slice(1)
  const target = FAQ_ITEMS.find((i) => itemId(i) === id)
  if (!target) return
  if (!ids.value.includes(id)) {
    q.value = ''
    cat.value = 0
  }
  await nextTick()
  open.value = id
  await nextTick()
  const el = document.getElementById(id)
  el?.scrollIntoView({ block: 'center' })
  el?.querySelector('button')?.focus({ preventScroll: true })
}
onMounted(openFromHash)
watch(() => route.hash, openFromHash)
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-224 flex-col gap-6 px-4 pt-4 pb-10 sm:px-6 md:pt-6 md:pb-14"
  >
    <Breadcrumb :items="crumbs" />
    <div class="flex flex-col gap-2">
      <h1 class="t-title text-heading">{{ t('faq.title') }}</h1>
      <p class="text-muted">{{ t('faq.intro') }}</p>
    </div>
    <PInput
      v-model="q"
      type="search"
      icon="magnifying-glass"
      :placeholder="t('faq.searchPlaceholder')"
      :aria-label="t('faq.searchLabel')"
    />
    <div role="group" :aria-label="t('faq.categoriesLabel')" class="flex flex-wrap gap-2">
      <Chip
        v-for="(label, i) in FAQ_CATEGORIES"
        :key="label"
        :model-value="cat === i"
        @update:model-value="cat = i"
      >
        {{ label }}
      </Chip>
    </div>
    <p class="sr-only" role="status" aria-live="polite">{{ t('faq.results', items.length) }}</p>
    <div class="bg-surface ring-card-ring overflow-hidden rounded-lg shadow-(--card-shadow) ring-1">
      <FaqAccordion v-if="items.length" v-model:open="open" :items="items" :ids="ids" />
      <EmptyState v-else variant="noResults" text="" />
    </div>
    <FaqContact />
  </div>
</template>
