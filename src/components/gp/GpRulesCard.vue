<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RaceSession, RuleSet } from '@/api/schemas'
import PButton from '@/components/ui/PButton.vue'
import PTag from '@/components/ui/PTag.vue'
import { ruleChips } from '@/lib/gp'
import GpCard from './GpCard.vue'
import PointsChip from './PointsChip.vue'

/**
 * «Reglas de este GP»: the rule set applied to the GP, with the points of the selected session.
 * «con excepción en este GP» when the GP's rule set differs from the season's.
 */
const props = defineProps<{
  ruleset?: RuleSet
  /** Rule set of the whole season; a different id means this GP has an exception. */
  seasonRulesetId?: number
  session?: RaceSession
  loading?: boolean
  error?: unknown
}>()
defineEmits<{ retry: [] }>()
const { t } = useI18n()

const chips = computed(() => ruleChips(props.ruleset?.data, props.session))
const exception = computed(
  () =>
    props.seasonRulesetId != null &&
    props.ruleset != null &&
    props.ruleset.id !== props.seasonRulesetId,
)
</script>

<template>
  <GpCard
    :title="t('gp.rules.title')"
    :loading="loading"
    :error="error"
    :what="t('gp.error.rules')"
    @retry="$emit('retry')"
  >
    <div v-if="ruleset" class="flex flex-col gap-2">
      <span class="text-sm">{{
        t(exception ? 'gp.rules.setException' : 'gp.rules.set', {
          name: ruleset.displayname ?? '',
        })
      }}</span>
      <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
        <li v-if="chips.exact">
          <PointsChip kind="exact" :text="t('gp.rules.exact', { n: chips.exact })" />
        </li>
        <li v-if="chips.near">
          <PointsChip kind="near" :text="t('gp.rules.near', { n: chips.near })" />
        </li>
        <li v-if="chips.far">
          <PointsChip kind="far" :text="t('gp.rules.far', { n: chips.far })" />
        </li>
        <li v-if="chips.bonus">
          <PTag color="brand">{{ t('gp.rules.bonus', { n: chips.bonus }) }}</PTag>
        </li>
      </ul>
      <PButton to="/rules" variant="soft" size="sm" class="self-start">{{
        t('gp.rules.full')
      }}</PButton>
    </div>
  </GpCard>
</template>
