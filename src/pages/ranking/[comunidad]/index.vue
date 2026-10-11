<script setup lang="ts">
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ErrorState, Skeleton } from '@/components/states'
import { rankingHome } from '@/components/layout/rankNav'
import PTitle from '@/components/ui/PTitle.vue'
import { useCommunityDetail, useCommunitySeason } from '@/queries/community'

/** `/ranking/:comunidad`: no season given, so the current one of the competition (req. 5.1). */
definePage({
  meta: {
    layout: 'app',
    title: 'route.ranking',
    guards: ['auth', 'verified', 'community'],
  },
})

const { t } = useI18n()
const route = useRoute('/ranking/[comunidad]/')
const router = useRouter()
const detail = useCommunityDetail(() => String(route.params.comunidad))
const season = useCommunitySeason(() => detail.data.value)

watch(
  () => season.data.value?.id,
  (id) => {
    if (id != null)
      void router.replace(rankingHome({ comunidad: String(route.params.comunidad), temporada: id }))
  },
  { immediate: true },
)
</script>

<template>
  <div class="pg-main flex flex-col gap-4">
    <PTitle>{{ t('ranking.title') }}</PTitle>
    <ErrorState
      v-if="detail.isError.value || season.isError.value"
      :what="t('ranking.error')"
      :error="detail.error.value ?? season.error.value"
      @retry="detail.refetch()"
    />
    <Skeleton v-else variant="line" :lines="3" />
  </div>
</template>
