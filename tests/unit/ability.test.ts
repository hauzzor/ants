import { describe, it, expect } from 'vitest'
import {
  conditionMet,
  totalWalkSpeed,
  wanderTurnDelta,
  followTurnDelta,
  emitAbilities,
  sourceFreshness,
  pheromoneContactSource,
  PHEROMONE_FRESHNESS_HALF_LIFE,
} from '../../src/sim/ability'
import { createWorld, stepWorld } from '../../src/sim/world'
import { createAnt } from '../../src/sim/ant'
import { createRng } from '../../src/sim/rng'
import { sample, sampleDirection } from '../../src/sim/pheromone'
import { createFood } from '../../src/sim/food'
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

  function directedWorld(): World {
    const world = emptyWorld()
    world.pheromones.attract.fill(1)
    world.pheromones.dirs.attract.x.fill(1)
    world.pheromones.dirs.attract.y.fill(0)
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

  it('turns on a gradient above the detection threshold', () => {
    const world = gradientWorld()
    const ant = addAnt(world, [toward], 120, 80, 0)
    expect(followTurnDelta(world, ant, 0.5)).toBeCloseTo(-1)
  })

  it('ignores samples below the detection threshold', () => {
    const world = gradientWorld()
    for (let i = 0; i < world.pheromones.attract.length; i++) {
      world.pheromones.attract[i] = (world.pheromones.attract[i] ?? 0) * 0.001
    }
    const ant = addAnt(world, [toward], 120, 80, 0)
    expect(followTurnDelta(world, ant, 0.5)).toBe(0)
  })

  it('treats a sample exactly at the detection threshold as detectable', () => {
    const world = gradientWorld()
    const ant = addAnt(world, [toward], 120, 80, 0)
    const leftX = ant.x + Math.cos(-toward.sensorAngle) * toward.sensorDistance
    const leftY = ant.y + Math.sin(-toward.sensorAngle) * toward.sensorDistance
    world.params.pheromoneDetectThreshold = sample(
      world.pheromones.attract,
      world.grid,
      leftX,
      leftY,
    )
    expect(followTurnDelta(world, ant, 0.5)).toBeCloseTo(-1)
  })

  it('steers toward the encoded direction of the strongest trail', () => {
    const world = directedWorld()
    const ant = addAnt(world, [toward], 120, 80, Math.PI / 2)
    expect(followTurnDelta(world, ant, 0.5)).toBeCloseTo(-1)
  })

  it('steers away from the encoded direction when direction is away', () => {
    const world = directedWorld()
    const ant = addAnt(world, [{ ...toward, direction: 'away' } as Ability], 120, 80, Math.PI / 2)
    expect(followTurnDelta(world, ant, 0.5)).toBeCloseTo(1)
  })

  it('uses the gradient when the strongest trail has no direction', () => {
    const world = gradientWorld()
    const ant = addAnt(world, [toward], 120, 80, 0)
    expect(followTurnDelta(world, ant, 0.5)).toBeCloseTo(-1)
  })

  it('ignores encoded directions when the field is below the detection threshold', () => {
    const world = directedWorld()
    world.pheromones.attract.fill(0.05)
    const ant = addAnt(world, [toward], 120, 80, Math.PI / 2)
    expect(followTurnDelta(world, ant, 0.5)).toBe(0)
  })
})

describe('sourceFreshness', () => {
  it('is full strength on contact', () => {
    expect(sourceFreshness(0)).toBe(1)
  })

  it('halves every half life', () => {
    expect(PHEROMONE_FRESHNESS_HALF_LIFE).toBe(8)
    expect(sourceFreshness(PHEROMONE_FRESHNESS_HALF_LIFE)).toBeCloseTo(0.5, 10)
    expect(sourceFreshness(PHEROMONE_FRESHNESS_HALF_LIFE * 2)).toBeCloseTo(0.25, 10)
  })

  it('strictly decreases with elapsed time', () => {
    expect(sourceFreshness(1)).toBeGreaterThan(sourceFreshness(2))
    expect(sourceFreshness(2)).toBeGreaterThan(sourceFreshness(8))
    expect(sourceFreshness(8)).toBeGreaterThan(sourceFreshness(50))
  })
})

