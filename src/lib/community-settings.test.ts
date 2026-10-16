import { describe, expect, it } from 'vitest'
import {
  accessText,
  canAccessSettings,
  cropRect,
  imageFileSchema,
  MAX_SOURCE_BYTES,
  parseUsages,
  usagesText,
  visibleSections,
} from './community-settings'

describe('community settings logic (H6)', () => {
  it('usagesText pluralises and tells public from private', () => {
    expect(usagesText('Clásica 2026', true, 4)).toBe(
      'Conjunto «Clásica 2026», público y usado por 4 comunidades.',
    )
    expect(usagesText('Clásica 2026', true, 1)).toBe(
      'Conjunto «Clásica 2026», público y usado por 1 comunidad.',
    )
    expect(usagesText('Mío', false, undefined)).toBe('Conjunto «Mío», privado.')
  })
  it('accessText', () => {
    expect(accessText(false)).toBe('Cerrada · con invitación')
    expect(accessText(true)).toBe('Abierta · cualquiera puede unirse')
  })
  it('parseUsages tolerates several shapes', () => {
    expect(parseUsages(4)).toBe(4)
    expect(parseUsages('3')).toBe(3)
    expect(parseUsages([{}, {}])).toBe(2)
    expect(parseUsages({ count: 5 })).toBe(5)
    expect(parseUsages({ usages: [1] })).toBe(1)
    expect(parseUsages('ok')).toBeUndefined()
    expect(parseUsages(null)).toBeUndefined()
  })
  it('canAccessSettings follows the permissions', () => {
    expect(canAccessSettings({ settings: true })).toBe(true)
    expect(canAccessSettings({ settings: false })).toBe(false)
  })
  it('cropRect centres, zooms and clamps', () => {
    expect(cropRect(400, 200, 1, 0, 0)).toEqual({ sx: 100, sy: 0, sw: 200 })
    expect(cropRect(400, 200, 2, 0, 0)).toEqual({ sx: 150, sy: 50, sw: 100 })
    expect(cropRect(400, 200, 1, 1, 0).sx).toBe(200)
    expect(cropRect(400, 200, 1, -9, 0).sx).toBe(0)
    expect(cropRect(100, 100, 0.2, 0, 0).sw).toBe(100)
  })
  it('imageFileSchema rejects non-images and huge files', () => {
    const png = new File(['x'], 'a.png', { type: 'image/png' })
    expect(imageFileSchema.safeParse({ file: png }).success).toBe(true)
    const txt = new File(['x'], 'a.txt', { type: 'text/plain' })
    expect(imageFileSchema.safeParse({ file: txt }).success).toBe(false)
    const big = new File([new Uint8Array(MAX_SOURCE_BYTES + 1)], 'b.png', { type: 'image/png' })
    expect(imageFileSchema.safeParse({ file: big }).success).toBe(false)
    expect(imageFileSchema.safeParse({}).success).toBe(false)
  })
})

describe('visibleSections', () => {
  it('shows image only to the creator and invitation only with the permission', () => {
    expect(visibleSections({ editImage: true, recreateInvitation: true })).toEqual([
      'imagen',
      'invitacion',
      'datos',
      'reglas',
      'miembros',
    ])
    expect(visibleSections({ editImage: false, recreateInvitation: false })).toEqual([
      'datos',
      'reglas',
      'miembros',
    ])
    expect(visibleSections({ editImage: false, recreateInvitation: true })).toContain('invitacion')
  })
})
