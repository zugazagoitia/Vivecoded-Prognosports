<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { useI18n } from 'vue-i18n'
import CommunityCard from '@/components/community/CommunityCard.vue'
import { focusRing } from '@/components/ui/styles'
import {
  CHANNELS,
  NOTIFICATION_TYPES,
  notificationTypeLabel,
  notificationTypeText,
  type ChannelId,
  type ChannelState,
  type NotificationTypeId,
  type PrefMatrix,
} from '@/lib/account'

/**
 * «Avisos» (U3, `#avisos`): matrix of the 5 notification types x the channels mail and Telegram.
 * Desktop: a table with a switch per cell; `compact` (mobile): per type two chips with
 * `role="switch"`. Every control is named «{tipo} por {canal}». A channel the backend does not
 * offer, or Telegram when the account is not linked, is disabled. Emits `toggle(type, channel)`.
 */
defineProps<{
  matrix: PrefMatrix
  channels: Record<ChannelId, ChannelState>
  compact?: boolean
  loading?: boolean
  error?: unknown
}>()
defineEmits<{ toggle: [type: NotificationTypeId, channel: ChannelId]; retry: [] }>()
const { t } = useI18n()

const channelName = (c: ChannelId) => t(`account.notifications.channels.${c}`)
const label = (type: NotificationTypeId, c: ChannelId) =>
  t('account.notifications.switchLabel', {
    name: notificationTypeLabel(type),
    channel: channelName(c),
  })
function disabledOf(states: Record<ChannelId, ChannelState>, c: ChannelId): boolean {
  return !states[c].enabled || !states[c].linked
}
function hint(states: Record<ChannelId, ChannelState>, c: ChannelId): string | undefined {
  if (!states[c].enabled) return t('account.notifications.channelOff')
  if (!states[c].linked) return t('account.notifications.telegramOff')
  return undefined
}
</script>

<template>
  <CommunityCard
    :title="t('account.notifications.title')"
    :loading="loading"
    :error="error"
    :what="t('account.loadError')"
    :rows="compact ? 0 : 5"
    :lines="5"
    :flush="!compact"
    @retry="$emit('retry')"
  >
    <template #aside>
      <span class="text-muted text-sm">{{ t('account.notifications.text') }}</span>
    </template>

    <ul v-if="compact" class="m-0 flex list-none flex-col gap-4 p-0">
      <li v-for="type in NOTIFICATION_TYPES" :key="type" class="flex flex-col gap-2">
        <div>
          <b class="text-heading text-sm">{{ notificationTypeLabel(type) }}</b>
          <p class="text-muted text-xs">{{ notificationTypeText(type) }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="c in CHANNELS"
            :key="c"
            type="button"
            role="switch"
            :aria-checked="matrix[type][c]"
            :aria-label="label(type, c)"
            :disabled="disabledOf(channels, c)"
            :title="hint(channels, c)"
            :class="[
              'border-border-input bg-surface text-body aria-checked:border-focus-ring aria-checked:bg-tint aria-checked:text-tint-fg inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50 aria-checked:font-semibold',
              focusRing,
            ]"
            @click="$emit('toggle', type, c)"
          >
            {{ channelName(c) }}
          </button>
        </div>
      </li>
    </ul>

    <div v-else class="overflow-x-auto">
      <table class="w-full border-collapse text-sm leading-5">
        <caption class="sr-only">
          {{
            t('account.notifications.table')
          }}
        </caption>
        <thead>
          <tr class="text-muted border-border border-b text-xs">
            <th scope="col" class="px-5 py-3 text-left font-semibold">
              {{ t('account.notifications.type') }}
            </th>
            <th
              v-for="c in CHANNELS"
              :key="c"
              scope="col"
              class="px-3 py-3 text-center font-semibold"
            >
              {{ channelName(c) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="type in NOTIFICATION_TYPES"
            :key="type"
            class="border-border border-b last:border-b-0"
          >
            <th scope="row" class="px-5 py-3 text-left font-normal">
              <b class="text-heading block">{{ notificationTypeLabel(type) }}</b>
              <span class="text-muted text-xs">{{ notificationTypeText(type) }}</span>
            </th>
            <td v-for="c in CHANNELS" :key="c" class="px-3 py-3 text-center">
              <SwitchRoot
                :model-value="matrix[type][c]"
                :disabled="disabledOf(channels, c)"
                :aria-label="label(type, c)"
                :title="hint(channels, c)"
                :class="[
                  'data-[state=checked]:bg-brand-500 bg-border-input relative h-[22px] w-10 cursor-pointer rounded-full p-0 align-middle transition-colors disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none',
                  focusRing,
                ]"
                @update:model-value="$emit('toggle', type, c)"
              >
                <SwitchThumb
                  class="block size-[18px] translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[20px] motion-reduce:transition-none"
                />
              </SwitchRoot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </CommunityCard>
</template>
