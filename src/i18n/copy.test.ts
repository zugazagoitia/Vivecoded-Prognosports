import { describe, expect, it } from 'vitest'
import createCommunity from './es/createCommunity.json'
import community from './es/community.json'
import settings from './es/community-settings.json'

const all = (o: unknown): string[] =>
  typeof o === 'string' ? [o] : o && typeof o === 'object' ? Object.values(o).flatMap(all) : []

describe('product copy', () => {
  it('bonus copy says «más puntos», never «más aciertos»', () => {
    const texts = [createCommunity, community, settings].flatMap(all)
    expect(texts).toContain('Bonus al que más puntos consigue en el GP')
    expect(texts.filter((x) => /bonus/i.test(x) && /más aciertos/i.test(x))).toEqual([])
  })
  it('never shows «N de M han pronosticado»', () => {
    const files = import.meta.glob('./es/*.json', { eager: true, import: 'default' })
    const texts = Object.values(files).flatMap(all)
    expect(texts.filter((x) => /\d+ de \d+.*pronosticad|\{n\} de \{m\}/i.test(x))).toEqual([])
  })
})
