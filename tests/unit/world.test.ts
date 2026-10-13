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

describe('foraging', () => {
  it('picks up food and records it', () => {
    const world = createWorld({ params: { antCount: 1 }, seed: 5 })
    const ant = world.ants[0]!
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
    stepWorld(world, STEP)
    expect(world.ants[0]!.carrying).toBe(false)
    expect(world.metrics.foodCollected).toBe(0)
  })

  it('removes depleted food sources', () => {
    const world = createWorld({ params: { antCount: 1 }, seed: 5 })
    const ant = world.ants[0]!
    ant.x = 100
    ant.y = 80
    world.foods.push(createFood(world.nextId++, 100, 80, 1))

    stepWorld(world, STEP)

    expect(world.foods).toHaveLength(0)
    expect(world.metrics.foodCollected).toBe(1)
  })
})

describe('createAnt', () => {
  it('builds an ant that starts wandering', () => {
    const ant = createAnt(7, 50, 50, 0)
    expect(ant).toMatchObject({ id: 7, x: 50, y: 50, state: 'wander', carrying: false })
  })
})
