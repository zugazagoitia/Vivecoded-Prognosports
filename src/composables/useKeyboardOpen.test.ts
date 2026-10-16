import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { useKeyboardOpen } from './useKeyboardOpen'

class FakeViewport extends EventTarget {
  height = 800
}

function setup() {
  let open!: ReturnType<typeof useKeyboardOpen>
  const wrapper = mount(
    defineComponent({
      setup() {
        open = useKeyboardOpen()
        return () => h('div', [h('input', { type: 'text' }), h('input', { type: 'checkbox' })])
      },
    }),
    { attachTo: document.body },
  )
  return { wrapper, open }
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('useKeyboardOpen', () => {
  it('is false when visualViewport is unsupported', () => {
    vi.stubGlobal('visualViewport', undefined)
    const { wrapper, open } = setup()
    wrapper.find('input').element.focus()
    expect(open.value).toBe(false)
    wrapper.unmount()
  })

  it('needs both focus on a text field and a shrunk viewport', () => {
    const vv = new FakeViewport()
    vi.stubGlobal('visualViewport', vv)
    const { wrapper, open } = setup()
    const [text, check] = wrapper.findAll('input').map((w) => w.element)
    text!.focus()
    expect(open.value).toBe(false) // desktop: focused but no shrink
    vv.height = 400
    vv.dispatchEvent(new Event('resize'))
    expect(open.value).toBe(true)
    text!.blur()
    expect(open.value).toBe(false)
    check!.focus()
    expect(open.value).toBe(false) // checkboxes do not open a keyboard
    wrapper.unmount()
  })

  it('stops listening after unmount', () => {
    const vv = new FakeViewport()
    vi.stubGlobal('visualViewport', vv)
    const { wrapper, open } = setup()
    wrapper.unmount()
    vv.height = 300
    vv.dispatchEvent(new Event('resize'))
    expect(open.value).toBe(false)
  })
})
