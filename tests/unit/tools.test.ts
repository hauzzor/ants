import { describe, it, expect } from 'vitest'
import { createWorld, stepWorld } from '../../src/sim/world'
import { sample } from '../../src/sim/pheromone'
import { index } from '../../src/sim/grid'
import { totalFood } from '../../src/sim/food'
import { wallCount, isWallAt } from '../../src/sim/walls'
import {
  paintPheromone,
  erasePheromone,
  placeFood,
  removeFoodAt,
  drawWall,
  spawnAntAt,
  removeAntAt,
  setAntCount,
} from '../../src/sim/tools'

describe('paintPheromone', () => {
  it('adds a falling-off blob of attract pheromone', () => {
    const world = createWorld({ params: { antCount: 0 } })
    paintPheromone(world, 'attract', 100, 80, 8, 10)
    expect(sample(world.pheromones.attract, world.grid, 100, 80)).toBeGreaterThan(0)
    expect(sample(world.pheromones.attract, world.grid, 106, 80)).toBeGreaterThan(0)
    expect(sample(world.pheromones.attract, world.grid, 200, 80)).toBe(0)
  })

  it('paints repel into the repel field only', () => {
    const world = createWorld({ params: { antCount: 0 } })
    paintPheromone(world, 'repel', 100, 80, 8, 5)
    expect(sample(world.pheromones.repel, world.grid, 100, 80)).toBeGreaterThan(0)
    expect(sample(world.pheromones.attract, world.grid, 100, 80)).toBe(0)
  })

  it('raises the peak for every painted cell', () => {
    const world = createWorld({ params: { antCount: 0 } })
    paintPheromone(world, 'attract', 100, 80, 8, 10)
    expect(world.pheromones.peaks.attract.some((value) => value > 0)).toBe(true)
    expect(sample(world.pheromones.peaks.attract, world.grid, 100, 80)).toBeGreaterThan(0)
  })

  it('leaves painted cells direction-less', () => {
    const world = createWorld({ params: { antCount: 0 } })
    paintPheromone(world, 'attract', 100, 80, 8, 10)
    expect(world.pheromones.dirs.attract.x.every((value) => value === 0)).toBe(true)
    expect(world.pheromones.dirs.attract.y.every((value) => value === 0)).toBe(true)
  })
})

describe('erasePheromone', () => {
  it('clears every pheromone kind in the radius', () => {
    const world = createWorld({ params: { antCount: 0 } })
    paintPheromone(world, 'attract', 100, 80, 8, 10)
    paintPheromone(world, 'repel', 100, 80, 8, 10)
    erasePheromone(world, 100, 80, 12)
    expect(sample(world.pheromones.attract, world.grid, 100, 80)).toBe(0)
    expect(sample(world.pheromones.repel, world.grid, 100, 80)).toBe(0)
  })

  it('clears the peaks of every pheromone kind in the radius', () => {
    const world = createWorld({ params: { antCount: 0 } })
    paintPheromone(world, 'attract', 100, 80, 8, 10)
    paintPheromone(world, 'repel', 100, 80, 8, 10)
    erasePheromone(world, 100, 80, 12)
    expect(world.pheromones.peaks.attract.every((value) => value === 0)).toBe(true)
    expect(world.pheromones.peaks.repel.every((value) => value === 0)).toBe(true)
  })

  it('clears the directions of every pheromone kind in the radius', () => {
    const world = createWorld({ params: { antCount: 0 } })
    const i = index(world.grid, 25, 20)
    world.pheromones.dirs.attract.x[i] = 1
    world.pheromones.dirs.attract.y[i] = 2
    world.pheromones.dirs.repel.x[i] = 3
    world.pheromones.dirs.repel.y[i] = 4

    erasePheromone(world, 100, 80, 12)

    expect(world.pheromones.dirs.attract.x[i]).toBe(0)
    expect(world.pheromones.dirs.attract.y[i]).toBe(0)
    expect(world.pheromones.dirs.repel.x[i]).toBe(0)
    expect(world.pheromones.dirs.repel.y[i]).toBe(0)
  })
})

describe('placeFood / removeFoodAt', () => {
  it('places a food source with the default amount', () => {
    const world = createWorld({ params: { antCount: 0 } })
    const food = placeFood(world, 50, 50)
    expect(food.amount).toBe(world.params.foodAmount)
    expect(world.foods).toContain(food)
  })

  it('removes food within the radius', () => {
    const world = createWorld({ params: { antCount: 0 } })
    placeFood(world, 50, 50, 5)
    placeFood(world, 200, 50, 5)
    const removed = removeFoodAt(world, 50, 50, 10)
    expect(removed).toBe(1)
    expect(totalFood(world.foods)).toBe(5)
  })
})

describe('drawWall', () => {
  it('adds and removes walls', () => {
    const world = createWorld({ params: { antCount: 0 } })
    const base = wallCount(world.walls)
    drawWall(world, 100, 80, 8, 1)
    expect(wallCount(world.walls)).toBeGreaterThan(base)
    expect(isWallAt(world.walls, world.grid, 100, 80)).toBe(true)
    drawWall(world, 100, 80, 12, 0)
    expect(wallCount(world.walls)).toBe(base)
  })
})

describe('spawnAntAt / removeAntAt', () => {
  it('spawns an ant at a location', () => {
    const world = createWorld({ params: { antCount: 0 } })
    const ant = spawnAntAt(world, 60, 60)
    expect(world.ants).toContain(ant)
    expect(world.ants).toHaveLength(1)
  })

  it('removes ants within the radius', () => {
    const world = createWorld({ params: { antCount: 0 } })
    spawnAntAt(world, 60, 60)
    spawnAntAt(world, 200, 60)
    expect(removeAntAt(world, 60, 60, 10)).toBe(1)
    expect(world.ants).toHaveLength(1)
  })
})

describe('setAntCount', () => {
  it('grows the colony near the nest', () => {
    const world = createWorld({ params: { antCount: 0 } })
    setAntCount(world, 12)
    expect(world.ants).toHaveLength(12)
    for (const ant of world.ants) {
      const dist = Math.hypot(ant.x - world.nest.x, ant.y - world.nest.y)
      expect(dist).toBeLessThanOrEqual(world.params.nestRadius)
    }
  })

  it('shrinks the colony', () => {
    const world = createWorld({ params: { antCount: 10 } })
    setAntCount(world, 3)
    expect(world.ants).toHaveLength(3)
  })

  it('is deterministic when growing', () => {
    const a = createWorld({ params: { antCount: 0 } })
    const b = createWorld({ params: { antCount: 0 } })
    setAntCount(a, 20)
    setAntCount(b, 20)
    expect(a.ants.map((ant) => [ant.x, ant.y, ant.angle])).toEqual(
      b.ants.map((ant) => [ant.x, ant.y, ant.angle]),
    )
  })
})

describe('tool determinism', () => {
  it('painting then stepping matches across identical worlds', () => {
    const a = createWorld({ seed: 4 })
    const b = createWorld({ seed: 4 })
    paintPheromone(a, 'attract', 40, 40, 10, 8)
    paintPheromone(b, 'attract', 40, 40, 10, 8)
    for (let i = 0; i < 120; i++) {
      stepWorld(a, 1 / 60)
      stepWorld(b, 1 / 60)
    }
    expect(a.ants.map((ant) => [ant.x, ant.y])).toEqual(b.ants.map((ant) => [ant.x, ant.y]))
  })
})
