<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Community } from '@/api/schemas'
import Chip from '@/components/ui/Chip.vue'
import PSegmentedControl from '@/components/ui/SegmentedControl.vue'

/** Active-community selector: segmented control on desktop, scrolling chips on phones. */
const props = defineProps<{
  communities: readonly Community[]
  activeId: number | null
  chips?: boolean
}>()
const emit = defineEmits<{ select: [id: number] }>()
const { t } = useI18n()

const options = computed(() => props.communities.map((c) => ({ value: c.id, label: c.name })))
const model = computed({
  get: () => props.activeId ?? -1,
  set: (id: number) => emit('select', id),
})
</script>

<template>
  <div
    v-if="chips"
    role="group"
    class="flex gap-2 overflow-x-auto pb-1"
    :aria-label="t('home.communities.label')"
  >
    <Chip
      v-for="c in communities"
      :key="c.id"
      class="flex-none"
      :model-value="c.id === activeId"
      @update:model-value="emit('select', c.id)"
    >
      {{ c.name }}
    </Chip>
  </div>
  <PSegmentedControl
    v-else
    v-model="model"
    :options="options"
    :label="t('home.communities.label')"
  />
</template>
