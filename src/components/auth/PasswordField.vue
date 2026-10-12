<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import PIcon from '@/components/ui/PIcon.vue'
import { controlBase, focusRing } from '@/components/ui/styles'

/**
 * Password field for the auth screens (A1-A5): label (with an optional aside such as
 * «¿Has olvidado tu contraseña?»), leading lock icon and a show/hide button (`aria-pressed`
 * + dynamic `aria-label`). Forwards other attributes (`name`, `placeholder`...) to the <input>.
 *
 * Props: `label`, `error`, `help`, `autocomplete` (`current-password` | `new-password`),
 * `icon` / `toggle` (default on), `phoneBare` (hide icon and toggle below 640px, as in the
 * phone mockup, and use 48px fields). Slot `label-aside`: right-aligned content of the label row.
 * `describedby`: extra ids (e.g. a form-level alert) appended to the field's own error id.
 * Exposes `focus()`.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label?: string
    error?: string
    help?: string
    autocomplete?: 'current-password' | 'new-password'
    icon?: boolean
    toggle?: boolean
    phoneBare?: boolean
    describedby?: string
  }>(),
  {
    label: undefined,
    error: undefined,
    help: undefined,
    autocomplete: 'current-password',
    icon: true,
    toggle: true,
    phoneBare: false,
    describedby: undefined,
  },
)
const model = defineModel<string>({ default: '' })
const { t } = useI18n()

const uid = useId()
const id = computed(() => `pw-${uid}`)
const visible = ref(false)
const input = ref<HTMLInputElement | null>(null)

const describedbyAll = computed(
  () =>
    [
      props.error ? `${id.value}-err` : undefined,
      props.help ? `${id.value}-help` : undefined,
      props.describedby,
    ]
      .filter(Boolean)
      .join(' ') || undefined,
)

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1">
    <div class="flex items-baseline justify-between gap-3">
      <!-- eslint-disable-next-line vuejs-accessibility/label-has-for -- associated through :for; the input is in the same component below -->
      <label :for="id" class="text-body text-xs leading-4 font-bold tracking-wide uppercase">
        {{ label ?? t('auth.password.label') }}
      </label>
      <slot name="label-aside" />
    </div>
    <div class="relative">
      <span
        v-if="icon"
        :class="[
          'text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2',
          phoneBare ? 'max-sm:hidden' : '',
        ]"
      >
        <PIcon name="lock" :size="16" />
      </span>
      <input
        v-bind="$attrs"
        :id="id"
        ref="input"
        v-model="model"
        :type="visible ? 'text' : 'password'"
        :autocomplete="autocomplete"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="describedbyAll"
        autocapitalize="none"
        spellcheck="false"
        :class="[
          controlBase,
          icon ? (phoneBare ? 'sm:pl-9' : 'pl-9') : '',
          toggle ? (phoneBare ? 'sm:pr-12' : 'pr-12') : '',
          phoneBare ? 'max-sm:min-h-12!' : '',
        ]"
      />
      <button
        v-if="toggle"
        type="button"
        :aria-pressed="visible"
        :aria-label="visible ? t('auth.password.hide') : t('auth.password.show')"
        :class="[
          'text-muted hover:text-heading absolute top-1/2 right-0 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-md',
          focusRing,
          phoneBare ? 'max-sm:hidden' : '',
        ]"
        @click="visible = !visible"
      >
        <PIcon :name="visible ? 'eye-slash' : 'eye'" :size="16" />
      </button>
    </div>
    <p v-if="help" :id="`${id}-help`" class="text-muted text-xs leading-4">{{ help }}</p>
    <p v-if="error" :id="`${id}-err`" class="text-err flex items-center gap-1 text-xs leading-4">
      <PIcon name="circle-exclamation" :size="16" />
      <span>{{ error }}</span>
    </p>
  </div>
</template>
