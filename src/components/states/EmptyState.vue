<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PIcon from '@/components/ui/PIcon.vue'
import { iconFor } from '@/components/ui/icons'

const props = defineProps<{
  /** Preset del tablero; `title`/`text`/`icon` lo sobrescriben. */
  variant?: 'noCommunity' | 'noResults' | 'noSessionResults'
  title?: string
  text?: string
  /** Nombre Material del icono. */
  icon?: string
}>()
const { t } = useI18n()

const ICONS = { noCommunity: 'groups', noResults: 'search_off', noSessionResults: 'timer' } as const
const iconName = computed(() => iconFor(props.icon ?? ICONS[props.variant ?? 'noResults']))
const titleText = computed(
  () => props.title ?? (props.variant ? t(`states.empty.${props.variant}.title`) : ''),
)
const bodyText = computed(
  () => props.text ?? (props.variant ? t(`states.empty.${props.variant}.text`) : ''),
)
</script>

<template>
  <section class="empty-state">
    <span class="empty-state-ic"><PIcon :name="iconName" :size="24" /></span>
    <h3>{{ titleText }}</h3>
    <p v-if="bodyText">{{ bodyText }}</p>
    <div v-if="$slots.default" class="empty-state-actions"><slot /></div>
  </section>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
  padding: 2.5rem 1.5rem;
  color: var(--color-muted);
}
.empty-state-ic {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: var(--color-tint);
  color: var(--color-tint-fg);
}
h3 {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-heading);
}
p {
  max-width: 28rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
}
.empty-state-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>
