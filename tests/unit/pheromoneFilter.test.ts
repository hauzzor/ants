import { describe, expect, it } from 'vitest'
import { PHEROMONE_KINDS } from '../../src/sim'
import type { PheromoneKind } from '../../src/sim'
import { nextVisible, pheromoneToggleRow } from '../../src/ui/pheromoneFilter'

const LABELS: Record<PheromoneKind, string> = {
  home: 'Home trail',
  food: 'Food trail',
  attract: 'Attract',
  repel: 'Repel',
}

describe('pheromoneToggleRow', () => {
  it('renders a labelled checkbox with swatch and testid for every kind', () => {
    for (const kind of PHEROMONE_KINDS) {
      const html = pheromoneToggleRow(kind, true)
      expect(html, `testid for ${kind}`).toContain(`data-testid="pheromone-toggle-${kind}"`)
      expect(html, `input type for ${kind}`).toContain('type="checkbox"')
      expect(html, `swatch for ${kind}`).toContain(`class="sw ${kind}"`)
      expect(html, `label for ${kind}`).toContain(LABELS[kind])
    }
  })

  it('reflects the checked state', () => {
    for (const kind of PHEROMONE_KINDS) {
      expect(pheromoneToggleRow(kind, true), `checked ${kind}`).toContain(' checked')
      expect(pheromoneToggleRow(kind, false), `unchecked ${kind}`).not.toContain(' checked')
    }
  })

  it('produces unique markup for the four kinds', () => {
    const rows = PHEROMONE_KINDS.map((kind) => pheromoneToggleRow(kind, true))
    expect(new Set(rows).size).toBe(rows.length)
  })
})

describe('nextVisible', () => {
  it('adds a kind that is absent', () => {
    const next = nextVisible(new Set<PheromoneKind>(), 'home', true)
    expect([...next]).toEqual(['home'])
  })

  it('removes a kind that is present', () => {
    const next = nextVisible(new Set<PheromoneKind>(['home', 'food']), 'home', false)
    expect(next.has('home')).toBe(false)
    expect(next.has('food')).toBe(true)
  })

  it('allows multiple kinds without exclusivity', () => {
    let set: ReadonlySet<PheromoneKind> = new Set<PheromoneKind>()
    set = nextVisible(set, 'home', true)
    set = nextVisible(set, 'food', true)
    set = nextVisible(set, 'attract', true)
    expect(set.size).toBe(3)
    expect([...set].sort()).toEqual(['attract', 'food', 'home'])
  })

  it('yields an empty set after removing every kind', () => {
    let set: ReadonlySet<PheromoneKind> = new Set(PHEROMONE_KINDS)
    for (const kind of PHEROMONE_KINDS) set = nextVisible(set, kind, false)
    expect(set.size).toBe(0)
  })

  it('is idempotent when adding a present kind', () => {
    const next = nextVisible(new Set<PheromoneKind>(['home']), 'home', true)
    expect([...next]).toEqual(['home'])
  })

  it('is idempotent when removing an absent kind', () => {
    const next = nextVisible(new Set<PheromoneKind>(['home']), 'food', false)
    expect([...next]).toEqual(['home'])
  })

  it('does not mutate the input set', () => {
    const base = new Set<PheromoneKind>(['home'])
    nextVisible(base, 'food', true)
    expect([...base]).toEqual(['home'])
  })
})
