<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PButton from '@/components/ui/PButton.vue'

defineProps<{ mobile?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <section
    class="mx-auto w-full max-w-(--container-xl) px-4"
    :class="mobile ? 'pt-2 pb-10' : 'py-[72px] sm:px-6'"
  >
    <div
      class="from-brand-700 to-brand-900 text-brand-50 flex flex-col items-center rounded-lg bg-linear-to-b text-center shadow-(--card-shadow)"
      :class="mobile ? 'gap-3.5 px-5 py-8' : 'gap-5 px-10 py-14'"
    >
      <h2
        class="m-0 font-semibold text-balance text-white"
        :class="mobile ? 'text-2xl leading-[30px]' : 'max-w-[640px] text-4xl leading-[42px]'"
      >
        {{ t('landing.cta.title') }}
      </h2>
      <p v-if="!mobile" class="text-brand-100 m-0 max-w-[520px]">{{ t('landing.cta.text') }}</p>
      <PButton
        to="/register"
        :size="mobile ? 'md' : 'lg'"
        :block="mobile"
        class="text-brand-700! hover:bg-brand-50! min-h-12 border-transparent! bg-white!"
      >
        {{ t('landing.cta.button') }}
      </PButton>
    </div>
  </section>
</template>
