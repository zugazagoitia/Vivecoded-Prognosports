import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { check, initialScripts } from './bundle-budget'

function fakeDist(entry: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'dist-'))
  mkdirSync(join(dir, 'assets'))
  writeFileSync(
    join(dir, 'index.html'),
    '<script type="module" src="/assets/index-a.js"></script><link rel="modulepreload" href="/assets/vendor-b.js">',
  )
  writeFileSync(join(dir, 'assets/index-a.js'), entry)
  writeFileSync(join(dir, 'assets/vendor-b.js'), 'ok')
  return dir
}

describe('bundle budget', () => {
  it('finds the initial scripts', () => {
    expect(
      initialScripts('<script src="/assets/a.js"></script><link href="/assets/b.js">'),
    ).toEqual(['assets/a.js', 'assets/b.js'])
  })

  it('passes a clean build', () => {
    expect(check(fakeDist('console.log(1)'))).toEqual([])
  })

  it('fails when the initial bundle contains ECharts', () => {
    expect(check(fakeDist('import "echarts/core"')).join()).toMatch(/ECharts\/MapLibre/)
  })

  it('fails when a route chunk is over 80 kB gzip', () => {
    const dir = fakeDist('x')
    const noise = Array.from({ length: 400000 }, () => Math.random().toString(36)).join('')
    writeFileSync(join(dir, 'assets/big-c.js'), noise)
    expect(check(dir).join()).toMatch(/big-c\.js/)
  })
})
