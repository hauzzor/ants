import { describe, it, expect } from 'vitest'
import { createWorld, stepWorld } from '../../src/sim/world'
import { createAnt, spawnAntNearNest, spawnAntWithType } from '../../src/sim/ant'
import {
  BLANK_TYPE,
  createAntType,
  sanitizeAbilities,
  setNestType,
} from '../../src/sim/antTypes'
import { createFood } from '../../src/sim/food'
import { isWallAt } from '../../src/sim/walls'
import { deposit, sample } from '../../src/sim/pheromone'
import { DEFAULT_PARAMS } from '../../src/sim/params'
import { PHEROMONE_KINDS } from '../../src/sim/types'
import type { Ability, AntType, World } from '../../src/sim/types'

const STEP = 1 / 60

function snapshot(world: World) {
  return world.ants.map((ant) => ({
    x: ant.x,
    y: ant.y,
    angle: ant.angle,
    carrying: ant.carrying,
    typeId: ant.typeId,
    lifespan: ant.lifespan,
    abilities: JSON.stringify(ant.abilities),
  }))
}

function run(world: World, steps: number): void {
  for (let i = 0; i < steps; i++) {
    stepWorld(world, STEP)
  }
}

function type(overrides: Partial<AntType> & { id: string }): AntType {
  return { name: 'Type', lifespan: 60, abilities: [], ...overrides }
}

function abilityWorld(seed: number): World {
  const abilities: Ability[] = [
    { kind: 'wander', strength: 2 },
    { kind: 'walk', speed: 40 },
    { kind: 'emit', pheromone: 'home', intensity: 8, condition: 'always' },
  ]
  return createWorld({
    seed,
    params: { antCount: 10, spawnInterval: 1 },
    types: { explorer: type({ id: 'explorer', name: 'Explorer', abilities }) },
    nestTypeId: 'explorer',
  })
}

describe('createWorld', () => {
  it('creates the default arena and grid', () => {
    const world = createWorld()
    expect(world.width).toBe(240)
    expect(world.height).toBe(160)
    expect(world.grid).toEqual({ cols: 60, rows: 40, cellSize: 4 })
    expect(world.nest).toEqual({ x: 120, y: 80 })
  })

  it('seeds a blank type and selects it', () => {
    const world = createWorld()
    expect(world.types['blank']).toEqual(BLANK_TYPE)
    expect(world.nestTypeId).toBe('blank')
    expect(world.nextTypeId).toBe(1)
  })

  it('spawns the configured number of ants near the nest', () => {
    const world = createWorld()
    expect(world.ants.length).toBe(DEFAULT_PARAMS.antCount)
    for (const ant of world.ants) {
      const dist = Math.hypot(ant.x - world.nest.x, ant.y - world.nest.y)
      expect(dist).toBeLessThanOrEqual(DEFAULT_PARAMS.nestRadius)
    }
  })

  it('walls off the arena border', () => {
    const world = createWorld()
    expect(isWallAt(world.walls, world.grid, 2, 2)).toBe(true)
    expect(isWallAt(world.walls, world.grid, 20, 20)).toBe(false)
  })

  it('starts with empty metrics and time', () => {
    const world = createWorld()
    expect(world.metrics).toEqual({ foodCollected: 0, foodInNest: 0, elapsed: 0 })
    expect(world.time).toBe(0)
  })

  it('is deterministic for a given seed', () => {
    const a = createWorld({ seed: 12345 })
    const b = createWorld({ seed: 12345 })
    expect(snapshot(a)).toEqual(snapshot(b))
  })

  it('produces different layouts for different seeds', () => {
    const a = createWorld({ seed: 1 })
    const b = createWorld({ seed: 2 })
    expect(snapshot(a)).not.toEqual(snapshot(b))
  })

  it('uses provided types and injects a blank fallback', () => {
    const world = createWorld({
      params: { antCount: 1 },
      types: { queen: type({ id: 'queen', name: 'Queen' }) },
      nestTypeId: 'queen',
    })
    expect(world.types['queen']).toBeDefined()
    expect(world.types['blank']).toBeDefined()
    expect(world.nestTypeId).toBe('queen')
    expect(world.ants[0]!.typeId).toBe('queen')
  })

  it('injects the blank fallback without mutating the caller record', () => {
    const provided = { queen: type({ id: 'queen', name: 'Queen' }) }
    const world = createWorld({
      params: { antCount: 0 },
      types: provided,
      nestTypeId: 'queen',
    })
    expect(world.types['blank']).toBeDefined()
    expect(provided).not.toHaveProperty('blank')
  })

  it('injects a blank clone that does not alias BLANK_TYPE', () => {
    const world = createWorld({
      params: { antCount: 0 },
      types: { queen: type({ id: 'queen', name: 'Queen' }) },
    })
    expect(world.types['blank']).not.toBe(BLANK_TYPE)
    expect(world.types['blank']!.abilities).not.toBe(BLANK_TYPE.abilities)
  })

  it('defaults nestTypeId to blank for provided types without an explicit nest', () => {
    const world = createWorld({
      params: { antCount: 1 },
      types: { queen: type({ id: 'queen', name: 'Queen' }) },
    })
    expect(world.nestTypeId).toBe('blank')
    expect(world.ants[0]!.typeId).toBe('blank')
  })
})

