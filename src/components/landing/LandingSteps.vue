<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{ mobile?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <section
    class="mx-auto w-full max-w-(--container-xl)"
    :class="mobile ? 'flex flex-col gap-4 px-4 py-10' : 'px-4 py-[72px] sm:px-6'"
  >
    <div :class="mobile ? '' : 'mb-8 flex max-w-[640px] flex-col gap-2'">
      <p class="t-up text-muted m-0">{{ t('landing.steps.eyebrow') }}</p>
      <h2 v-if="!mobile" class="text-heading m-0 text-[30px] leading-[38px] font-semibold">
        {{ t('landing.steps.title') }}
      </h2>
    </div>
    <ol
      class="m-0 list-none p-0"
      :class="
        mobile
          ? 'flex flex-col gap-4'
          : 'grid grid-cols-1 gap-8 min-[640px]:grid-cols-2 min-[900px]:grid-cols-3'
      "
    >
      <li v-for="i in 3" :key="i" class="flex items-start" :class="mobile ? 'gap-3' : 'gap-4'">
        <span
          class="bg-primary text-on-primary flex size-10 flex-none items-center justify-center rounded-full font-bold"
          aria-hidden="true"
        >
          {{ i }}
        </span>
        <div class="flex flex-col" :class="mobile ? 'gap-0.5' : 'gap-1'">
          <b :class="mobile ? 'text-heading' : 't-header text-heading'">
            {{ t(`landing.steps.list[${i - 1}].title`) }}
          </b>
          <span :class="mobile ? 'text-muted text-sm' : 'text-muted'">
            {{ t(`landing.steps.list[${i - 1}].${mobile ? 'short' : 'text'}`) }}
          </span>
        </div>
      </li>
    </ol>
  </section>
</template>
