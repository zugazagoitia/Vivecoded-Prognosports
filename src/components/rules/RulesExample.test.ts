import { screen, within } from '@testing-library/vue'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { CLASSIC_RULESET, DEMO_PREDICTION } from './classicRuleset'
import RulesExample from './RulesExample.vue'

const props = { rules: CLASSIC_RULESET.data }
const total = () => Number(screen.getByTestId('rules-total').textContent)
const moves = (dir: 'up' | 'down') => [
  ...document.querySelectorAll<HTMLButtonElement>(`[data-move$="-${dir}"]`),
]
const order = () => moves('up').map((b) => b.getAttribute('data-move')!.replace('-up', ''))

describe('RulesExample', () => {
  it('lists the demo prediction in order with a caption and scored rows', async () => {
    await renderWithProviders(RulesExample, { props })
    expect(order()).toEqual([...DEMO_PREDICTION])
    const body = screen.getAllByRole('rowgroup')[1]!
    expect(within(body).getAllByRole('row')).toHaveLength(DEMO_PREDICTION.length)
    expect(screen.getByRole('table').querySelector('caption')).toBeTruthy()
  })

  it('disables "up" on the first row and "down" on the last', async () => {
    await renderWithProviders(RulesExample, { props })
    expect(moves('up')[0]!.disabled).toBe(true)
    expect(moves('down').at(-1)!.disabled).toBe(true)
    expect(moves('up')[1]!.disabled).toBe(false)
  })

  it('moving keeps focus on the moved driver, can change the total and reset restores', async () => {
    const { user } = await renderWithProviders(RulesExample, { props })
    const before = total()
    const first = [...DEMO_PREDICTION]
    await user.click(moves('down')[0]!)
    expect(order()).toEqual([first[1], first[0], ...first.slice(2)])
    expect(document.activeElement?.getAttribute('data-move')).toBe(`${first[0]}-down`)
    await user.click(
      screen.getByRole('button', { name: /reiniciar|restablecer|volver|restaurar/i }),
    )
    expect(order()).toEqual(first)
    expect(total()).toBe(before)
  })

  it('moving the first driver up keeps focus on a neighbour button at the edge', async () => {
    const { user } = await renderWithProviders(RulesExample, { props })
    await user.click(moves('up')[1]!) // second goes to the top: its up is now disabled
    expect(document.activeElement?.getAttribute('data-move')).toBe(`${DEMO_PREDICTION[1]}-down`)
  })
})