describe('stepWorld', () => {
  it('advances time and the elapsed metric', () => {
    const world = createWorld()
    run(world, 10)
    expect(world.time).toBeCloseTo(10 * STEP, 6)
    expect(world.metrics.elapsed).toBe(world.time)
  })

  it('is deterministic across many steps', () => {
    const a = createWorld({ seed: 777 })
    const b = createWorld({ seed: 777 })
    run(a, 400)
    run(b, 400)
    expect(snapshot(a)).toEqual(snapshot(b))
    expect(a.metrics).toEqual(b.metrics)
  })

  it('keeps moving ants out of walls', () => {
    const world = abilityWorld(3)
    run(world, 600)
    for (const ant of world.ants) {
      expect(isWallAt(world.walls, world.grid, ant.x, ant.y)).toBe(false)
    }
  })

  it('has ants lay home pheromone as they explore', () => {
    const world = abilityWorld(9)
    run(world, 120)
    const total = world.pheromones.home.reduce((sum, value) => sum + value, 0)
    expect(total).toBeGreaterThan(0)
  })

  it('decays player-painted pheromone over time', () => {
    const world = createWorld({ params: { antCount: 0 } })
    deposit(world.pheromones.attract, world.grid, 100, 80, 100)
    const before = sample(world.pheromones.attract, world.grid, 100, 80)
    run(world, 120)
    const after = sample(world.pheromones.attract, world.grid, 100, 80)
    expect(after).toBeLessThan(before)
  })

  it('is deterministic with abilities', () => {
    const a = abilityWorld(2024)
    const b = abilityWorld(2024)
    run(a, 600)
    run(b, 600)
    expect(snapshot(a)).toEqual(snapshot(b))
    expect(a.metrics).toEqual(b.metrics)
    expect(Array.from(a.pheromones.home)).toEqual(Array.from(b.pheromones.home))
  })
})

describe('food scent emission', () => {
  it('emits food pheromone around a source', () => {
    const world = createWorld({ params: { antCount: 0 } })
    const foodX = 120
    const foodY = 80
    world.foods.push(createFood(world.nextId++, foodX, foodY, 10))

    stepWorld(world, STEP)

    expect(sample(world.pheromones.food, world.grid, foodX, foodY)).toBeGreaterThan(0)
    expect(sample(world.pheromones.food, world.grid, 20, 20)).toBe(0)
  })

  it('leaves the food field empty when there is no food', () => {
    const world = createWorld({ seed: 5 })
    stepWorld(world, STEP)
    expect(world.pheromones.food.every((value) => value === 0)).toBe(true)
  })

  it('is deterministic with food scent emission', () => {
    const a = createWorld({ seed: 42 })
    const b = createWorld({ seed: 42 })
    a.foods.push(createFood(a.nextId++, 100, 60, 1000))
    b.foods.push(createFood(b.nextId++, 100, 60, 1000))

    run(a, 120)
    run(b, 120)

    expect(Array.from(a.pheromones.food)).toEqual(Array.from(b.pheromones.food))
    expect(snapshot(a)).toEqual(snapshot(b))
  })
})

