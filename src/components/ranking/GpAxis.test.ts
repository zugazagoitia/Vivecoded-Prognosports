/* eslint-disable @typescript-eslint/unbound-method -- `emitted` is used destructured */
import { screen } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import GpAxis from './GpAxis.vue'

const props = {
  codes: ['AUS', 'CHN', 'JPN'],
  names: ['Australia', 'China', 'Japón'],
  width: 400,
  padLeft: 40,
  padRight: 20,
  modelValue: 1,
}

describe('GpAxis', () => {
  it('one pressable button per GP in a labelled group; the pinned one is aria-pressed', async () => {
    await renderWithProviders(GpAxis, { props })
    expect(screen.getByRole('group')).toBeTruthy()
    const buttons = screen.getAllByRole('button')
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false'])
    expect(buttons[2]!.getAttribute('aria-label')).toContain('Japón')
  })

  it('aligns with the chart plot area', async () => {
    await renderWithProviders(GpAxis, { props })
    const style = screen.getByRole('group').getAttribute('style')!
    expect(style).toContain('10%')
    expect(style).toContain('85%')
  })

  it('clicking pins that GP', async () => {
    const { user, emitted } = await renderWithProviders(GpAxis, { props })
    await user.click(screen.getAllByRole('button')[0]!)
    expect(emitted()['update:modelValue']).toEqual([[0]])
  })

  it('arrow keys move the pin and focus, clamped at the ends; other keys are ignored', async () => {
    const { user, emitted } = await renderWithProviders(GpAxis, {
      props: { ...props, modelValue: 2 },
    })
    screen.getAllByRole('button')[2]!.focus()
    await user.keyboard('{ArrowRight}')
    await user.keyboard('{ArrowLeft}')
    const ev = emitted()['update:modelValue']!
    expect(ev).toEqual([[1]]) // ArrowRight at the last GP is clamped: no change, no event
    expect(document.activeElement).toBe(screen.getAllByRole('button')[1])
    await user.keyboard('a')
    expect(emitted()['update:modelValue']).toHaveLength(1)
  })
})
