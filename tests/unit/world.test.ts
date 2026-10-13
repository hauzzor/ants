import { describe, it, expect } from 'vitest'
import { createWorld, stepWorld } from '../../src/sim/world'
import { createAnt } from '../../src/sim/ant'
import { createFood } from '../../src/sim/food'
import { isWallAt } from '../../src/sim/walls'
import { deposit } from '../../src/sim/pheromone'
import { sample } from '../../src/sim/pheromone'
import { DEFAULT_PARAMS } from '../../src/sim/params'
import type { World } from '../../src/sim/types'

const STEP = 1 / 60

function snapshot(world: World) {
  return world.ants.map((ant) => ({
    x: ant.x,
    y: ant.y,
    angle: ant.angle,
    carrying: ant.carrying,
  }))
}

function run(world: World, steps: number): void {
  for (let i = 0; i < steps; i++) {
    stepWorld(world, STEP)
  }
}

describe('createWorld', () => {
  it('creates the default arena and grid', () => {
    const world = createWorld()
    expect(world.width).toBe(240)
    expect(world.height).toBe(160)
    expect(world.grid).toEqual({ cols: 60, rows: 40, cellSize: 4 })
    expect(world.nest).toEqual({ x: 120, y: 80 })
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

  it('keeps ants out of walls', () => {
    const world = createWorld({ seed: 3 })
    run(world, 600)
    for (const ant of world.ants) {
      expect(isWallAt(world.walls, world.grid, ant.x, ant.y)).toBe(false)
    }
  })

  it('has ants lay home pheromone as they explore', () => {
    const world = createWorld({ seed: 9 })
    run(world, 120)
    const total = world.pheromones.home.reduce((sum, v) => sum + v, 0)
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
  it('spawns default ants with random ages inside their lifespan', () => {
    const world = createWorld()
    expect(world.ants.length).toBe(DEFAULT_PARAMS.antCount)
    for (const ant of world.ants) {
      expect(ant.age).toBeGreaterThanOrEqual(0)
      expect(ant.age).toBeLessThan(world.params.antLifespan)
      expect(ant.lifespan).toBe(world.params.antLifespan)
    }
    const distinctAges = new Set(world.ants.map((ant) => ant.age))
    expect(distinctAges.size).toBeGreaterThan(1)
  })

  it('respects antCount and antLifespan overrides', () => {
    const world = createWorld({ params: { antCount: 3, antLifespan: 10 } })
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
    world.params.antLifespan = 120

    stepWorld(world, 0.25)
    stepWorld(world, 0.25)

    expect(world.ants).not.toContain(ant)
  })

  it('does not kill existing ants when the lifespan is shortened', () => {
    const world = createWorld({ params: { antCount: 1, spawnInterval: 0 } })
    const ant = world.ants[0]!
    ant.age = 10
    world.params.antLifespan = 5

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

  it('gives new spawns the current lifespan param', () => {
    const world = createWorld({ params: { antCount: 0, spawnInterval: 1 } })
    for (let i = 0; i < 4; i++) {
      stepWorld(world, 0.25)
    }
    const older = world.ants[0]!

    world.params.antLifespan = 999
    for (let i = 0; i < 4; i++) {
      stepWorld(world, 0.25)
    }
    const newer = world.ants[1]!

    expect(newer.lifespan).toBe(999)
    expect(older.lifespan).toBe(DEFAULT_PARAMS.antLifespan)
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
    expect(a.ants.map((ant) => [ant.x, ant.y, ant.age, ant.lifespan])).toEqual(
      b.ants.map((ant) => [ant.x, ant.y, ant.age, ant.lifespan]),
    )
    expect(a.spawnTimer).toBe(b.spawnTimer)
    expect(Array.from(a.pheromones.food)).toEqual(Array.from(b.pheromones.food))
    expect(a.metrics).toEqual(b.metrics)
  })
})

describe('createAnt', () => {
  it('builds an ant that starts wandering', () => {
    const ant = createAnt(7, 50, 50, 0)
    expect(ant).toMatchObject({ id: 7, x: 50, y: 50, state: 'wander', carrying: false })
    expect(ant.age).toBe(0)
    expect(ant.lifespan).toBe(DEFAULT_PARAMS.antLifespan)
  })

  it('captures the given age and lifespan', () => {
    const ant = createAnt(7, 50, 50, 0, 3, 12)
    expect(ant.age).toBe(3)
    expect(ant.lifespan).toBe(12)
  })
})
