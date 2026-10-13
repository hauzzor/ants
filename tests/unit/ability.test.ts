import { describe, it, expect } from 'vitest'
import {
  conditionMet,
  totalWalkSpeed,
  wanderTurnDelta,
  followTurnDelta,
  emitAbilities,
} from '../../src/sim/ability'
import { createWorld, stepWorld } from '../../src/sim/world'
import { createAnt } from '../../src/sim/ant'
import { createRng } from '../../src/sim/rng'
import { sample } from '../../src/sim/pheromone'
import { paintPheromone } from '../../src/sim/tools'
import { isWallAt } from '../../src/sim/walls'
import type { Ability, Ant, World } from '../../src/sim/types'

const STEP = 1 / 60

function emptyWorld(seed = 1): World {
  return createWorld({ seed, params: { antCount: 0, spawnInterval: 0 } })
}

function addAnt(
  world: World,
  abilities: Ability[],
  x = 60,
  y = 80,
  angle = 0,
): Ant {
  const ant = createAnt(world.nextId++, x, y, angle, 60, abilities)
  world.ants.push(ant)
  return ant
}

describe('conditionMet', () => {
  it('always holds', () => {
    const ant = createAnt(1, 0, 0, 0, 60, [])
    expect(conditionMet('always', ant)).toBe(true)
    ant.carrying = true
    expect(conditionMet('always', ant)).toBe(true)
  })

  it('gates on carrying', () => {
    const ant = createAnt(1, 0, 0, 0, 60, [])
    expect(conditionMet('carrying', ant)).toBe(false)
    ant.carrying = true
    expect(conditionMet('carrying', ant)).toBe(true)
  })

  it('gates on being empty', () => {
    const ant = createAnt(1, 0, 0, 0, 60, [])
    expect(conditionMet('empty', ant)).toBe(true)
    ant.carrying = true
    expect(conditionMet('empty', ant)).toBe(false)
  })
})

describe('totalWalkSpeed', () => {
  it('returns zero without walk abilities', () => {
    expect(totalWalkSpeed([])).toBe(0)
    expect(totalWalkSpeed([{ kind: 'wander', strength: 5 }])).toBe(0)
  })

  it('sums walk speeds', () => {
    expect(totalWalkSpeed([{ kind: 'walk', speed: 30 }, { kind: 'walk', speed: 20 }])).toBe(50)
  })

  it('clamps the sum at 80', () => {
    expect(totalWalkSpeed([{ kind: 'walk', speed: 70 }, { kind: 'walk', speed: 30 }])).toBe(80)
  })

  it('clamps negatives to zero', () => {
    expect(totalWalkSpeed([{ kind: 'walk', speed: -10 }, { kind: 'walk', speed: 5 }])).toBe(0)
  })
})

describe('wanderTurnDelta', () => {
  it('is zero and consumes no randomness without wander abilities', () => {
    const rng = createRng(7)
    expect(wanderTurnDelta([], rng, 0.5)).toBe(0)
    expect(rng.state).toBe(createRng(7).state)
  })

  it('scales the sampled turn by strength and dt', () => {
    const expected = createRng(1).range(-1, 1) * 2 * 0.5
    expect(wanderTurnDelta([{ kind: 'wander', strength: 2 }], createRng(1), 0.5)).toBeCloseTo(
      expected,
    )
  })

  it('sums abilities in array order', () => {
    const expectedRng = createRng(5)
    const expected =
      expectedRng.range(-1, 1) * 1 * 0.5 + expectedRng.range(-1, 1) * 2 * 0.5
    const abilities: Ability[] = [
      { kind: 'wander', strength: 1 },
      { kind: 'wander', strength: 2 },
    ]
    expect(wanderTurnDelta(abilities, createRng(5), 0.5)).toBeCloseTo(expected)
  })
})

describe('followTurnDelta', () => {
  const toward: Ability = {
    kind: 'follow',
    pheromone: 'attract',
    direction: 'toward',
    sensorAngle: 1,
    sensorDistance: 10,
    turnRate: 2,
    condition: 'always',
  }

  function gradientWorld(): World {
    const world = emptyWorld()
    paintPheromone(world, 'attract', 125.403, 71.586, 4, 50)
    return world
  }

  it('turns toward a stronger gradient', () => {
    const world = gradientWorld()
    const ant = addAnt(world, [toward], 120, 80, 0)
    expect(followTurnDelta(world, ant, 0.5)).toBeCloseTo(-1)
  })

  it('turns away from a stronger gradient', () => {
    const world = gradientWorld()
    const ant = addAnt(world, [{ ...toward, direction: 'away' } as Ability], 120, 80, 0)
    expect(followTurnDelta(world, ant, 0.5)).toBeCloseTo(1)
  })

  it('does not turn when no sensor is stronger', () => {
    const world = emptyWorld()
    const ant = addAnt(world, [toward], 120, 80, 0)
    expect(followTurnDelta(world, ant, 0.5)).toBe(0)
  })

  it('gates on the condition', () => {
    const world = gradientWorld()
    const ant = addAnt(
      world,
      [{ ...toward, condition: 'carrying' } as Ability],
      120,
      80,
      0,
    )
    expect(followTurnDelta(world, ant, 0.5)).toBe(0)
    ant.carrying = true
    expect(followTurnDelta(world, ant, 0.5)).toBeCloseTo(-1)
  })

  it('sums multiple follow abilities in order', () => {
    const world = gradientWorld()
    const away: Ability = { ...toward, direction: 'away', turnRate: 1 } as Ability
    const ant = addAnt(world, [toward, away], 120, 80, 0)
    expect(followTurnDelta(world, ant, 0.5)).toBeCloseTo(-1 + 0.5)
  })
})

