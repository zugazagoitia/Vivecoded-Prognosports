<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PCard from '@/components/ui/PCard.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PTag from '@/components/ui/PTag.vue'
import PTitle from '@/components/ui/PTitle.vue'
import { previewInitials } from '@/lib/createCommunity'

/**
 * Live preview of the community being created (H4): avatar (image or initials), name, access,
 * competition and what happens after creating it. Pure presentation.
 *
 * Props: `name`, `open`, `user` (creator), `competition`, `season`, `imageUrl` (object URL).
 */
const props = defineProps<{
  name: string
  open: boolean
  user: string
  competition?: string | undefined
  season?: string | undefined
  imageUrl?: string | undefined
}>()
const { t } = useI18n()
const shownName = computed(() => props.name.trim() || t('createCommunity.preview.fallbackName'))
const where = computed(() =>
  props.competition
    ? t('createCommunity.preview.where', {
        competition: props.competition,
        season: props.season ?? '',
      })
    : '',
)
</script>

<template>
  <PCard class="sticky top-[72px] max-[900px]:static">
    <div class="flex flex-col gap-4">
      <PTitle level="subtitle" as="h2">{{ t('createCommunity.preview.title') }}</PTitle>
      <div class="flex items-center gap-3">
        <span
          aria-hidden="true"
          class="bg-primary text-on-primary inline-flex size-14 flex-none items-center justify-center overflow-hidden rounded-xl text-xl leading-none font-bold"
        >
          <img v-if="imageUrl" :src="imageUrl" alt="" class="size-full object-cover" />
          <template v-else>{{ previewInitials(name) }}</template>
        </span>
        <div class="flex min-w-0 flex-col">
          <span class="t-header text-heading wrap-anywhere" data-testid="preview-name">{{
            shownName
          }}</span>
          <span class="text-muted text-sm">{{ t('createCommunity.preview.by', { user }) }}</span>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <PTag v-if="open" color="ok" icon="globe">{{ t('createCommunity.preview.open') }}</PTag>
        <PTag v-else color="brand" icon="lock">{{ t('createCommunity.preview.closed') }}</PTag>
        <PTag>{{ t('createCommunity.preview.players') }}</PTag>
        <PTag v-if="where">{{ where }}</PTag>
      </div>
      <hr class="border-border" />
      <div class="flex flex-col gap-2">
        <span class="t-up text-muted">{{ t('createCommunity.preview.after') }}</span>
        <ul class="m-0 flex list-none flex-col gap-2 p-0">
          <li v-for="k in ['a', 'b', 'c']" :key="k" class="flex items-start gap-2 text-sm">
            <PIcon name="circle-check" :size="16" class="text-ok mt-0.5 flex-none" />
            <span class="text-body">{{ t(`createCommunity.preview.${k}`) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </PCard>
</template>