describe('foraging', () => {
  it('picks up food and records it', () => {
    const world = createWorld({ params: { antCount: 1 }, seed: 5 })
    const ant = world.ants[0]!
    ant.age = 0
    ant.x = 100
    ant.y = 80
    ant.angle = 0
    world.foods.push(createFood(world.nextId++, 100, 80, 5))

    stepWorld(world, STEP)

    expect(ant.carrying).toBe(true)
    expect(ant.state).toBe('return')
    expect(world.metrics.foodCollected).toBe(1)
    expect(world.foods[0]?.amount).toBe(4)
  })

  it('delivers food at the nest', () => {
    const world = createWorld({ params: { antCount: 1 }, seed: 5 })
    const ant = world.ants[0]!
    ant.age = 0
    ant.carrying = true
    ant.state = 'return'
    ant.x = world.nest.x
    ant.y = world.nest.y

    stepWorld(world, STEP)

    expect(ant.carrying).toBe(false)
    expect(ant.state).toBe('wander')
    expect(world.metrics.foodInNest).toBe(1)
  })

  it('does not pick up when there is no food', () => {
    const world = createWorld({ params: { antCount: 1 }, seed: 5 })
    world.ants[0]!.age = 0
    stepWorld(world, STEP)
    expect(world.ants[0]!.carrying).toBe(false)
    expect(world.metrics.foodCollected).toBe(0)
  })

  it('removes depleted food sources', () => {
    const world = createWorld({ params: { antCount: 1 }, seed: 5 })
    const ant = world.ants[0]!
    ant.age = 0
    ant.x = 100
    ant.y = 80
    world.foods.push(createFood(world.nextId++, 100, 80, 1))

    stepWorld(world, STEP)

    expect(world.foods).toHaveLength(0)
    expect(world.metrics.foodCollected).toBe(1)
  })
})