describe('emitAbilities', () => {
  it('deposits intensity times dt when the condition holds', () => {
    const world = emptyWorld()
    const ant = addAnt(
      world,
      [{ kind: 'emit', pheromone: 'home', intensity: 10, condition: 'empty' }],
      62,
      82,
    )
    emitAbilities(world, ant, 0.5)
    expect(sample(world.pheromones.home, world.grid, 62, 82)).toBeCloseTo(5)
  })

  it('skips emissions whose condition fails', () => {
    const world = emptyWorld()
    const ant = addAnt(
      world,
      [{ kind: 'emit', pheromone: 'home', intensity: 10, condition: 'empty' }],
      62,
      82,
    )
    ant.carrying = true
    emitAbilities(world, ant, 0.5)
    expect(sample(world.pheromones.home, world.grid, 62, 82)).toBe(0)
  })

  it('emits carrying-conditioned pheromone when carrying', () => {
    const world = emptyWorld()
    const ant = addAnt(
      world,
      [{ kind: 'emit', pheromone: 'food', intensity: 4, condition: 'carrying' }],
      62,
      82,
    )
    ant.carrying = true
    emitAbilities(world, ant, 0.25)
    expect(sample(world.pheromones.food, world.grid, 62, 82)).toBeCloseTo(1)
  })
})

describe('blank ants', () => {
  it('do not move, turn or emit over 60 steps', () => {
    const world = emptyWorld()
    const ant = addAnt(world, [], 60, 80, 0.7)

    for (let i = 0; i < 60; i++) {
      stepWorld(world, STEP)
    }

    expect(ant.x).toBe(60)
    expect(ant.y).toBe(80)
    expect(ant.angle).toBeCloseTo(0.7, 12)
    const home = world.pheromones.home.reduce((sum, value) => sum + value, 0)
    const food = world.pheromones.food.reduce((sum, value) => sum + value, 0)
    expect(home).toBe(0)
    expect(food).toBe(0)
  })
})

describe('movement', () => {
  it('moves a walk-only ant along its heading', () => {
    const world = emptyWorld()
    const ant = addAnt(world, [{ kind: 'walk', speed: 20 }], 60, 80, 0)

    stepWorld(world, STEP)

    expect(ant.x).toBeCloseTo(60 + 20 * STEP)
    expect(ant.y).toBeCloseTo(80)
    expect(ant.angle).toBe(0)
  })

  it('sums multiple walk abilities', () => {
    const world = emptyWorld()
    const ant = addAnt(
      world,
      [{ kind: 'walk', speed: 10 }, { kind: 'walk', speed: 15 }],
      60,
      80,
      0,
    )

    stepWorld(world, STEP)

    expect(ant.x).toBeCloseTo(60 + 25 * STEP)
  })

  it('bounces off walls and stays in bounds', () => {
    const world = emptyWorld()
    const ant = addAnt(world, [{ kind: 'walk', speed: 80 }], 234, 80, 0)

    stepWorld(world, 0.1)

    expect(ant.x).toBe(234)
    expect(ant.y).toBe(80)
    expect(isWallAt(world.walls, world.grid, ant.x, ant.y)).toBe(false)
  })
})

describe('wander determinism', () => {
  it('produces identical headings for equal seeds', () => {
    const a = emptyWorld(7)
    const b = emptyWorld(7)
    addAnt(a, [{ kind: 'wander', strength: 3 }], 60, 80, 1)
    addAnt(b, [{ kind: 'wander', strength: 3 }], 60, 80, 1)

    for (let i = 0; i < 30; i++) {
      stepWorld(a, STEP)
      stepWorld(b, STEP)
    }

    const antA = a.ants[0]!
    const antB = b.ants[0]!
    expect(antA.angle).toBe(antB.angle)
    expect(antA.x).toBe(antB.x)
    expect(antA.y).toBe(antB.y)
    expect(antA.angle).not.toBe(1)
  })
})
