<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import PIcon from './PIcon.vue'
import type { IconName } from './icons'
import { focusRing } from './styles'

export type ButtonVariant = 'primary' | 'soft' | 'outline' | 'ghost' | 'danger' | 'ok'
export type ButtonSize = 'sm' | 'md' | 'lg'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    /** Icon shown before the label. */
    icon?: IconName
    /** Icon-only button: requires an `aria-label`. */
    iconOnly?: boolean
    loading?: boolean
    disabled?: boolean
    /** Renders a RouterLink. */
    to?: RouteLocationRaw
    /** Renders a plain anchor. */
    href?: string
    /** Native button type. */
    type?: 'button' | 'submit' | 'reset'
    block?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button' },
)

const { t } = useI18n()
const attrs = useAttrs()

if (import.meta.env.DEV && props.iconOnly && !attrs['aria-label'] && !attrs['aria-labelledby']) {
  console.warn('[PButton] `iconOnly` buttons need an `aria-label` (accessible name).')
}

const tag = computed(() => (props.to ? RouterLink : props.href ? 'a' : 'button'))
const inert = computed(() => props.disabled || props.loading)

const variants: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-primary text-on-primary hover:bg-primary-hover',
  soft: 'border-transparent bg-tint text-tint-fg hover:bg-tint-hover shadow-none',
  outline: 'border-border-input bg-surface text-heading hover:bg-surface-muted',
  ghost:
    'border-transparent bg-transparent text-body shadow-none hover:bg-surface-muted hover:text-heading',
  danger: 'border-transparent bg-error-600 text-white hover:bg-error-700',
  ok: 'border-transparent bg-tertiary-700 text-white hover:bg-tertiary-800',
}
const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3 text-[13px] md:min-h-8',
  md: 'min-h-11 px-4 text-sm md:min-h-10',
  lg: 'min-h-12 px-6 text-base',
}
const iconOnlySizes: Record<ButtonSize, string> = {
  sm: 'min-h-11 min-w-11 p-0 md:min-h-8 md:min-w-8',
  md: 'min-h-11 min-w-11 p-0 md:min-h-10 md:min-w-10',
  lg: 'min-h-12 min-w-12 p-0',
}

const classes = computed(() => [
  'inline-flex items-center justify-center gap-2 rounded-md border font-semibold no-underline shadow-sm transition-colors select-none',
  'active:scale-95 motion-reduce:transition-none',
  focusRing,
  variants[props.variant],
  props.iconOnly ? iconOnlySizes[props.size] : sizes[props.size],
  props.block ? 'w-full' : '',
  inert.value ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
])

// Only the element that supports them gets these attributes (RouterLink computes its own href).
const elementAttrs = computed(() =>
  tag.value === 'button'
    ? { type: props.type, disabled: inert.value }
    : tag.value === 'a'
      ? { href: props.href, 'aria-disabled': inert.value || undefined }
      : { to: props.to, 'aria-disabled': inert.value || undefined },
)

function onClick(e: Event) {
  if (inert.value) {
    e.preventDefault()
    e.stopPropagation()
  }
}
</script>

<template>
  <component
    :is="tag"
    v-bind="{ ...attrs, ...elementAttrs }"
    :aria-busy="loading ? true : undefined"
    :class="classes"
    @click="onClick"
  >
    <PIcon
      v-if="loading"
      name="spinner"
      :size="16"
      class="animate-spin motion-reduce:animate-none"
    />
    <PIcon v-else-if="icon" :name="icon" :size="16" />
    <template v-if="!iconOnly">
      <span v-if="loading">{{ t('ui.saving') }}</span>
      <slot v-else />
    </template>
  </component>
</template>
