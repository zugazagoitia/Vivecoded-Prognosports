<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { controlBase } from '@/components/ui/styles'
import { COLUMNS, CONCEPTS, type PointsGrid } from '@/lib/createCommunity'

/**
 * Points table of the rule-set step (H4).
 * - read-only (`values` = 8 numbers): «Acierto» / «Puntos» of an existing set;
 * - editable (`points` + `update`): 8 concepts x 3 sessions of a new set, one number input per cell
 *   with `aria-label` «{concepto} en {sesión}»; `errors` is keyed `q.3`, `race.0`...
 *
 * Emits: `update` (column, concept index, raw input value).
 */
const props = defineProps<{
  values?: number[]
  points?: PointsGrid
  errors?: Record<string, string>
}>()
const emit = defineEmits<{
  update: [column: (typeof COLUMNS)[number], index: number, raw: string]
}>()
const { t } = useI18n()

const th = 'text-muted px-3 py-2 text-xs font-bold tracking-wide uppercase'
const td = 'border-border border-t px-3 py-2 text-sm'

function cell(col: (typeof COLUMNS)[number], i: number): number | string {
  return props.points?.[col][i] ?? ''
}
function onInput(col: (typeof COLUMNS)[number], i: number, e: Event) {
  emit('update', col, i, (e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="ring-card-ring max-w-full overflow-auto rounded-lg ring-1">
    <table v-if="values" class="w-full border-collapse text-left">
      <caption class="sr-only">
        {{
          t('createCommunity.rules.tableExisting')
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col" :class="th">{{ t('createCommunity.rules.hit') }}</th>
          <th scope="col" :class="[th, 'text-right']">
            {{ t('createCommunity.rules.pointsCol') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(c, i) in CONCEPTS" :key="c">
          <th scope="row" :class="[td, 'text-body font-normal']">
            {{ t(`createCommunity.rules.conceptLong.${c}`) }}
          </th>
          <td :class="[td, 'text-heading text-right font-bold tabular-nums']">{{ values[i] }}</td>
        </tr>
      </tbody>
    </table>

    <table v-else class="w-full min-w-[480px] border-collapse text-left">
      <caption class="sr-only">
        {{
          t('createCommunity.rules.tableNew')
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col" :class="th">{{ t('createCommunity.rules.hit') }}</th>
          <th v-for="col in COLUMNS" :key="col" scope="col" :class="[th, 'text-center']">
            {{ t(`createCommunity.rules.${col}`) }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(c, i) in CONCEPTS" :key="c">
          <th scope="row" :class="[td, 'text-body font-normal']">
            {{ t(`createCommunity.rules.concept.${c}`) }}
          </th>
          <td v-for="col in COLUMNS" :key="col" :class="[td, 'text-center']">
            <input
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
              :value="cell(col, i)"
              :aria-label="
                t('createCommunity.rules.cellLabel', {
                  concept: t(`createCommunity.rules.concept.${c}`),
                  session: t(`createCommunity.rules.${col}`).toLowerCase(),
                })
              "
              :aria-invalid="errors?.[`${col}.${i}`] ? true : undefined"
              :class="[controlBase, 'w-16! text-center tabular-nums']"
              @input="onInput(col, i, $event)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
