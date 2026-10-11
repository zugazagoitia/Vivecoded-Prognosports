<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import HitCell from '@/components/data/HitCell.vue'
import PButton from '@/components/ui/PButton.vue'
import PrognoAlert from '@/components/ui/PrognoAlert.vue'

import { DEMO_DRIVERS, DEMO_PREDICTION, DEMO_RESULT } from './classicRuleset'
import { buildHint, moveRow, ruleKey, scorePrediction, type RuleSetPoints } from './rules'

const props = defineProps<{ rules: RuleSetPoints }>()

const { t } = useI18n()
const order = ref<string[]>([...DEMO_PREDICTION])
const table = ref<HTMLElement | null>(null)

const scored = computed(() => scorePrediction(order.value, DEMO_RESULT, props.rules))
const driverName = (code: string) => DEMO_DRIVERS[code]?.name ?? code

const view = computed(() =>
  scored.value.rows.map((r) => ({
    ...r,
    name: driverName(r.code),
    teamColor: DEMO_DRIVERS[r.code]?.teamColor,
    finish:
      r.real === null
        ? t('rules.example.out')
        : t('rules.example.finish', { n: (r.real ?? 0) + 1 }),
    ruleText: t(`rules.rule.${ruleKey(r.d, r.k)}`),
  })),
)

const hint = computed(() =>
  buildHint(
    view.value.map((r) => ({
      position: r.k + 1,
      name: r.name,
      finish: r.finish,
      points: r.points,
      kind: r.kind,
      rule: r.ruleText,
    })),
    t,
  ),
)

async function move(code: string, dir: -1 | 1) {
  const k = order.value.indexOf(code)
  order.value = moveRow(order.value, k, dir)
  await nextTick()
  // The row moved: keep the focus on the same driver's button (or its sibling at the edge).
  const q = (d: 'up' | 'down') =>
    table.value?.querySelector<HTMLButtonElement>(`[data-move="${code}-${d}"]`)
  const same = q(dir === -1 ? 'up' : 'down')
  ;(same && !same.disabled ? same : q(dir === -1 ? 'down' : 'up'))?.focus()
}

function reset() {
  order.value = [...DEMO_PREDICTION]
}
</script>

<template>
  <div ref="table">
    <PrognoAlert variant="brand" :title="t('rules.example.hintTitle')">{{ hint }}</PrognoAlert>
    <div class="tw mt-4">
      <table class="tn w-full border-collapse text-sm">
        <caption class="sr-only">
          {{
            t('rules.example.caption')
          }}
        </caption>
        <thead>
          <tr class="border-border text-muted border-b text-left">
            <th scope="col" class="t-up px-3 py-2 text-center">
              {{ t('rules.example.position') }}
            </th>
            <th scope="col" class="t-up px-3 py-2">{{ t('rules.example.driver') }}</th>
            <th scope="col" class="t-up px-3 py-2">{{ t('rules.example.order') }}</th>
            <th scope="col" class="t-up px-3 py-2">{{ t('rules.example.finished') }}</th>
            <th scope="col" class="t-up px-3 py-2">{{ t('rules.example.rule') }}</th>
            <th scope="col" class="t-up px-3 py-2 text-right">{{ t('rules.example.points') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in view" :key="r.code" class="border-border border-b">
            <td class="text-heading px-3 py-2 text-center font-semibold">{{ r.k + 1 }}</td>
            <td class="px-3 py-2">
              <span class="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  class="h-5 w-1 shrink-0 rounded-xs"
                  :style="{ backgroundColor: r.teamColor }"
                />
                <b class="text-heading whitespace-nowrap">{{ r.name }}</b>
              </span>
            </td>
            <td class="px-3 py-1">
              <span class="flex gap-0.5">
                <PButton
                  variant="ghost"
                  size="sm"
                  icon="arrow-up"
                  icon-only
                  :data-move="`${r.code}-up`"
                  :aria-label="t('rules.example.up', { name: r.name })"
                  :disabled="r.k === 0"
                  @click="move(r.code, -1)"
                />
                <PButton
                  variant="ghost"
                  size="sm"
                  icon="arrow-down"
                  icon-only
                  :data-move="`${r.code}-down`"
                  :aria-label="t('rules.example.down', { name: r.name })"
                  :disabled="r.k === view.length - 1"
                  @click="move(r.code, 1)"
                />
              </span>
            </td>
            <td class="text-body px-3 py-2 whitespace-nowrap">{{ r.finish }}</td>
            <td class="text-muted px-3 py-2 text-[13px]">{{ r.ruleText }}</td>
            <td class="px-3 py-2 text-right">
              <HitCell :kind="r.kind" :points="r.points" :label="String(r.points)" />
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="px-3 py-3">
              <PButton variant="outline" size="sm" icon="rotate-right" @click="reset">{{
                t('rules.example.reset')
              }}</PButton>
            </td>
            <td class="text-heading px-3 py-3 text-right font-semibold">
              {{ t('rules.example.total') }}
            </td>
            <td
              class="text-heading px-3 py-3 text-right text-lg font-bold"
              data-testid="rules-total"
            >
              {{ scored.total }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>
