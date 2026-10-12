import { afterEach, describe, expect, it } from 'vitest'
import { measureBottomInset } from './bottomInset'

function bar(cls: string, top: number, bottom: number) {
  const el = document.createElement('div')
  el.className = cls
  el.getBoundingClientRect = () =>
    ({ top, bottom, height: bottom - top, left: 0, right: 390, width: 390 }) as DOMRect
  document.body.append(el)
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('measureBottomInset', () => {
  it('is 0 without bars', () => {
    expect(measureBottomInset(document, 844)).toBe(0)
  })

  it('uses the real tab bar height', () => {
    bar('tab-bar', 780, 844)
    expect(measureBottomInset(document, 844, 36)).toBe(64)
  })

  it('stacks a stuck save bar above the tab bar', () => {
    bar('tab-bar', 780, 844)
    bar('x', 640, 764)
    document.querySelector('.x')!.setAttribute('data-bottom-bar', '')
    expect(measureBottomInset(document, 844, 36)).toBe(204)
  })

  it('ignores a flow bar above the panel and hidden bars', () => {
    bar('tab-bar', 780, 844)
    bar('y', 500, 700)
    document.querySelector('.y')!.setAttribute('data-bottom-bar', '')
    bar('tab-bar', 0, 0)
    expect(measureBottomInset(document, 844, 36)).toBe(64)
  })
})
