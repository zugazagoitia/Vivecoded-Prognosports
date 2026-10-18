<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Driver } from '@/api/schemas'
import Avatar from '@/components/ui/Avatar.vue'
import PCard from '@/components/ui/PCard.vue'
import { driverCode, driverName } from '@/lib/predict'
import { useFlag } from '@/flags'
import { usePublicForm, usePublicHeadshots } from '@/queries/publicForm'

/**
 * «Forma en el campeonato» (G3, issue 206, idea 3): real championship position and last results of
 * each driver (Jolpica). Lazy and non-blocking: while loading, or if the source fails, nothing
 * is rendered and the prediction form works exactly as before. Informational only.
 * Photos (idea 5) only when VITE_FF_PUBLIC_HEADSHOTS is on; a failing image keeps the avatar.
 */
const props = defineProps<{
  season: number | undefined
  round: number | undefined
  drivers: Driver[]
}>()
const { t } = useI18n()

const form = usePublicForm(() =>
  props.season && props.round ? { season: props.season, round: props.round } : undefined,
)
const photosOn = useFlag('PUBLIC_HEADSHOTS')
const photos = usePublicHeadshots(() => photosOn.value && !!form.data.value)
const broken = ref(new Set<string>())
const photoOf = (code: string) =>
  photosOn.value && !broken.value.has(code) ? photos.data.value?.get(code) : undefined

const rows = computed(() => {
  const data = form.data.value
  if (!data) return []
  return props.drivers
    .map((d) => ({ d, code: driverCode(d), f: data.drivers.get(driverCode(d)) }))
    .filter((r) => r.f)
    .sort((a, b) => (a.f!.position ?? 99) - (b.f!.position ?? 99))
})
</script>

<template>
  <PCard v-if="rows.length" tag="section" data-testid="form-context">
    <h3 class="text-heading m-0 text-base font-semibold">{{ t('publicForm.title') }}</h3>
    <p class="text-muted my-1 text-sm">
      {{ t('publicForm.intro', { round: form.data.value!.round }) }}
    </p>
    <ul class="m-0 flex list-none flex-col gap-1 p-0" :aria-label="t('publicForm.list')">
      <li v-for="r in rows" :key="r.code" class="fc-row">
        <img
          v-if="photoOf(r.code)"
          :src="photoOf(r.code)"
          alt=""
          width="24"
          height="24"
          loading="lazy"
          referrerpolicy="no-referrer"
          class="fc-photo"
          @error="broken.add(r.code)"
        />
        <Avatar v-else :name="driverName(r.d)" :size="24" />
        <b class="text-heading">{{ r.code }}</b>
        <span class="text-muted" :title="t('publicForm.position', { n: r.f!.position ?? '–' })">{{
          t('publicForm.pos', {
            n: r.f!.position ?? '–',
            pts: t('publicForm.points', { n: r.f!.points }),
          })
        }}</span>
        <span class="fc-last" :aria-label="t('publicForm.last')">{{
          r.f!.last.map((p) => (p == null ? t('publicForm.dnfShort') : p)).join(', ')
        }}</span>
      </li>
    </ul>
    <p class="text-muted mt-2 mb-0 text-xs">
      {{ t('publicForm.source')
      }}<template v-if="photosOn && photos.data.value?.size">
        {{ t('publicForm.photoSource') }}</template
      >
    </p>
  </PCard>
</template>

<style scoped>
.fc-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
}
.fc-photo {
  width: 24px;
  height: 24px;
  border-radius: 9999px;
  object-fit: cover;
  background: var(--color-tint);
}
.fc-last {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}
</style>
