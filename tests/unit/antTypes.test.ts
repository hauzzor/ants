import { describe, it, expect } from 'vitest'
import {
  BUILT_IN_TYPES,
  behaviorFromParams,
  behaviorForType,
  createAntType,
  getAntType,
  getAntTypes,
  parseAntBehavior,
  setNestType,
  typeNameFromDescription,
} from '../../src/sim/antTypes'
import { createWorld } from '../../src/sim/world'
import { DEFAULT_PARAMS, createParams } from '../../src/sim/params'
import type { AntBehavior } from '../../src/sim/types'

const base: AntBehavior = behaviorFromParams(DEFAULT_PARAMS)

function emptyWorld() {
  return createWorld({ params: { antCount: 0 } })
}

describe('behaviorFromParams', () => {
  it('maps params 1:1 onto the behavior fields', () => {
    const params = createParams({
      antSpeed: 11,
      antTurnRate: 2,
      sensorAngle: 0.3,
      sensorDistance: 7,
      wanderStrength: 0.5,
      pheromoneDeposit: 3,
      followStrength: 1.1,
      attractStrength: 0.9,
      repelStrength: 2.2,
      nestBias: 0.4,
      antLifespan: 12,
    })

    expect(behaviorFromParams(params)).toEqual({
      speed: 11,
      turnRate: 2,
      sensorAngle: 0.3,
      sensorDistance: 7,
      wanderStrength: 0.5,
      pheromoneDeposit: 3,
      followStrength: 1.1,
      attractStrength: 0.9,
      repelStrength: 2.2,
      nestBias: 0.4,
      lifespan: 12,
    })
  })
})

describe('parseAntBehavior', () => {
  it('boosts a field when a fast word matches', () => {
    expect(parseAntBehavior('fast', base).speed).toBeCloseTo(base.speed * 1.5)
    expect(parseAntBehavior('quick', base).speed).toBeCloseTo(base.speed * 1.5)
    expect(parseAntBehavior('speedy', base).speed).toBeCloseTo(base.speed * 1.5)
    expect(parseAntBehavior('swift', base).speed).toBeCloseTo(base.speed * 1.5)
    expect(parseAntBehavior('rapid', base).speed).toBeCloseTo(base.speed * 1.5)
  })

  it('dampens a field when a slow word matches', () => {
    expect(parseAntBehavior('slow', base).speed).toBeCloseTo(base.speed * 0.6)
    expect(parseAntBehavior('sluggish', base).speed).toBeCloseTo(base.speed * 0.6)
  })

  it('returns the base unchanged for an unmatched description', () => {
    expect(parseAntBehavior('nothing matches here', base)).toEqual(base)
  })

  it('returns the base unchanged for an empty description', () => {
    expect(parseAntBehavior('', base)).toEqual(base)
    expect(parseAntBehavior('   ', base)).toEqual(base)
  })

  it('is case-insensitive', () => {
    expect(parseAntBehavior('FAST', base).speed).toBeCloseTo(parseAntBehavior('fast', base).speed)
    expect(parseAntBehavior('Short-Lived', base).lifespan).toBeCloseTo(
      parseAntBehavior('short lived', base).lifespan,
    )
  })

  it('treats hyphens as spaces', () => {
    expect(parseAntBehavior('short-lived', base).lifespan).toBeCloseTo(base.lifespan * 0.5)
  })

  it('normalizes punctuation into word separators', () => {
    const parsed = parseAntBehavior('fast, curious scout', base)
    expect(parsed.speed).toBeCloseTo(base.speed * 1.5)
    expect(parsed.wanderStrength).toBeCloseTo(base.wanderStrength * 1.6)
  })

  it('matches whole words rather than substrings', () => {
    expect(parseAntBehavior('swiftly', base).speed).toBe(base.speed)
    expect(parseAntBehavior('speedster', base).speed).toBe(base.speed)
    expect(parseAntBehavior('followers', base).followStrength).toBe(base.followStrength)
  })

  it('always clamps sensorAngle even without a match', () => {
    expect(parseAntBehavior('', { ...base, sensorAngle: 0 }).sensorAngle).toBe(0.1)
  })

  it('matches multi-word phrases', () => {
    expect(parseAntBehavior('far sighted', base).sensorDistance).toBeCloseTo(
      base.sensorDistance * 1.5,
    )
  })

  it('applies at most one multiplier per field', () => {
    expect(parseAntBehavior('fast slow', base).speed).toBeCloseTo(base.speed * 1.5)
    expect(parseAntBehavior('fast quick speedy', base).speed).toBeCloseTo(base.speed * 1.5)
  })

  it('boosts each behavior field from its keywords', () => {
    expect(parseAntBehavior('agile', base).turnRate).toBeCloseTo(base.turnRate * 1.6)
    expect(parseAntBehavior('keen', base).sensorDistance).toBeCloseTo(base.sensorDistance * 1.5)
    expect(parseAntBehavior('curious', base).wanderStrength).toBeCloseTo(
      base.wanderStrength * 1.6,
    )
    expect(parseAntBehavior('hardworking', base).pheromoneDeposit).toBeCloseTo(
      base.pheromoneDeposit * 1.5,
    )
    expect(parseAntBehavior('loyal', base).followStrength).toBeCloseTo(base.followStrength * 1.6)
    expect(parseAntBehavior('food', base).attractStrength).toBeCloseTo(base.attractStrength * 1.6)
    expect(parseAntBehavior('cautious', base).repelStrength).toBeCloseTo(base.repelStrength * 1.6)
    expect(parseAntBehavior('homing', base).nestBias).toBeCloseTo(base.nestBias * 1.5)
    expect(parseAntBehavior('immortal', base).lifespan).toBeCloseTo(base.lifespan * 1.5)
  })

  it('dampens each behavior field from its keywords', () => {
    expect(parseAntBehavior('steady', base).turnRate).toBeCloseTo(base.turnRate * 0.6)
    expect(parseAntBehavior('shortsighted', base).sensorDistance).toBeCloseTo(
      base.sensorDistance * 0.6,
    )
    expect(parseAntBehavior('focused', base).wanderStrength).toBeCloseTo(base.wanderStrength * 0.5)
    expect(parseAntBehavior('lazy', base).pheromoneDeposit).toBeCloseTo(base.pheromoneDeposit * 0.5)
    expect(parseAntBehavior('independent', base).followStrength).toBeCloseTo(
      base.followStrength * 0.3,
    )
    expect(parseAntBehavior('brave', base).repelStrength).toBeCloseTo(base.repelStrength * 0.4)
    expect(parseAntBehavior('adventurous', base).nestBias).toBeCloseTo(base.nestBias * 0.5)
    expect(parseAntBehavior('mayfly', base).lifespan).toBeCloseTo(base.lifespan * 0.5)
  })

  it('clamps boosted values to the field maximum', () => {
    const huge = behaviorFromParams(createParams({ antSpeed: 100 }))
    expect(parseAntBehavior('fast', huge).speed).toBe(80)
  })

  it('clamps dampened values to the field minimum', () => {
    const tiny = behaviorFromParams(createParams({ antSpeed: 2 }))
    expect(parseAntBehavior('slow', tiny).speed).toBe(2)
  })

  it('only changes fields that match', () => {
    const boosted = parseAntBehavior('fast', base)
    expect(boosted.turnRate).toBe(base.turnRate)
    expect(boosted.sensorDistance).toBe(base.sensorDistance)
    expect(boosted.lifespan).toBe(base.lifespan)
  })
})

