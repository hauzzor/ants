import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/sim/rng'

describe('createRng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng(123)
    const b = createRng(123)
    const seqA = Array.from({ length: 32 }, () => a.next())
    const seqB = Array.from({ length: 32 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = createRng(1)
    const b = createRng(2)
    const seqA = Array.from({ length: 8 }, () => a.next())
    const seqB = Array.from({ length: 8 }, () => b.next())
    expect(seqA).not.toEqual(seqB)
  })

  it('returns values within [0, 1)', () => {
    const rng = createRng(42)
    for (let i = 0; i < 1000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('keeps range within bounds', () => {
    const rng = createRng(7)
    for (let i = 0; i < 1000; i++) {
      const v = rng.range(5, 10)
      expect(v).toBeGreaterThanOrEqual(5)
      expect(v).toBeLessThan(10)
    }
  })

  it('returns inclusive integers covering the whole range', () => {
    const rng = createRng(99)
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const v = rng.int(1, 4)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(1)
      expect(v).toBeLessThanOrEqual(4)
      seen.add(v)
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4])
  })

  it('returns angles within [0, 2*PI)', () => {
    const rng = createRng(2024)
    for (let i = 0; i < 1000; i++) {
      const v = rng.angle()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(Math.PI * 2)
    }
  })

  it('advances internal state on each draw', () => {
    const rng = createRng(5)
    const before = rng.state
    rng.next()
    expect(rng.state).not.toBe(before)
  })
})
