import { describe, it, expect } from 'vitest'
import { createMetrics, collectionRate } from '../../src/sim/metrics'

describe('createMetrics', () => {
  it('starts at zero', () => {
    expect(createMetrics()).toEqual({ foodCollected: 0, foodInNest: 0, elapsed: 0 })
  })
})

describe('collectionRate', () => {
  it('is zero before any time elapses', () => {
    expect(collectionRate({ foodCollected: 0, foodInNest: 5, elapsed: 0 })).toBe(0)
  })

  it('reports deliveries per second', () => {
    expect(collectionRate({ foodCollected: 10, foodInNest: 20, elapsed: 5 })).toBe(4)
  })
})
