<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BottomSheet from '@/components/data/BottomSheet.vue'
import PIcon from '@/components/ui/PIcon.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import PSelect from '@/components/ui/PSelect.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { focusRing } from '@/components/ui/styles'
import FlagBadge from '@/flags/FlagBadge.vue'
import { isEnabled } from '@/flags'
import {
  activeViews,
  rankPath,
  sectionBySlug,
  targetFor,
  viewPath,
  visibleSections,
  type FlagCheck,
  type SeasonOption,
} from './rankNav'

const props = withDefaults(
  defineProps<{
    communities: { id: string | number; name: string }[]
    communityId: string | number
    /** Already filtered with `offeredSeasons`; newest first. */
    seasons: SeasonOption[]
    seasonId: string | number
    /** Seasons shown are all of the competition because the community has no points yet. */
    seasonsFallback?: boolean
    competition: string
    played: number
    total: number
    /** Closed season; by default when every Grand Prix has been played. */
    closed?: boolean
    /** Open `:seccion` / `:vista` slugs. */
    seccion: string
    vista?: string
    flags?: FlagCheck
  }>(),
  { seasonsFallback: false, closed: undefined, vista: undefined, flags: isEnabled },
)
const emit = defineEmits<{
  /** Change of community / season: the parent keeps `:seccion/:vista` (see `useRankNav`). */
  'update:communityId': [id: string | number]
  'update:seasonId': [id: string | number]
  /** Link click: path to push (the link itself is a real `href`). */
  navigate: [path: string]
}>()

const router = useRouter()
const ctx = computed(() => ({ comunidad: props.communityId, temporada: props.seasonId }))
const sections = computed(() => visibleSections(props.flags))
const active = computed(() => sectionBySlug(props.seccion))
const views = computed(() => (active.value ? activeViews(active.value, props.flags) : []))
const isClosed = computed(() => props.closed ?? (props.total > 0 && props.played >= props.total))
const communityName = computed(
  () => props.communities.find((c) => c.id === props.communityId)?.name ?? '',
)
const seasonLabel = computed(
  () => props.seasons.find((s) => s.id === props.seasonId)?.label ?? String(props.seasonId),
)
const subtitle = computed(() => {
  const head = `${communityName.value} · ${props.competition} ${seasonLabel.value}`
  return isClosed.value
    ? `${head} · temporada cerrada`
    : `${head} · ${props.played} de ${props.total} Grandes Premios disputados`
})
const seasonOptions = computed(() =>
  props.seasons.map((s) => ({
    value: s.id,
    label: s.current ? `${s.label} · en curso` : s.label,
  })),
)
const communityOptions = computed(() =>
  props.communities.map((c) => ({ value: c.id, label: c.name })),
)

const community = computed({
  get: () => props.communityId,
  set: (v: string | number) => emit('update:communityId', v),
})
const season = computed({
  get: () => props.seasonId,
  set: (v: string | number) => emit('update:seasonId', v),
})

const hrefOf = (sub: string) => router.resolve(rankPath(ctx.value, sub)).href
function onLink(e: MouseEvent, sub: string) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  sheetOpen.value = false
  emit('navigate', rankPath(ctx.value, sub))
}

const mobileSections = computed(() => sections.value.filter((s) => s.mobile))
const mobileOptions = computed(() =>
  mobileSections.value.map((s) => ({ value: s.slug, label: s.label })),
)
const mobileActive = computed({
  get: () => (mobileSections.value.some((s) => s.slug === props.seccion) ? props.seccion : ''),
  set: (slug: string) => {
    const s = sectionBySlug(slug)
    const sub = s && targetFor(s, props.flags)
    if (sub) emit('navigate', rankPath(ctx.value, sub))
  },
})
const sheetOpen = ref(false)

const link =
  'text-muted hover:text-heading aria-[current=page]:text-tint-fg aria-[current=page]:border-focus-ring -mb-px inline-flex min-h-11 items-center border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium whitespace-nowrap aria-[current=page]:font-semibold md:min-h-10'
