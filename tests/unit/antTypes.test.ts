import { describe, it, expect } from 'vitest'
import {
  BLANK_TYPE,
  cloneAbilities,
  sanitizeAbilities,
  createAntType,
  updateAntType,
  deleteAntType,
  getAntTypes,
  getAntType,
  setNestType,
} from '../../src/sim/antTypes'
import { createWorld } from '../../src/sim/world'
import type { Ability, AntTypeDraft } from '../../src/sim/types'

function emptyWorld() {
  return createWorld({ params: { antCount: 0 } })
}

function draft(overrides: Partial<AntTypeDraft> = {}): AntTypeDraft {
  return { name: 'Runner', lifespan: 60, abilities: [], ...overrides }
}

describe('BLANK_TYPE', () => {
  it('is a do-nothing type with a 60s lifespan', () => {
    expect(BLANK_TYPE).toEqual({
      id: 'blank',
      name: 'Blank',
      lifespan: 60,
      abilities: [],
    })
  })
})

describe('sanitizeAbilities', () => {
  it('clamps every numeric field', () => {
    const abilities = sanitizeAbilities([
      { kind: 'walk', speed: 200 },
      { kind: 'wander', strength: -3 },
      { kind: 'emit', pheromone: 'home', intensity: 100, condition: 'always' },
      {
        kind: 'follow',
        pheromone: 'food',
        direction: 'toward',
        sensorAngle: 9,
        sensorDistance: -1,
        turnRate: 50,
        condition: 'empty',
      },
    ])

    expect(abilities).toEqual([
      { kind: 'walk', speed: 80 },
      { kind: 'wander', strength: 0 },
      { kind: 'emit', pheromone: 'home', intensity: 40, condition: 'always' },
      {
        kind: 'follow',
        pheromone: 'food',
        direction: 'toward',
        sensorAngle: 2,
        sensorDistance: 0,
        turnRate: 12,
        condition: 'empty',
      },
    ])
  })

  it('drops unknown kinds', () => {
    const unknown = [{ kind: 'teleport', power: 9 }] as unknown as Ability[]
    expect(sanitizeAbilities(unknown)).toEqual([])
  })

  it('copies each ability into a fresh object', () => {
    const input: Ability[] = [{ kind: 'walk', speed: 5 }]
    const output = sanitizeAbilities(input)
    expect(output).toEqual(input)
    expect(output[0]).not.toBe(input[0])
  })

  it('drops non-object ability entries', () => {
    const input = [null, 'walk', 7, undefined, { kind: 'walk', speed: 5 }]
    expect(sanitizeAbilities(input)).toEqual([{ kind: 'walk', speed: 5 }])
  })

  it('clamps and keeps valid abilities', () => {
    expect(
      sanitizeAbilities([
        { kind: 'walk', speed: 200 },
        { kind: 'wander', strength: -3 },
        { kind: 'emit', pheromone: 'repel', intensity: 100, condition: 'empty' },
      ]),
    ).toEqual([
      { kind: 'walk', speed: 80 },
      { kind: 'wander', strength: 0 },
      { kind: 'emit', pheromone: 'repel', intensity: 40, condition: 'empty' },
    ])
  })

  it('drops emit abilities when the pheromone kind is invalid', () => {
    const input = [
      { kind: 'emit', pheromone: 'hone', intensity: 5, condition: 'always' },
    ]
    expect(sanitizeAbilities(input)).toEqual([])
  })

  it('drops emit abilities when the condition is invalid or missing', () => {
    const input = [
      { kind: 'emit', pheromone: 'home', intensity: 5, condition: 'sometimes' },
      { kind: 'emit', pheromone: 'home', intensity: 5 },
    ]
    expect(sanitizeAbilities(input)).toEqual([])
  })

  it('drops follow abilities when direction, pheromone or condition is invalid', () => {
    const input = [
      {
        kind: 'follow',
        pheromone: 'food',
        direction: 'sideways',
        sensorAngle: 0.5,
        sensorDistance: 4,
        turnRate: 2,
        condition: 'always',
      },
      {
        kind: 'follow',
        pheromone: 'nope',
        direction: 'toward',
        sensorAngle: 0.5,
        sensorDistance: 4,
        turnRate: 2,
        condition: 'always',
      },
      {
        kind: 'follow',
        pheromone: 'food',
        direction: 'toward',
        sensorAngle: 0.5,
        sensorDistance: 4,
        turnRate: 2,
        condition: 'rarely',
      },
    ]
    expect(sanitizeAbilities(input)).toEqual([])
  })

  it('drops abilities whose numeric fields are not finite numbers', () => {
    const input = [
      { kind: 'walk', speed: NaN },
      { kind: 'walk', speed: Infinity },
      { kind: 'walk', speed: '5' },
      { kind: 'wander', strength: Infinity },
      { kind: 'wander', strength: '3' },
      { kind: 'emit', pheromone: 'home', intensity: '8', condition: 'always' },
      { kind: 'emit', pheromone: 'home', condition: 'always' },
      { kind: 'emit', pheromone: 'home', intensity: NaN, condition: 'always' },
      {
        kind: 'follow',
        pheromone: 'home',
        direction: 'toward',
        sensorAngle: NaN,
        sensorDistance: 4,
        turnRate: 2,
        condition: 'always',
      },
      {
        kind: 'follow',
        pheromone: 'home',
        direction: 'toward',
        sensorAngle: 0.5,
        sensorDistance: Infinity,
        turnRate: 2,
        condition: 'always',
      },
      {
        kind: 'follow',
        pheromone: 'home',
        direction: 'toward',
        sensorAngle: 0.5,
        sensorDistance: 4,
        turnRate: '2',
        condition: 'always',
      },
    ]
    expect(sanitizeAbilities(input)).toEqual([])
  })

  it('never produces NaN or Infinity in a surviving ability', () => {
    const abilities = sanitizeAbilities([
      { kind: 'walk', speed: 40 },
      { kind: 'wander', strength: 2 },
      { kind: 'emit', pheromone: 'food', intensity: 8, condition: 'carrying' },
      {
        kind: 'follow',
        pheromone: 'home',
        direction: 'away',
        sensorAngle: 0.5,
        sensorDistance: 6,
        turnRate: 3,
        condition: 'empty',
      },
    ])
    expect(abilities).toHaveLength(4)
    for (const ability of abilities) {
      for (const value of Object.values(ability as unknown as Record<string, unknown>)) {
        if (typeof value === 'number') {
          expect(Number.isFinite(value)).toBe(true)
        }
      }
    }
  })
})

