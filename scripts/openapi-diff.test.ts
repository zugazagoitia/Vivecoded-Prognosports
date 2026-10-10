import { describe, expect, it } from 'vitest'
import { diffSpecs, formatChanges, normalise, type Json } from './openapi-diff'

const base: Json = {
  openapi: '3.0.1',
  paths: { '/v2/gps': { get: { summary: 'List', responses: { '200': { description: 'ok' } } } } },
  components: { schemas: { Gp: { required: ['id', 'name'], properties: { id: {}, name: {} } } } },
}

describe('openapi diff', () => {
  it('ignores key order and scalar array order', () => {
    const reordered: Json = {
      components: {
        schemas: { Gp: { properties: { name: {}, id: {} }, required: ['name', 'id'] } },
      },
      paths: {
        '/v2/gps': { get: { responses: { '200': { description: 'ok' } }, summary: 'List' } },
      },
      openapi: '3.0.1',
    }
    expect(diffSpecs(base, reordered)).toEqual([])
    expect(normalise(reordered)).toEqual(normalise(base))
  })

  it('flags a removed path as breaking', () => {
    const after = structuredClone(base) as { paths: Record<string, Json> }
    delete after.paths['/v2/gps']
    const changes = diffSpecs(base, after)
    expect(changes.length).toBeGreaterThan(0)
    expect(changes.some((c) => c.kind === 'removed' && c.breaking)).toBe(true)
  })

  it('treats a new required entry as breaking and a new summary as informational', () => {
    const after = structuredClone(base) as {
      components: { schemas: { Gp: { required: string[] } } }
      paths: { '/v2/gps': { get: { summary: string } } }
    }
    after.components.schemas.Gp.required.push('code')
    after.paths['/v2/gps'].get.summary = 'List all'
    const changes = diffSpecs(base, after)
    expect(changes.filter((c) => c.breaking)).toHaveLength(1)
    expect(changes.filter((c) => !c.breaking)).toHaveLength(1)
    expect(formatChanges(changes)).toMatch(/^\[BREAKING\?\]/)
  })
})
