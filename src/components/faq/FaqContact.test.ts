import { screen, waitFor } from '@testing-library/vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CONTACT_EMAIL } from '@/content/contact'
import { renderWithProviders } from '@/test/render'
import FaqContact from './FaqContact.vue'

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
const copy = vi.hoisted(() => vi.fn())
vi.mock('@vueuse/core', () => ({ useClipboard: () => ({ copy }) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))

beforeEach(() => {
  toast.success.mockClear()
  toast.error.mockClear()
})

describe('FaqContact', () => {
  it('is a labelled region with a mailto link to the contact address', async () => {
    await renderWithProviders(FaqContact)
    expect(screen.getByRole('region')).toBeTruthy()
    const link = screen.getByRole('link', { name: CONTACT_EMAIL })
    expect(link.getAttribute('href')).toBe(`mailto:${CONTACT_EMAIL}`)
  })

  it('copies the address and confirms with a toast', async () => {
    const { user } = await renderWithProviders(FaqContact)
    await user.click(screen.getByRole('button'))
    await waitFor(() => expect(toast.success).toHaveBeenCalled())
    expect(copy).toHaveBeenCalledWith(CONTACT_EMAIL)
  })

  it('shows an error toast when copying fails; the address stays visible', async () => {
    copy.mockRejectedValueOnce(new Error('denied'))
    const { user } = await renderWithProviders(FaqContact)
    await user.click(screen.getByRole('button'))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: CONTACT_EMAIL })).toBeTruthy()
  })
})
