import { describe, it, expect } from 'vitest'
import { DEFAULT_PARAMS, createParams } from '../../src/sim/params'

describe('DEFAULT_PARAMS', () => {
  it('defines positive numeric values', () => {
    for (const [key, value] of Object.entries(DEFAULT_PARAMS)) {
      expect(typeof value, key).toBe('number')
      expect(Number.isFinite(value), key).toBe(true)
      expect(value, key).toBeGreaterThan(0)
    }
  })

  it('has a positive default colony size', () => {
    expect(DEFAULT_PARAMS.antCount).toBeGreaterThan(0)
  })

  it('defaults the detection threshold to one tenth', () => {
    expect(DEFAULT_PARAMS.pheromoneDetectThreshold).toBe(0.1)
  })

  it('defaults the nest scent to the food scent shape', () => {
    expect(DEFAULT_PARAMS.homeScentRate).toBe(5)
    expect(DEFAULT_PARAMS.homeScentRadius).toBe(16)
  })
})

describe('createParams', () => {
  it('returns a copy of the defaults when given no overrides', () => {
    const params = createParams()
    expect(params).toEqual(DEFAULT_PARAMS)
    expect(params).not.toBe(DEFAULT_PARAMS)
  })

  it('applies overrides without mutating the defaults', () => {
    const params = createParams({ antCount: 5 })
    expect(params.antCount).toBe(5)
    expect(DEFAULT_PARAMS.antCount).not.toBe(5)
  })
})
