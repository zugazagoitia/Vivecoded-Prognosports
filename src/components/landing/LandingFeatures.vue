<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PIcon from '@/components/ui/PIcon.vue'
import { iconFor } from '@/components/ui/icons'

defineProps<{ mobile?: boolean }>()
const { t } = useI18n()
const key = (mobile: boolean | undefined) =>
  mobile ? 'landing.features.short' : 'landing.features.list'
const count = (mobile: boolean | undefined) => (mobile ? 4 : 6)
</script>

<template>
  <section
    class="mx-auto w-full max-w-(--container-xl) px-4"
    :class="mobile ? 'flex flex-col gap-4 py-10' : 'py-[72px] sm:px-6'"
  >
    <div :class="mobile ? '' : 'mb-8 flex max-w-[640px] flex-col gap-2'">
      <p class="t-up text-muted m-0">{{ t('landing.features.eyebrow') }}</p>
      <h2 v-if="!mobile" class="text-heading m-0 text-[30px] leading-[38px] font-semibold">
        {{ t('landing.features.title') }}
      </h2>
    </div>
    <ul
      class="m-0 list-none p-0"
      :class="
        mobile
          ? 'flex flex-col gap-3'
          : 'grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 min-[900px]:grid-cols-3'
      "
    >
      <li
        v-for="i in count(mobile)"
        :key="i"
        class="bg-surface ring-card-ring flex rounded-lg shadow-(--card-shadow) ring-1"
        :class="mobile ? 'items-start gap-3 p-4' : 'flex-col gap-3 p-6'"
      >
        <span
          class="bg-tint text-tint-fg flex flex-none items-center justify-center"
          :class="mobile ? 'size-10 rounded-full' : 'size-14 rounded-xl'"
          aria-hidden="true"
        >
          <PIcon :name="iconFor(t(`${key(mobile)}[${i - 1}].icon`))" :size="mobile ? 20 : 24" />
        </span>
        <div class="flex flex-col" :class="mobile ? 'gap-0.5' : 'gap-3'">
          <b :class="mobile ? 'text-heading' : 't-header text-heading'">
            {{ t(`${key(mobile)}[${i - 1}].title`) }}
          </b>
          <span class="text-muted text-sm">{{ t(`${key(mobile)}[${i - 1}].text`) }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>
