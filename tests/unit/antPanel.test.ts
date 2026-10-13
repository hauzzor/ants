import { describe, expect, it } from 'vitest'
import type { Ability } from '../../src/sim/types'
import {
  ABILITY_KINDS,
  ABILITY_KIND_DESCRIPTIONS,
  ABILITY_KIND_LABELS,
  ABILITY_SPECS,
  CONDITION_OPTIONS,
  DIRECTION_OPTIONS,
  FIELD_DESCRIPTIONS,
  OPTION_LABELS,
  PHEROMONE_OPTIONS,
  duplicateAbility,
  freshDraft,
  newAbility,
} from '../../src/ui/abilityDrafts'
import { SIM_SLIDERS, SPECIAL_SLIDERS } from '../../src/ui/sliderMeta'

const ABILITY_FIELD_KEYS = [
  'speed',
  'strength',
  'intensity',
  'pheromone',
  'direction',
  'sensorAngle',
  'sensorDistance',
  'turnRate',
  'condition',
] as const

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

describe('ability editor metadata', () => {
  it('gives every ability kind a human label and description', () => {
    expect(ABILITY_KIND_LABELS).toEqual({
      walk: 'Walk',
      wander: 'Wander',
      emit: 'Emit pheromone',
      follow: 'Follow pheromone',
    })
    expect(ABILITY_KIND_DESCRIPTIONS).toEqual({
      walk: 'Move forward at a constant speed.',
      wander: 'Add random jitter to the heading.',
      emit: 'Deposit a pheromone trail while moving.',
      follow: 'Sense a pheromone trail and steer along or away from it.',
    })
    for (const kind of ABILITY_KINDS) {
      expect(ABILITY_KIND_LABELS[kind].length).toBeGreaterThan(0)
      expect(ABILITY_KIND_DESCRIPTIONS[kind].length).toBeGreaterThan(0)
    }
  })

  it('describes every ability field key', () => {
    for (const key of ABILITY_FIELD_KEYS) {
      const description = FIELD_DESCRIPTIONS[key]
      expect(description, `missing description for ${key}`).toBeTruthy()
      expect((description ?? '').length).toBeGreaterThan(0)
    }
    for (const kind of ABILITY_KINDS) {
      for (const field of ABILITY_SPECS[kind]) {
        expect(FIELD_DESCRIPTIONS[field.key]).toBeTruthy()
      }
    }
  })

  it('keeps select option values stable', () => {
    expect(PHEROMONE_OPTIONS).toEqual(['home', 'food', 'attract', 'repel'])
    expect(DIRECTION_OPTIONS).toEqual(['toward', 'away'])
    expect(CONDITION_OPTIONS).toEqual(['always', 'carrying', 'empty'])
  })

  it('labels every select option value and ability kind option', () => {
    for (const value of [
      ...PHEROMONE_OPTIONS,
      ...DIRECTION_OPTIONS,
      ...CONDITION_OPTIONS,
      ...ABILITY_KINDS,
    ]) {
      const label = OPTION_LABELS[value]
      expect(label, `missing option label for ${value}`).toBeTruthy()
      expect((label ?? '').length).toBeGreaterThan(0)
    }
    expect(OPTION_LABELS).toMatchObject({
      home: 'home trail',
      food: 'food trail',
      attract: 'attract',
      repel: 'repel',
      toward: 'toward scent',
      away: 'away from scent',
      always: 'always',
      carrying: 'while carrying food',
      empty: 'when empty-handed',
    })
  })
})

describe('slider metadata', () => {
  it('lists the expected slider keys', () => {
    expect(SIM_SLIDERS.map((slider) => slider.key)).toEqual([
      'spawnInterval',
      'pheromoneDecay',
      'pheromoneDiffusion',
      'foodScentRate',
    ])
    expect(SPECIAL_SLIDERS.map((slider) => slider.key)).toEqual(['colony', 'speed', 'brush'])
  })

  it('gives every slider a non-empty label and description', () => {
    for (const slider of [...SIM_SLIDERS, ...SPECIAL_SLIDERS]) {
      expect(slider.label.length, `empty label for ${String(slider.key)}`).toBeGreaterThan(0)
      expect(slider.description.length, `empty description for ${String(slider.key)}`).toBeGreaterThan(0)
      expect(slider.min).toBeLessThan(slider.max)
      expect(slider.step).toBeGreaterThan(0)
    }
  })
})