const chip =
  'border-border-input bg-surface text-body hover:bg-surface-muted aria-[current=page]:bg-tint aria-[current=page]:border-focus-ring aria-[current=page]:text-tint-fg inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] leading-5 font-medium whitespace-nowrap aria-[current=page]:font-semibold md:min-h-8'
</script>

<template>
  <header class="flex flex-col gap-4">
    <div>
      <h1 class="text-heading text-2xl font-bold">Ranking</h1>
      <p class="text-muted mt-1 text-sm">{{ subtitle }}</p>
    </div>

    <div class="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
      <div class="md:w-64">
        <PSelect v-model="community" label="Comunidad" :options="communityOptions" />
      </div>
      <div class="flex min-w-0 flex-col gap-1">
        <div class="overflow-x-auto">
          <SegmentedControl v-model="season" label="Temporada" :options="seasonOptions" />
        </div>
        <p v-if="seasonsFallback" class="text-muted text-xs">
          Tu comunidad aún no tiene puntos: se muestran todas las temporadas de la competición.
        </p>
      </div>
    </div>

    <ProgressBar
      label="Progreso de la temporada"
      :value="played"
      :min="0"
      :max="total"
      class="max-w-md"
    />

    <!-- Desktop: section tabs (links). -->
    <nav
      aria-label="Secciones del ranking"
      class="border-border hidden overflow-x-auto border-b md:block"
    >
      <ul class="flex">
        <li v-for="s in sections" :key="s.slug">
          <a
            :href="hrefOf(targetFor(s, flags) ?? s.slug)"
            :aria-current="s.slug === seccion ? 'page' : undefined"
            :class="[link, focusRing]"
            @click="onLink($event, targetFor(s, flags) ?? s.slug)"
            >{{ s.label }}</a
          >
        </li>
      </ul>
    </nav>

    <!-- Mobile: the three main sections plus the full list. -->
    <div class="flex flex-col items-start gap-1 md:hidden">
      <div class="min-w-0 overflow-x-auto">
        <SegmentedControl
          v-model="mobileActive"
          label="Secciones principales"
          :options="mobileOptions"
        />
      </div>
      <button
        type="button"
        :class="[
          'text-tint-fg inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 text-sm font-semibold whitespace-nowrap',
          focusRing,
        ]"
        @click="sheetOpen = true"
      >
        Ver todas las vistas
        <PIcon name="chevron-down" :size="16" />
      </button>
    </div>
    <BottomSheet v-model:open="sheetOpen" title="Todas las vistas">
      <div v-for="s in sections" :key="s.slug" class="mb-3">
        <h3 class="text-muted mb-1 text-xs font-semibold tracking-wide uppercase">{{ s.label }}</h3>
        <ul>
          <li v-for="v in activeViews(s, flags)" :key="v.screen">
            <a
              :href="hrefOf(viewPath(s, v))"
              :aria-current="
                s.slug === seccion && (v.slug ?? undefined) === (vista || undefined)
                  ? 'page'
                  : undefined
              "
              :class="[
                'text-body aria-[current=page]:text-tint-fg flex min-h-11 items-center gap-2 text-sm aria-[current=page]:font-semibold',
                focusRing,
              ]"
              @click="onLink($event, viewPath(s, v))"
              >{{ v.label }}<FlagBadge v-if="v.flag"
            /></a>
          </li>
        </ul>
      </div>
    </BottomSheet>

    <!-- View chips, only when the section has more than one active view. -->
    <nav v-if="views.length > 1" role="navigation" aria-label="Vistas">
      <ul class="flex gap-2 overflow-x-auto py-0.5">
        <li v-for="v in views" :key="v.screen">
          <a
            :href="hrefOf(active ? viewPath(active, v) : '')"
            :aria-current="(v.slug ?? undefined) === (vista || undefined) ? 'page' : undefined"
            :class="[chip, focusRing]"
            @click="onLink($event, active ? viewPath(active, v) : '')"
            >{{ v.label }}<FlagBadge v-if="v.flag"
          /></a>
        </li>
      </ul>
    </nav>
  </header>
</template>
