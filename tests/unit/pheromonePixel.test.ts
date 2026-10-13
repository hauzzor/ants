import { describe, it, expect } from 'vitest'
import type { PheromoneKind } from '../../src/sim'
import { pheromonePixel } from '../../src/render/pheromonePixel'

const ALL: ReadonlySet<PheromoneKind> = new Set([
  'home',
  'food',
  'attract',
  'repel',
])

function legacyPixel(values: {
  home: number
  food: number
  attract: number
  repel: number
}): { r: number; g: number; b: number; a: number } {
  const nh = values.home / (values.home + 3)
  const nf = values.food / (values.food + 3)
  const na = values.attract / (values.attract + 3)
  const nr = values.repel / (values.repel + 3)
  return {
    r: Math.min(255, (nf * 0.25 + na + nr + nh * 0.15) * 255),
    g: Math.min(255, (nf * 0.9 + nh * 0.5 + nr * 0.55 + na * 0.3) * 255),
    b: Math.min(255, (nh + na * 0.85 + nf * 0.15) * 255),
    a: Math.min(235, (nh + nf + na + nr) * 190),
  }
}

function expectRgba(
  actual: { r: number; g: number; b: number; a: number },
  expected: { r: number; g: number; b: number; a: number },
): void {
  expect(actual.r).toBeCloseTo(expected.r, 10)
  expect(actual.g).toBeCloseTo(expected.g, 10)
  expect(actual.b).toBeCloseTo(expected.b, 10)
  expect(actual.a).toBeCloseTo(expected.a, 10)
}

describe('pheromonePixel', () => {
  it('matches the legacy formula when all kinds are visible', () => {
    const samples = [
      { home: 0, food: 0, attract: 0, repel: 0 },
      { home: 3, food: 6, attract: 1.5, repel: 2 },
      { home: 10, food: 0.5, attract: 0, repel: 7 },
    ]
    for (const values of samples) {
      expectRgba(pheromonePixel(values, ALL), legacyPixel(values))
    }
  })

  it('returns zero for an all-zero input', () => {
    expect(pheromonePixel({ home: 0, food: 0, attract: 0, repel: 0 }, ALL)).toEqual(
      { r: 0, g: 0, b: 0, a: 0 },
    )
  })

  it('treats a hidden kind as if its value were zero', () => {
    const values = { home: 5, food: 7, attract: 2, repel: 3 }
    const onlyHome = { home: 5, food: 0, attract: 0, repel: 0 }
    expectRgba(
      pheromonePixel(values, new Set<PheromoneKind>(['home'])),
      pheromonePixel(onlyHome, ALL),
    )
  })

  it('yields zero alpha for an empty visible set', () => {
    const pixel = pheromonePixel(
      { home: 5, food: 7, attract: 2, repel: 3 },
      new Set<PheromoneKind>(),
    )
    expect(pixel.a).toBe(0)
    expect(pixel.r).toBe(0)
    expect(pixel.g).toBe(0)
    expect(pixel.b).toBe(0)
  })

  it('drives home-only output from home alone', () => {
    const values = { home: 5, food: 7, attract: 2, repel: 3 }
    const homeOnly = pheromonePixel(values, new Set<PheromoneKind>(['home']))
    const explicitHome = pheromonePixel(
      { home: 5, food: 0, attract: 0, repel: 0 },
      ALL,
    )
    expect(homeOnly.b).toBeGreaterThan(0)
    expectRgba(homeOnly, explicitHome)
  })

  it('does not mutate the input values', () => {
    const values = { home: 5, food: 7, attract: 2, repel: 3 }
    const snapshot = { ...values }
    pheromonePixel(values, new Set<PheromoneKind>(['food', 'repel']))
    expect(values).toEqual(snapshot)
  })
})
