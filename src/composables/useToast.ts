import { h } from 'vue'
import { toast } from 'vue-sonner'
import ToastCard, { type ToastAction } from '@/components/ui/ToastCard.vue'

export const TOAST_DURATION = { success: 4000, info: 4000, error: 8000 } as const

type Kind = 'success' | 'error' | 'info'
export interface ToastOptions {
  /** An error with an action never autocloses. */
  action?: ToastAction
}

/** Autoclose time in ms; Infinity = stays until dismissed. */
export function durationFor(kind: Kind, opts: ToastOptions = {}): number {
  return kind === 'error' && opts.action ? Number.POSITIVE_INFINITY : TOAST_DURATION[kind]
}

function show(kind: Kind, title: string, description?: string, opts: ToastOptions = {}) {
  return toast.custom(h(ToastCard, { kind, title, description, action: opts.action }), {
    duration: durationFor(kind, opts),
    unstyled: true,
  })
}

export const toaster = {
  success: (title: string, description?: string, opts?: ToastOptions) =>
    show('success', title, description, opts),
  error: (title: string, description?: string, opts?: ToastOptions) =>
    show('error', title, description, opts),
  info: (title: string, description?: string, opts?: ToastOptions) =>
    show('info', title, description, opts),
}

export function useToast() {
  return toaster
}
