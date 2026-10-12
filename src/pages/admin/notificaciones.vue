<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import { Skeleton } from '@/components/states'
import PButton from '@/components/ui/PButton.vue'
import PCard from '@/components/ui/PCard.vue'
import PCheckbox from '@/components/ui/PCheckbox.vue'
import PIcon from '@/components/ui/PIcon.vue'
import PInput from '@/components/ui/PInput.vue'
import PSelect from '@/components/ui/PSelect.vue'
import PTag from '@/components/ui/PTag.vue'
import PTextarea from '@/components/ui/PTextarea.vue'
import PrognoModal from '@/components/ui/PrognoModal.vue'
import { iconFor } from '@/components/ui/icons'
import { toaster } from '@/composables/useToast'
import {
  canSend,
  isSupportedChannel,
  MANUAL_TYPES,
  TYPE_KEY,
  type NotificationKind,
} from '@/lib/adminNotify'
import { isUnavailable, useNotificationChannels, useSendNotification } from '@/queries/admin'

/**
 * M12 · Notificaciones (`/admin/notificaciones`): manual notice with a live preview, the automatic
 * sends and the channels. The send endpoint is not in the spec (`POST /v2/notifications` is a
 * guess, a local backend answers 404): a 404/405/501 shows «aún no disponible». Recipient and
 * Telegram counts do not exist in the API (por confirmar).
 */
definePage({ meta: { title: 'route.adminNotifications' } })

const { t } = useI18n()
const type = ref<NotificationKind>('INFO')
const title = ref('')
const message = ref('')
const selected = ref<string[]>([])

const channelsQ = useNotificationChannels()
const channels = computed(() =>
  (channelsQ.data.value ?? []).filter((c) => isSupportedChannel(c.id)),
)
watch(
  channels,
  (list) => {
    if (!selected.value.length) selected.value = list.filter((c) => c.enabled).map((c) => c.id)
  },
  { immediate: true },
)
const typeLabel = (k: NotificationKind) => t(`admin.notifications.types.${TYPE_KEY[k]}`)
const typeOptions = MANUAL_TYPES.map((k) => ({ value: k, label: typeLabel(k) }))
const ok = computed(() => canSend({ t: title.value, m: message.value, canales: selected.value }))

const confirm = ref(false)
const send = useSendNotification()
function onSend() {
  send.mutate(
    {
      type: type.value,
      title: title.value.trim(),
      message: message.value.trim(),
      channels: selected.value,
    },
    {
      onSuccess: () => {
        toaster.success(t('admin.notifications.sent'))
        title.value = ''
        message.value = ''
      },
      onError: (e) => {
        toaster.error(isUnavailable(e) ? t('admin.notifications.unavailable') : e.message)
      },
    },
  )
}
function toggle(id: string, on: boolean) {
  selected.value = on ? [...selected.value, id] : selected.value.filter((c) => c !== id)
}
const auto = [
  { key: 'sessionPreAlert', when: 'active' },
  { key: 'sessionAlert', when: 'active' },
  { key: 'gridChanges', when: 'onPublish' },
  { key: 'pointsDispatched', when: 'onCalc' },
] as const
</script>

<template>
  <div class="flex flex-col gap-6">
    <AdminHeader
      :title="t('admin.notifications.title')"
      :subtitle="t('admin.notifications.subtitle')"
    />
    <div class="split">
      <PCard :title="t('admin.notifications.newTitle')">
        <form class="flex flex-col gap-3" novalidate @submit.prevent="confirm = ok">
          <PSelect
            v-model="type"
            :label="t('admin.notifications.type')"
            :help="t('admin.notifications.typeHelp')"
            :options="typeOptions"
          />
          <PInput v-model="title" :label="t('admin.notifications.titleField')" />
          <PTextarea v-model="message" rows="4" :label="t('admin.notifications.message')" />
          <fieldset class="m-0 flex flex-wrap gap-x-4 border-0 p-0">
            <legend class="sr-only">{{ t('admin.notifications.channels') }}</legend>
            <Skeleton v-if="channelsQ.isLoading.value" variant="line" />
            <p v-else-if="channelsQ.isError.value" class="text-err text-sm" role="alert">
              {{ t('admin.notifications.channelsError') }}
            </p>
            <PCheckbox
              v-for="c in channels"
              :key="c.id"
              :model-value="selected.includes(c.id)"
              :disabled="!c.enabled"
              :label="c.label"
              @update:model-value="(v) => toggle(c.id, v)"
            />
          </fieldset>
          <section :aria-label="t('admin.notifications.preview')" class="flex flex-col gap-1">
            <span class="text-body text-xs font-semibold tracking-wide uppercase">{{
              t('admin.notifications.preview')
            }}</span>
            <div class="border-border bg-surface-muted flex gap-3 rounded-lg border p-3.5">
              <span
                class="bg-tint text-tint-fg flex size-10 flex-none items-center justify-center rounded-full"
              >
                <PIcon :name="iconFor('campaign')" />
              </span>
              <div class="flex min-w-0 flex-col">
                <b :class="title.trim() ? 'text-heading' : 'text-muted'">{{
                  title.trim() || t('admin.notifications.previewEmpty')
                }}</b>
                <span class="text-muted text-sm break-words">{{ message }}</span>
              </div>
            </div>
            <span class="text-muted text-xs">{{
              t('admin.notifications.reach', { type: typeLabel(type) })
            }}</span>
          </section>
          <div class="flex justify-end">
            <PButton type="submit" size="sm" :disabled="!ok" :loading="send.isPending.value">{{
              t('admin.notifications.send')
            }}</PButton>
          </div>
        </form>
      </PCard>

      <aside class="flex flex-col gap-4">
        <PCard :title="t('admin.notifications.auto.title')" :padded="false">
          <div class="p-3">
            <AdminTable :caption="t('admin.notifications.auto.caption')">
              <tbody>
                <tr v-for="a in auto" :key="a.key">
                  <td>{{ t(`admin.notifications.types.${a.key}`) }}</td>
                  <td class="r">
                    <PTag color="ok">{{ t(`admin.notifications.auto.${a.when}`) }}</PTag>
                  </td>
                </tr>
              </tbody>
            </AdminTable>
          </div>
        </PCard>
        <PCard :title="t('admin.notifications.channelsCard.title')">
          <ul class="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            <li v-for="c in channels" :key="c.id" class="flex items-center justify-between gap-2">
              <span>{{ c.label }}</span>
              <PTag :color="c.enabled ? 'ok' : 'err'">{{
                t(
                  c.enabled
                    ? 'admin.notifications.channelsCard.working'
                    : 'admin.notifications.channelsCard.disabled',
                )
              }}</PTag>
            </li>
          </ul>
        </PCard>
      </aside>
    </div>

    <PrognoModal
      v-model:open="confirm"
      :title="t('admin.notifications.confirmTitle')"
      :description="t('admin.notifications.confirmBody', { type: typeLabel(type) })"
      :confirm-label="t('admin.notifications.confirm')"
      @confirm="onSend"
    />
  </div>
</template>