describe('cloneAbilities', () => {
  it('deep copies without clamping', () => {
    const input: Ability[] = [{ kind: 'walk', speed: 999 }]
    const output = cloneAbilities(input)
    expect(output).toEqual(input)
    expect(output).not.toBe(input)
    expect(output[0]).not.toBe(input[0])
  })
})

describe('createAntType', () => {
  it('assigns evolving custom ids and stores the type', () => {
    const world = emptyWorld()
    const first = createAntType(world, draft({ name: 'First' }))
    const second = createAntType(world, draft({ name: 'Second' }))

    expect(first.id).toBe('custom-1')
    expect(second.id).toBe('custom-2')
    expect(getAntType(world, 'custom-1')).toBe(first)
    expect(getAntType(world, 'custom-2')).toBe(second)
  })

  it('continues numbering from provided types', () => {
    const world = createWorld({
      params: { antCount: 0 },
      types: {
        blank: { ...BLANK_TYPE },
        'custom-4': { id: 'custom-4', name: 'Four', lifespan: 60, abilities: [] },
      },
    })
    expect(createAntType(world, draft()).id).toBe('custom-5')
  })

  it('trims names and falls back to Custom ant', () => {
    const world = emptyWorld()
    expect(createAntType(world, draft({ name: '   ' })).name).toBe('Custom ant')
    expect(createAntType(world, draft({ name: '  Scout  ' })).name).toBe('Scout')
  })

  it('caps names at 40 characters', () => {
    const world = emptyWorld()
    const long = 'x'.repeat(100)
    expect(createAntType(world, draft({ name: long })).name).toHaveLength(40)
  })

  it('clamps the lifespan to [1, 300]', () => {
    const world = emptyWorld()
    expect(createAntType(world, draft({ lifespan: 0 })).lifespan).toBe(1)
    expect(createAntType(world, draft({ lifespan: 500 })).lifespan).toBe(300)
  })

  it('stores sanitized abilities', () => {
    const world = emptyWorld()
    const type = createAntType(world, draft({ abilities: [{ kind: 'walk', speed: 200 }] }))
    expect(type.abilities).toEqual([{ kind: 'walk', speed: 80 }])
  })
})

describe('updateAntType', () => {
  it('refuses blank and unknown ids', () => {
    const world = emptyWorld()
    expect(updateAntType(world, 'blank', draft())).toBe(false)
    expect(updateAntType(world, 'ghost', draft())).toBe(false)
  })

  it('replaces name, lifespan and abilities', () => {
    const world = emptyWorld()
    const type = createAntType(world, draft())
    const ok = updateAntType(world, type.id, {
      name: 'Fast',
      lifespan: 999,
      abilities: [{ kind: 'wander', strength: 100 }],
    })
    expect(ok).toBe(true)
    expect(getAntType(world, type.id)).toMatchObject({
      id: type.id,
      name: 'Fast',
      lifespan: 300,
      abilities: [{ kind: 'wander', strength: 10 }],
    })
  })
})

describe('deleteAntType', () => {
  it('refuses blank and unknown ids', () => {
    const world = emptyWorld()
    expect(deleteAntType(world, 'blank')).toBe(false)
    expect(deleteAntType(world, 'ghost')).toBe(false)
    expect(getAntType(world, 'blank')).toBeDefined()
  })

  it('deletes a custom type', () => {
    const world = emptyWorld()
    const type = createAntType(world, draft())
    expect(deleteAntType(world, type.id)).toBe(true)
    expect(getAntType(world, type.id)).toBeUndefined()
  })

  it('resets nestTypeId to blank when deleting the selected type', () => {
    const world = emptyWorld()
    const type = createAntType(world, draft())
    setNestType(world, type.id)
    expect(deleteAntType(world, type.id)).toBe(true)
    expect(world.nestTypeId).toBe('blank')
  })
})

describe('getAntTypes', () => {
  it('returns types in insertion order with blank first', () => {
    const world = emptyWorld()
    createAntType(world, draft({ name: 'One' }))
    createAntType(world, draft({ name: 'Two' }))
    expect(getAntTypes(world).map((type) => type.id)).toEqual([
      'blank',
      'custom-1',
      'custom-2',
    ])
  })
})

describe('getAntType', () => {
  it('returns undefined for an unknown id', () => {
    expect(getAntType(emptyWorld(), 'missing')).toBeUndefined()
  })
})

describe('setNestType', () => {
  it('accepts existing ids and rejects unknown ones', () => {
    const world = emptyWorld()
    const type = createAntType(world, draft())
    expect(setNestType(world, type.id)).toBe(true)
    expect(world.nestTypeId).toBe(type.id)
    expect(setNestType(world, 'ghost')).toBe(false)
    expect(world.nestTypeId).toBe(type.id)
  })
})
