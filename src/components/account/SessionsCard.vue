<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AuthToken } from '@/api'
import CommunityCard from '@/components/community/CommunityCard.vue'
import PButton from '@/components/ui/PButton.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PTag from '@/components/ui/PTag.vue'
import { parseAgent } from '@/lib/account'
import { formatDate, formatRelative } from '@/utils/dates'

/**
 * «Sesiones abiertas» (U3, `#sesiones`), desktop: the current session first (tag «Esta sesión»,
 * no «Cerrar»), the rest by last activity. «Cerrar las demás» is disabled when only the current
 * one is left. Acts at once (optimistic, see `queries/account.ts`).
 */
const props = defineProps<{
  tokens?: AuthToken[]
  loading?: boolean
  error?: unknown
  closing?: boolean
}>()
defineEmits<{ close: [token: string]; closeOthers: []; retry: [] }>()
const { t } = useI18n()

const rows = computed(() => (props.tokens ?? []).map((tk) => ({ tk, agent: parseAgent(tk.agent) })))
const others = computed(() => rows.value.filter((r) => !r.tk.current).length)
</script>

<template>
  <CommunityCard
    :title="t('account.sessions.title')"
    :loading="loading"
    :error="error"
    :what="t('account.sessions.error')"
    :rows="3"
    flush
    @retry="$emit('retry')"
  >
    <template #aside>
      <span class="text-muted mr-auto text-sm">{{ t('account.sessions.text') }}</span>
      <PButton
        variant="outline"
        size="sm"
        :disabled="others === 0"
        :loading="closing"
        @click="$emit('closeOthers')"
      >
        {{ t('account.sessions.closeOthers') }}
      </PButton>
    </template>
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm leading-5">
        <caption class="sr-only">
          {{
            t('account.sessions.table')
          }}
        </caption>
        <thead>
          <tr class="text-muted border-border border-b text-left text-xs">
            <th scope="col" class="px-5 py-3 font-semibold">{{ t('account.sessions.session') }}</th>
            <th scope="col" class="px-3 py-3 font-semibold">{{ t('account.sessions.created') }}</th>
            <th scope="col" class="px-3 py-3 font-semibold">
              {{ t('account.sessions.activity') }}
            </th>
            <th scope="col" class="px-5 py-3"><span class="sr-only">&nbsp;</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.tk.token" class="border-border border-b last:border-b-0">
            <td class="px-5 py-3">
              <span class="flex items-center gap-2">
                <PIcon :name="r.agent.icon" :size="16" class="text-muted" />
                <span class="text-heading font-medium">{{ r.agent.label }}</span>
              </span>
            </td>
            <td class="text-muted px-3 py-3 whitespace-nowrap">
              {{ r.tk.createdAt ? formatDate(r.tk.createdAt) : '—' }}
            </td>
            <td class="px-3 py-3 whitespace-nowrap">
              <PTag v-if="r.tk.current" color="ok">{{ t('account.sessions.current') }}</PTag>
              <span v-else class="text-muted">
                {{ r.tk.lastActivityAt ? formatRelative(r.tk.lastActivityAt) : '—' }}
              </span>
            </td>
            <td class="px-5 py-3 text-right">
              <PButton
                v-if="!r.tk.current"
                variant="ghost"
                size="sm"
                :aria-label="t('account.sessions.closeAria', { name: r.agent.label })"
                @click="$emit('close', r.tk.token)"
              >
                {{ t('account.sessions.close') }}
              </PButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </CommunityCard>
</template>