describe('lifecycle', () => {
  it('spawns blank ants with random ages inside their lifespan', () => {
    const world = createWorld()
    expect(world.ants.length).toBe(DEFAULT_PARAMS.antCount)
    for (const ant of world.ants) {
      expect(ant.age).toBeGreaterThanOrEqual(0)
      expect(ant.age).toBeLessThan(60)
      expect(ant.lifespan).toBe(60)
      expect(ant.typeId).toBe('blank')
      expect(ant.abilities).toEqual([])
    }
    const distinctAges = new Set(world.ants.map((ant) => ant.age))
    expect(distinctAges.size).toBeGreaterThan(1)
  })

  it('uses the nest type lifespan for initial ages', () => {
    const world = createWorld({
      params: { antCount: 3, spawnInterval: 0 },
      types: { long: type({ id: 'long', name: 'Long', lifespan: 10 }) },
      nestTypeId: 'long',
    })
    expect(world.ants.length).toBe(3)
    for (const ant of world.ants) {
      expect(ant.age).toBeGreaterThanOrEqual(0)
      expect(ant.age).toBeLessThan(10)
      expect(ant.lifespan).toBe(10)
    }
  })

  it('removes ants that exceed their own lifespan', () => {
    const world = createWorld({ params: { antCount: 2, spawnInterval: 0 } })
    const dying = world.ants[0]!
    const alive = world.ants[1]!
    dying.age = dying.lifespan - 0.25
    alive.age = 0

    stepWorld(world, 0.25)

    expect(world.ants).not.toContain(dying)
    expect(world.ants).toContain(alive)
  })

  it('does not apply lifespan changes to existing ants', () => {
    const world = createWorld({ params: { antCount: 1, spawnInterval: 0 } })
    const ant = world.ants[0]!
    ant.age = 59.5
    world.types['blank']!.lifespan = 120

    stepWorld(world, 0.25)
    stepWorld(world, 0.25)

    expect(world.ants).not.toContain(ant)
  })

  it('does not kill existing ants when the lifespan is shortened', () => {
    const world = createWorld({ params: { antCount: 1, spawnInterval: 0 } })
    const ant = world.ants[0]!
    ant.age = 10
    world.types['blank']!.lifespan = 5

    stepWorld(world, 0.25)

    expect(world.ants).toContain(ant)
  })

  it('spawns one ant per spawnInterval near the nest', () => {
    const world = createWorld({ params: { antCount: 0, spawnInterval: 1 } })

    for (let i = 0; i < 4; i++) {
      stepWorld(world, 0.25)
    }
    expect(world.ants).toHaveLength(1)
    const first = world.ants[0]!
    expect(first.age).toBe(0)
    expect(Math.hypot(first.x - world.nest.x, first.y - world.nest.y)).toBeLessThanOrEqual(
      world.params.nestRadius,
    )

    for (let i = 0; i < 4; i++) {
      stepWorld(world, 0.25)
    }
    expect(world.ants).toHaveLength(2)
    const second = world.ants[1]!
    expect(second.age).toBe(0)
    expect(Math.hypot(second.x - world.nest.x, second.y - world.nest.y)).toBeLessThanOrEqual(
      world.params.nestRadius,
    )
    expect(world.spawnTimer).toBeGreaterThanOrEqual(0)
    expect(world.spawnTimer).toBeLessThan(1)
  })

  it('gives new spawns the current nest type lifespan', () => {
    const world = createWorld({ params: { antCount: 0, spawnInterval: 1 } })
    for (let i = 0; i < 4; i++) {
      stepWorld(world, 0.25)
    }
    const older = world.ants[0]!

    world.types['blank']!.lifespan = 999
    for (let i = 0; i < 4; i++) {
      stepWorld(world, 0.25)
    }
    const newer = world.ants[1]!

    expect(newer.lifespan).toBe(999)
    expect(older.lifespan).toBe(60)
  })

  it('does not spawn automatically when spawnInterval is not positive', () => {
    const world = createWorld({ params: { antCount: 0, spawnInterval: 0 } })
    for (let i = 0; i < 40; i++) {
      stepWorld(world, STEP)
    }
    expect(world.ants).toHaveLength(0)
    expect(world.spawnTimer).toBe(0)
  })

  it('does not burst spawns when the spawn interval is shrunk', () => {
    const world = createWorld({ params: { antCount: 0, spawnInterval: 5 } })

    stepWorld(world, 4.9)
    expect(world.ants).toHaveLength(0)

    world.params.spawnInterval = 0.5
    stepWorld(world, 0.25)

    expect(world.ants).toHaveLength(1)
  })

  it('bounds spawns per step for a tiny spawn interval', () => {
    const world = createWorld({ params: { antCount: 0, spawnInterval: 1e-6 } })

    stepWorld(world, 0.1)

    expect(world.ants.length).toBeLessThanOrEqual(8)
    expect(world.spawnTimer).toBeLessThan(world.params.spawnInterval)
    expect(world.spawnTimer).toBeGreaterThanOrEqual(0)
  })

  it('spawns at the normal cadence after being disabled', () => {
    const world = createWorld({ params: { antCount: 0, spawnInterval: 5 } })

    stepWorld(world, 4.9)
    expect(world.ants).toHaveLength(0)

    world.params.spawnInterval = 0
    stepWorld(world, 1)
    expect(world.ants).toHaveLength(0)

    world.params.spawnInterval = 1
    stepWorld(world, 0.25)
    expect(world.ants).toHaveLength(1)
  })

  it('is deterministic across spawning and death', () => {
    const a = createWorld({ seed: 2024 })
    const b = createWorld({ seed: 2024 })
    for (let i = 0; i < 600; i++) {
      stepWorld(a, STEP)
      stepWorld(b, STEP)
    }
    expect(snapshot(a)).toEqual(snapshot(b))
    expect(a.spawnTimer).toBe(b.spawnTimer)
    expect(Array.from(a.pheromones.food)).toEqual(Array.from(b.pheromones.food))
    expect(a.metrics).toEqual(b.metrics)
  })
})

