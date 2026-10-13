import { describe, expect, it } from 'vitest'
import type { Ability } from '../../src/sim/types'
import {
  ABILITY_KINDS,
  duplicateAbility,
  freshDraft,
  newAbility,
} from '../../src/ui/abilityDrafts'

describe('ability defaults', () => {
  it('defines a kind for every editor option', () => {
    expect(ABILITY_KINDS).toEqual(['walk', 'wander', 'emit', 'follow'])
  })

  it('applies specified defaults for new abilities', () => {
    expect(newAbility('walk')).toEqual({ kind: 'walk', speed: 26 })
    expect(newAbility('wander')).toEqual({ kind: 'wander', strength: 1.2 })
    expect(newAbility('emit')).toEqual({
      kind: 'emit',
      pheromone: 'home',
      intensity: 8,
      condition: 'empty',
    })
    expect(newAbility('follow')).toEqual({
      kind: 'follow',
      pheromone: 'food',
      direction: 'toward',
      sensorAngle: 0.6,
      sensorDistance: 6,
      turnRate: 4,
      condition: 'empty',
    })
  })

  it('duplicates an ability without shared reference', () => {
    const original: Ability = { kind: 'walk', speed: 10 }
    const copy = duplicateAbility(original)
    expect(copy).toEqual(original)
    expect(copy).not.toBe(original)
  })

  it('copies abilities when creating a fresh draft', () => {
    const base = {
      name: 'Blank',
      lifespan: 100,
      abilities: [{ kind: 'walk', speed: 5 } as Ability],
    }
    const draft = freshDraft(base)
    const first = draft.abilities[0]
    if (first && first.kind === 'walk') {
      first.speed = 9
    } else {
      throw new Error('expected walk ability')
    }
    const copied = base.abilities[0]
    if (!copied || copied.kind !== 'walk') throw new Error('expected walk ability')
    expect(copied.speed).toBe(5)
  })
})
