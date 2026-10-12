import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import FlagPanel from './FlagPanel.vue'

const OPEN_KEY = 'prognosports.flagPanel.open'

describe('FlagPanel', () => {
  beforeEach(() => localStorage.clear())

  it('starts collapsed as a bubble with aria-expanded=false', () => {
    const w = mount(FlagPanel)
    const bubble = w.get('button.bubble')
    expect(bubble.attributes('aria-expanded')).toBe('false')
    expect(w.find('[role="switch"]').exists()).toBe(false)
  })

  it('expands and collapses on click and persists the state', async () => {
    const w = mount(FlagPanel)
    await w.get('button.bubble').trigger('click')
    expect(w.get('button.bubble').attributes('aria-expanded')).toBe('true')
    expect(w.findAll('[role="switch"]').length).toBeGreaterThan(0)
    expect(localStorage.getItem(OPEN_KEY)).toBe('1')
    await w.get('button.bubble').trigger('click')
    expect(w.find('[role="switch"]').exists()).toBe(false)
    expect(localStorage.getItem(OPEN_KEY)).toBe('0')
  })

  it('restores the open state from storage', () => {
    localStorage.setItem(OPEN_KEY, '1')
    const w = mount(FlagPanel)
    expect(w.get('button.bubble').attributes('aria-expanded')).toBe('true')
  })
})