describe('pheromoneContactSource', () => {
  it('maps each pheromone kind to its contact source', () => {
    expect(pheromoneContactSource('home')).toBe('nest')
    expect(pheromoneContactSource('food')).toBe('food')
    expect(pheromoneContactSource('attract')).toBe('food')
    expect(pheromoneContactSource('repel')).toBe('nest')
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

  it('emits at half strength after one half life without contact', () => {
    const world = emptyWorld()
    world.time = PHEROMONE_FRESHNESS_HALF_LIFE
    const ant = addAnt(
      world,
      [{ kind: 'emit', pheromone: 'home', intensity: 10, condition: 'always' }],
      62,
      82,
    )
    emitAbilities(world, ant, 1)
    expect(sample(world.pheromones.home, world.grid, 62, 82)).toBeCloseTo(5)
  })

  it('uses the food contact time for food-linked pheromones', () => {
    const world = emptyWorld()
    world.time = PHEROMONE_FRESHNESS_HALF_LIFE
    const ant = addAnt(
      world,
      [{ kind: 'emit', pheromone: 'attract', intensity: 10, condition: 'always' }],
      62,
      82,
    )
    ant.lastFoodContact = 0
    emitAbilities(world, ant, 1)
    expect(sample(world.pheromones.attract, world.grid, 62, 82)).toBeCloseTo(5)
  })

  it('treats a contact time in the future as full freshness', () => {
    const world = emptyWorld()
    world.time = 5
    const ant = addAnt(
      world,
      [{ kind: 'emit', pheromone: 'home', intensity: 10, condition: 'always' }],
      62,
      82,
    )
    ant.lastNestContact = 9
    emitAbilities(world, ant, 1)
    expect(sample(world.pheromones.home, world.grid, 62, 82)).toBeCloseTo(10)
  })

  it('records the reverse ant heading as the emission direction', () => {
    const world = emptyWorld()
    const ant = addAnt(
      world,
      [{ kind: 'emit', pheromone: 'home', intensity: 10, condition: 'always' }],
      62,
      82,
      0,
    )
    emitAbilities(world, ant, 1)
    const dir = sampleDirection(world.pheromones, 'home', world.grid, 62, 82)
    expect(dir.x).toBeCloseTo(-1, 6)
    expect(dir.y).toBeCloseTo(0, 6)
    expect(dir.magnitude).toBeCloseTo(10, 5)
  })

  it('records a reversed off-axis heading and still scales by freshness', () => {
    const world = emptyWorld()
    world.time = PHEROMONE_FRESHNESS_HALF_LIFE
    const angle = Math.PI / 3
    const ant = addAnt(
      world,
      [{ kind: 'emit', pheromone: 'home', intensity: 10, condition: 'always' }],
      62,
      82,
      angle,
    )
    emitAbilities(world, ant, 1)
    const dir = sampleDirection(world.pheromones, 'home', world.grid, 62, 82)
    expect(dir.x).toBeCloseTo(-Math.cos(angle), 6)
    expect(dir.y).toBeCloseTo(-Math.sin(angle), 6)
    expect(dir.magnitude).toBeCloseTo(5, 5)
  })

  it('records food pickup time for emission and freshness', () => {
    const world = emptyWorld()
    const ant = addAnt(world, [], 100, 80, 0)
    world.foods.push(createFood(world.nextId++, 100, 80, 5))
    world.time = 3

    stepWorld(world, STEP)

    expect(ant.lastFoodContact).toBe(3)
  })

  it('refreshes the nest contact time whenever the ant is near the nest', () => {
    const world = emptyWorld()
    const ant = addAnt(world, [], world.nest.x, world.nest.y, 0)
    world.time = 4

    stepWorld(world, STEP)

    expect(ant.lastNestContact).toBe(4)
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
    expect(sample(world.pheromones.home, world.grid, ant.x, ant.y)).toBeLessThan(1e-6)
    const food = world.pheromones.food.reduce((sum, value) => sum + value, 0)
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
