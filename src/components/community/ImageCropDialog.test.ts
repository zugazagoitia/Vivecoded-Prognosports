/* eslint-disable @typescript-eslint/unbound-method -- `emitted` is used destructured */
import { screen, waitFor } from '@testing-library/vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CROP_OUTPUT } from '@/lib/community-settings'
import { renderWithProviders } from '@/test/render'
import ImageCropDialog from './ImageCropDialog.vue'

const drawImage = vi.fn()
let fail = false
let blobResult: Blob | null = new Blob(['x'], { type: 'image/jpeg' })

class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = 800
  naturalHeight = 600
  set src(_: string) {
    queueMicrotask(() => (fail ? this.onerror?.() : this.onload?.()))
  }
}

beforeEach(() => {
  fail = false
  blobResult = new Blob(['x'], { type: 'image/jpeg' })
  drawImage.mockClear()
  vi.stubGlobal('Image', FakeImage)
  URL.createObjectURL = vi.fn(() => 'blob:fake')
  URL.revokeObjectURL = vi.fn()
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage })) as never
  HTMLCanvasElement.prototype.toBlob = vi.fn((cb: BlobCallback) => cb(blobResult))
})
afterEach(() => vi.unstubAllGlobals())

const file = new File(['img'], 'logo.png', { type: 'image/png' })
const open = (extra: Record<string, unknown> = {}) =>
  renderWithProviders(ImageCropDialog, { props: { open: true, file, ...extra } })

describe('ImageCropDialog', () => {
  it('is an accessible dialog with a labelled preview and three sliders', async () => {
    await open()
    expect(await screen.findByRole('dialog')).toBeTruthy()
    expect(screen.getByRole('img')).toBeTruthy()
    expect(screen.getAllByRole('slider')).toHaveLength(3)
  })

  it('enables controls and draws the preview once the image loads', async () => {
    await open()
    const confirm = await screen.findByRole('button', { name: /recortar/i })
    await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false))
    expect(drawImage).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalledWith(file)
  })

  it('emits a 512px JPEG blob on confirm', async () => {
    const { user, emitted } = await open()
    const confirm = await screen.findByRole('button', { name: /recortar/i })
    await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false))
    await user.click(confirm)
    expect(emitted().crop).toEqual([[blobResult]])
    const last = drawImage.mock.calls.at(-1)!
    expect(last.slice(5)).toEqual([0, 0, CROP_OUTPUT, CROP_OUTPUT])
  })

  it('shows an error alert when the image cannot be decoded and keeps confirm disabled', async () => {
    fail = true
    await open()
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: /recortar/i }).disabled).toBe(true)
  })

  it('shows an error when encoding yields no blob', async () => {
    blobResult = null
    const { user, emitted } = await open()
    const confirm = await screen.findByRole('button', { name: /recortar/i })
    await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false))
    await user.click(confirm)
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(emitted().crop).toBeUndefined()
  })

  it('cancel closes the dialog', async () => {
    const { user, emitted } = await open()
    await user.click(await screen.findByRole('button', { name: /cancelar/i }))
    expect(emitted()['update:open']).toEqual([[false]])
  })

  it('does not load anything without a file', async () => {
    await renderWithProviders(ImageCropDialog, { props: { open: true } })
    await screen.findByRole('dialog')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})
