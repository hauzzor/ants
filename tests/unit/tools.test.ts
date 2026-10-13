import { describe, it, expect } from 'vitest'
import { createWorld, stepWorld } from '../../src/sim/world'
import { sample } from '../../src/sim/pheromone'
import { index } from '../../src/sim/grid'
import { totalFood } from '../../src/sim/food'
import { wallCount, obstacleCount, isWallAt } from '../../src/sim/walls'
import {
  paintPheromone,
  erasePheromone,
  placeFood,
  removeFoodAt,
  placeObstacleRect,
  drawWall,
  spawnAntAt,
  removeAntAt,
  setAntCount,
} from '../../src/sim/tools'
import { PHEROMONE_KINDS } from '../../src/sim/types'

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

  it('clears pheromone under newly drawn walls', () => {
    const world = createWorld({ params: { antCount: 0 } })
    paintPheromone(world, 'attract', 100, 80, 8, 10)
    const blocked = index(world.grid, 25, 20)
    expect(world.pheromones.attract[blocked]).toBeGreaterThan(0)
    for (const kind of PHEROMONE_KINDS) {
      world.pheromones.dirs[kind].x[blocked] = 1
      world.pheromones.dirs[kind].y[blocked] = 2
    }

    drawWall(world, 100, 80, 4, 1)

    expect(isWallAt(world.walls, world.grid, 100, 80)).toBe(true)
    for (const kind of PHEROMONE_KINDS) {
      expect(world.pheromones[kind][blocked]).toBe(0)
      expect(world.pheromones.peaks[kind][blocked]).toBe(0)
      expect(world.pheromones.dirs[kind].x[blocked]).toBe(0)
      expect(world.pheromones.dirs[kind].y[blocked]).toBe(0)
    }
  })
})

describe('placeObstacleRect', () => {
  it('writes value 2 over the covered cells and clears pheromone inside', () => {
    const world = createWorld({ params: { antCount: 0 } })
    const before = obstacleCount(world.walls)
    const i = index(world.grid, 3, 3)
    for (const kind of PHEROMONE_KINDS) {
      world.pheromones[kind][i] = 5
      world.pheromones.peaks[kind][i] = 7
      world.pheromones.dirs[kind].x[i] = 1
      world.pheromones.dirs[kind].y[i] = 2
    }

    placeObstacleRect(world, 10, 10, 22, 18)

    expect(obstacleCount(world.walls)).toBe(before + 12)
    expect(isWallAt(world.walls, world.grid, 15, 15)).toBe(true)
    for (const kind of PHEROMONE_KINDS) {
      expect(world.pheromones[kind][i]).toBe(0)
      expect(world.pheromones.peaks[kind][i]).toBe(0)
      expect(world.pheromones.dirs[kind].x[i]).toBe(0)
      expect(world.pheromones.dirs[kind].y[i]).toBe(0)
    }
  })

  it('leaves pheromone outside the rect untouched', () => {
    const world = createWorld({ params: { antCount: 0 } })
    const outside = index(world.grid, 7, 3)
    for (const kind of PHEROMONE_KINDS) {
      world.pheromones[kind][outside] = 5
      world.pheromones.peaks[kind][outside] = 7
      world.pheromones.dirs[kind].x[outside] = 1
      world.pheromones.dirs[kind].y[outside] = 2
    }

    placeObstacleRect(world, 10, 10, 22, 18)

    for (const kind of PHEROMONE_KINDS) {
      expect(world.pheromones[kind][outside]).toBe(5)
      expect(world.pheromones.peaks[kind][outside]).toBe(7)
      expect(world.pheromones.dirs[kind].x[outside]).toBe(1)
      expect(world.pheromones.dirs[kind].y[outside]).toBe(2)
    }
  })

  it('relocates ants caught inside the rect', () => {
    const world = createWorld({ params: { antCount: 0 } })
    const ant = spawnAntAt(world, 15, 15)
    placeObstacleRect(world, 10, 10, 22, 18)
    expect(isWallAt(world.walls, world.grid, ant.x, ant.y)).toBe(false)
  })

  it('removes food buried by the rect', () => {
    const world = createWorld({ params: { antCount: 0 } })
    placeFood(world, 15, 15, 5)
    placeFood(world, 200, 80, 5)
    placeObstacleRect(world, 10, 10, 22, 18)
    expect(world.foods).toHaveLength(1)
    expect(world.foods[0]!.x).toBeGreaterThan(100)
  })
})

describe('blocked-cell snapping', () => {
  it('spawnAntAt snaps an ant out of an obstacle', () => {
    const world = createWorld({ params: { antCount: 0 } })
    placeObstacleRect(world, 10, 10, 22, 18)
    const ant = spawnAntAt(world, 15, 15)
    expect(isWallAt(world.walls, world.grid, ant.x, ant.y)).toBe(false)
  })

  it('placeFood snaps a source out of an obstacle', () => {
    const world = createWorld({ params: { antCount: 0 } })
    placeObstacleRect(world, 10, 10, 22, 18)
    const food = placeFood(world, 15, 15, 5)
    expect(isWallAt(world.walls, world.grid, food.x, food.y)).toBe(false)
  })
})

describe('paintPheromone blocked cells', () => {
  it('leaves a blocked cell at zero', () => {
    const world = createWorld({ params: { antCount: 0 } })
    placeObstacleRect(world, 10, 10, 22, 18)
    const blocked = index(world.grid, 3, 3)
    const open = index(world.grid, 6, 3)
    paintPheromone(world, 'attract', 14, 14, 14, 10)
    expect(world.pheromones.attract[blocked]).toBe(0)
    expect(world.pheromones.attract[open]).toBeGreaterThan(0)
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

  it('obstacle placement is deterministic across identical worlds', () => {
    const a = createWorld({ seed: 4 })
    const b = createWorld({ seed: 4 })
    placeObstacleRect(a, 80, 60, 120, 100)
    placeObstacleRect(b, 80, 60, 120, 100)

    expect(a.ants.map((ant) => [ant.x, ant.y, ant.angle, ant.carrying])).toEqual(
      b.ants.map((ant) => [ant.x, ant.y, ant.angle, ant.carrying]),
    )
    expect(Array.from(a.walls)).toEqual(Array.from(b.walls))
    for (const kind of PHEROMONE_KINDS) {
      expect(Array.from(a.pheromones[kind])).toEqual(Array.from(b.pheromones[kind]))
      expect(Array.from(a.pheromones.peaks[kind])).toEqual(Array.from(b.pheromones.peaks[kind]))
      expect(Array.from(a.pheromones.dirs[kind].x)).toEqual(Array.from(b.pheromones.dirs[kind].x))
      expect(Array.from(a.pheromones.dirs[kind].y)).toEqual(Array.from(b.pheromones.dirs[kind].y))
    }
  })
})