describe('ant types', () => {
  it('spawns initial ants as the blank type', () => {
    const world = createWorld({ params: { antCount: 5 } })
    for (const ant of world.ants) {
      expect(ant.typeId).toBe('blank')
      expect(ant.abilities).toEqual([])
      expect(ant.lifespan).toBe(60)
    }
  })

  it('spawns the selected nest type with its abilities', () => {
    const world = createWorld({ params: { antCount: 0, spawnInterval: 1 } })
    const scout = createAntType(world, {
      name: 'Scout',
      lifespan: 30,
      abilities: [
        { kind: 'wander', strength: 2 },
        { kind: 'walk', speed: 30 },
      ],
    })
    expect(setNestType(world, scout.id)).toBe(true)

    for (let i = 0; i < 4; i++) {
      stepWorld(world, 0.25)
    }

    const ant = world.ants[0]!
    expect(ant.typeId).toBe(scout.id)
    expect(ant.abilities).toEqual(scout.abilities)
    expect(ant.lifespan).toBe(30)
  })

  it('snapshots abilities and lifespan at spawn', () => {
    const world = createWorld({ params: { antCount: 0, spawnInterval: 0 } })
    const runner = createAntType(world, {
      name: 'Runner',
      lifespan: 60,
      abilities: [{ kind: 'walk', speed: 10 }],
    })
    setNestType(world, runner.id)

    const older = spawnAntNearNest(world, 0)
    runner.abilities = [{ kind: 'walk', speed: 99 }]
    runner.lifespan = 5
    const newer = spawnAntNearNest(world, 0)

    expect(older.abilities).toEqual([{ kind: 'walk', speed: 10 }])
    expect(older.lifespan).toBe(60)
    expect(newer.abilities).toEqual([{ kind: 'walk', speed: 99 }])
    expect(newer.lifespan).toBe(5)
  })

  it('falls back to blank when the requested nest type is missing', () => {
    const world = createWorld({ params: { antCount: 0 }, nestTypeId: 'ghost' })
    expect(world.nestTypeId).toBe('blank')
  })

  it('honours a valid provided nest type', () => {
    const world = createWorld({
      params: { antCount: 0 },
      types: { blank: { ...BLANK_TYPE }, queen: type({ id: 'queen', name: 'Queen' }) },
      nestTypeId: 'queen',
    })
    expect(world.nestTypeId).toBe('queen')
  })

  it('spawns an ant near the nest with a provided type via spawnAntWithType', () => {
    const world = createWorld({ params: { antCount: 0, spawnInterval: 0 } })
    const queen: AntType = {
      id: 'queen',
      name: 'Queen',
      lifespan: 42,
      abilities: [{ kind: 'walk', speed: 5 }],
    }

    const ant = spawnAntWithType(world, queen)

    expect(world.ants).toContain(ant)
    expect(ant.typeId).toBe('queen')
    expect(ant.lifespan).toBe(42)
    expect(ant.abilities).toEqual(queen.abilities)
    expect(Math.hypot(ant.x - world.nest.x, ant.y - world.nest.y)).toBeLessThanOrEqual(
      world.params.nestRadius,
    )
  })
})

describe('createAnt', () => {
  it('builds an ant that starts wandering', () => {
    const ant = createAnt(7, 50, 50, 0, 60, [])
    expect(ant).toMatchObject({
      id: 7,
      x: 50,
      y: 50,
      state: 'wander',
      carrying: false,
      age: 0,
      typeId: 'blank',
      lifespan: 60,
    })
    expect(ant.abilities).toEqual([])
  })

  it('copies abilities so callers cannot alias them', () => {
    const abilities: Ability[] = [{ kind: 'walk', speed: 10 }]
    const ant = createAnt(7, 50, 50, 0, 12, abilities, 'scout')

    expect(ant.abilities).toEqual(abilities)
    expect(ant.abilities).not.toBe(abilities)
    expect(ant.abilities[0]).not.toBe(abilities[0])
    expect(ant.typeId).toBe('scout')
    expect(ant.lifespan).toBe(12)
  })
})

describe('pheromone corruption regression', () => {
  it('leaves no NaN when a world is built from a sanitized-invalid ability list', () => {
    const abilities = sanitizeAbilities([
      { kind: 'emit', pheromone: 'home', intensity: NaN, condition: 'always' },
      { kind: 'emit', pheromone: 'hone', intensity: 5, condition: 'always' },
      { kind: 'emit', pheromone: 'food', intensity: '8', condition: 'always' },
      { kind: 'emit', pheromone: 'home', intensity: 8, condition: 'always' },
      { kind: 'walk', speed: Infinity },
      {
        kind: 'follow',
        pheromone: 'home',
        direction: 'sideways',
        sensorAngle: 0.4,
        sensorDistance: 5,
        turnRate: 2,
        condition: 'always',
      },
    ])

    const world = createWorld({
      params: { antCount: 4, spawnInterval: 0 },
      types: { worker: type({ id: 'worker', abilities }) },
      nestTypeId: 'worker',
    })

    run(world, 120)

    for (const kind of PHEROMONE_KINDS) {
      for (const value of world.pheromones[kind]) {
        expect(Number.isFinite(value)).toBe(true)
      }
    }
    expect(Array.from(world.pheromones.home).some((value) => value > 0)).toBe(true)
  })
})
