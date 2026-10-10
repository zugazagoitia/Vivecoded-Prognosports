import { effectScope } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/errors'
import { afterVerifyDestination, formatCountdown, useCountdown, verifyResult } from './verify'

afterEach(() => vi.useRealTimers())

describe('formatCountdown', () => {
  it('formats m:ss', () => {
    expect(formatCountdown(42)).toBe('0:42')
    expect(formatCountdown(65)).toBe('1:05')
    expect(formatCountdown(0)).toBe('0:00')
    expect(formatCountdown(-3)).toBe('0:00')
  })
})

describe('useCountdown', () => {
  it('decrements, stops at 0 and restarts', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    const scope = effectScope()
    const c = scope.run(() => useCountdown(3))!
    expect(c.remaining.value).toBe(3)
    vi.advanceTimersByTime(1000)
    expect(c.remaining.value).toBe(2)
    vi.advanceTimersByTime(5000)
    expect(c.remaining.value).toBe(0)
    expect(c.finished.value).toBe(true)
    c.restart()
    expect(c.remaining.value).toBe(3)
    expect(c.finished.value).toBe(false)
    scope.stop()
  })

  it('a zero countdown is finished at once', () => {
    const scope = effectScope()
    expect(scope.run(() => useCountdown(0))!.finished.value).toBe(true)
    scope.stop()
  })
})

describe('verifyResult', () => {
  it('maps rejected codes and generic errors', () => {
    expect(verifyResult(new ApiError(400, undefined, 'x', 'http'))).toBe('code')
    expect(verifyResult(new ApiError(403, undefined, 'x', 'http'))).toBe('code')
    expect(verifyResult(new ApiError(500, undefined, 'x', 'http'))).toBe('error')
    expect(verifyResult(new ApiError(0, undefined, 'x', 'network'))).toBe('error')
    expect(verifyResult(new Error('x'))).toBe('error')
  })
})

describe('afterVerifyDestination', () => {
  it('prefers a safe redirect, then /home for members, else shows success', () => {
    expect(afterVerifyDestination('/circuits', false)).toBe('/circuits')
    expect(afterVerifyDestination('//evil.com', false)).toBeNull()
    expect(afterVerifyDestination('/verificar', false)).toBeNull()
    expect(afterVerifyDestination(undefined, true)).toBe('/home')
    expect(afterVerifyDestination(undefined, false)).toBeNull()
  })
})