describe('typeNameFromDescription', () => {
  it('falls back to Custom for an empty description', () => {
    expect(typeNameFromDescription('')).toBe('Custom')
    expect(typeNameFromDescription('   ')).toBe('Custom')
  })

  it('title-cases the first three tokens', () => {
    expect(typeNameFromDescription('fast curious explorer that loves food')).toBe(
      'Fast Curious Explorer',
    )
    expect(typeNameFromDescription('slow ant')).toBe('Slow Ant')
  })
})

describe('built-in types', () => {
  it('exposes worker, scout and trailblazer', () => {
    expect(BUILT_IN_TYPES.map((type) => type.id)).toEqual(['worker', 'scout', 'trailblazer'])
    expect(BUILT_IN_TYPES.find((type) => type.id === 'worker')?.name).toBe('Worker')
  })

  it('makes the scout faster and more wandering than the worker', () => {
    const world = emptyWorld()
    const worker = behaviorForType(world, 'worker')
    const scout = behaviorForType(world, 'scout')
    expect(scout.speed).toBeGreaterThan(worker.speed)
    expect(scout.wanderStrength).toBeGreaterThan(worker.wanderStrength)
  })

  it('layers type rules on top of the current params', () => {
    const world = emptyWorld()
    world.params.antSpeed = 20
    expect(behaviorForType(world, 'worker').speed).toBe(20)
    expect(behaviorForType(world, 'scout').speed).toBe(30)
  })
})

describe('createAntType', () => {
  it('creates types with evolving custom ids and stores them', () => {
    const world = emptyWorld()
    const first = createAntType(world, 'fast scout')
    const second = createAntType(world, 'slow worker')

    expect(first.id).toBe('custom-1')
    expect(second.id).toBe('custom-2')
    expect(getAntType(world, 'custom-1')).toBe(first)
    expect(getAntTypes(world)).toContain(first)
  })

  it('derives behavior from the description and current params', () => {
    const world = emptyWorld()
    const type = createAntType(world, 'fast')

    world.params.antSpeed = 10
    expect(behaviorForType(world, type.id).speed).toBeCloseTo(15)
    world.params.antSpeed = 40
    expect(behaviorForType(world, type.id).speed).toBeCloseTo(60)
  })

  it('continues custom id numbering from provided types', () => {
    const world = createWorld({
      params: { antCount: 0 },
      types: {
        worker: { id: 'worker', name: 'Worker', description: '' },
        'custom-4': { id: 'custom-4', name: 'Four', description: '' },
      },
    })
    expect(createAntType(world, 'anything').id).toBe('custom-5')
  })
})

describe('getAntType', () => {
  it('returns undefined for an unknown id', () => {
    expect(getAntType(emptyWorld(), 'missing')).toBeUndefined()
  })
})

describe('setNestType', () => {
  it('accepts a known id and rejects an unknown one', () => {
    const world = emptyWorld()
    expect(setNestType(world, 'scout')).toBe(true)
    expect(world.nestTypeId).toBe('scout')
    expect(setNestType(world, 'ghost')).toBe(false)
    expect(world.nestTypeId).toBe('scout')
  })
})
