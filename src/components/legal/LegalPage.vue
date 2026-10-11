<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Breadcrumb from '@/components/ui/Breadcrumb.vue'
import LegalText from '@/components/ui/LegalText.vue'
import PCard from '@/components/ui/PCard.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'
import PTabs from '@/components/ui/PTabs.vue'
import { focusRing } from '@/components/ui/styles'
import {
  LEGAL,
  LEGAL_PENDING,
  LEGAL_TAB_ORDER,
  legalUpdatedLabel,
  type LegalTab,
} from '@/content/legal'

const props = defineProps<{ tab: LegalTab }>()
const { t } = useI18n()
const router = useRouter()

const doc = computed(() => LEGAL[props.tab])
const updated = computed(() => legalUpdatedLabel())
const isPlaceholder = computed(() => !LEGAL_PENDING.updatedAt)
const tabs = LEGAL_TAB_ORDER.map((value) => ({ value, label: t(`legal.${value}`) }))

const active = computed({
  get: () => props.tab,
  // Each tab has its own URL; replace so that switching never piles up history entries.
  set: (value: string) => {
    if (value !== props.tab) void router.replace(`/${value}`)
  },
})
</script>

<template>
  <div class="pg-main flex max-w-4xl flex-col gap-6">
    <Breadcrumb :items="[{ label: t('legal.home'), to: '/' }, { label: doc.title }]" />
    <header class="flex flex-col gap-2">
      <h1 class="t-title text-heading">{{ doc.title }}</h1>
      <p class="text-muted m-0 text-sm">
        {{ t('legal.updated') }}
        <span v-if="isPlaceholder" class="ph">{{ updated }}</span>
        <template v-else>{{ updated }}</template>
      </p>
    </header>
    <PrognoAlert variant="warn" :title="t('legal.draftTitle')" data-testid="legal-draft">
      {{ t('legal.draft') }}
    </PrognoAlert>
    <PTabs v-model="active" :tabs="tabs" :label="t('legal.tabs')">
      <template v-for="value in LEGAL_TAB_ORDER" :key="value" #[value]>
        <PCard>
          <nav :aria-label="t('legal.toc')" class="mb-6 print:hidden">
            <p class="text-heading m-0 mb-1 text-base font-semibold">{{ t('legal.toc') }}</p>
            <ul class="m-0 list-none p-0">
              <li v-for="s in doc.sections" :key="s.id">
                <a
                  :href="`#${s.id}`"
                  :class="[
                    'text-link inline-flex min-h-11 items-center text-sm underline',
                    focusRing,
                  ]"
                  >{{ s.title }}</a
                >
              </li>
            </ul>
          </nav>
          <div class="prose">
            <section v-for="s in doc.sections" :key="s.id" :aria-labelledby="s.id">
              <h2 :id="s.id" class="text-heading scroll-mt-20 text-xl leading-7">
                {{ s.title }}
              </h2>
              <p v-for="(p, i) in s.paragraphs" :key="i" class="text-body">
                <LegalText :text="p" />
              </p>
            </section>
          </div>
        </PCard>
      </template>
    </PTabs>
  </div>
</template>
