import { createRng } from './rng'
import { createParams } from './params'
import type { SimParams } from './params'
import { createGrid } from './grid'
import { createMetrics } from './metrics'
import { createFields, decay, diffuse } from './pheromone'
import { createWalls, addBorderWalls } from './walls'
import { updateAnt, spawnAntNearNest } from './ant'
import { emitScent, pruneDepleted } from './food'
import { PHEROMONE_KINDS } from './types'
import type { Vec2, World } from './types'

const MAX_SPAWNS_PER_STEP = 8

export const DEFAULT_WORLD = {
  width: 240,
  height: 160,
  cellSize: 4,
  seed: 1,
} as const

export interface WorldOptions {
  width?: number
  height?: number
  cellSize?: number
  seed?: number
  params?: Partial<SimParams>
  nest?: Vec2
}

export function createWorld(options: WorldOptions = {}): World {
  const width = options.width ?? DEFAULT_WORLD.width
  const height = options.height ?? DEFAULT_WORLD.height
  const cellSize = options.cellSize ?? DEFAULT_WORLD.cellSize
  const seed = options.seed ?? DEFAULT_WORLD.seed
  const grid = createGrid(width, height, cellSize)
  const rng = createRng(seed)
  const params = createParams(options.params)
  const nest = options.nest ?? { x: width / 2, y: height / 2 }

  const walls = createWalls(grid)
  addBorderWalls(walls, grid)

  const world: World = {
    width,
    height,
    grid,
    rng,
    params,
    ants: [],
    foods: [],
    nest,
    walls,
    pheromones: createFields(grid),
    metrics: createMetrics(),
    time: 0,
    spawnTimer: 0,
    nextId: 1,
  }

  for (let i = 0; i < params.antCount; i++) {
    spawnAntNearNest(world, rng.range(0, params.antLifespan))
  }

  return world
}

export function stepWorld(world: World, dt: number): void {
  const { params, grid, pheromones } = world

  for (const ant of world.ants) {
    updateAnt(world, ant, dt)
  }

  world.foods = pruneDepleted(world.foods)

  world.ants = world.ants.filter((ant) => ant.age < ant.lifespan)

  emitScent(
    world.foods,
    pheromones.food,
    grid,
    params.foodScentRadius,
    params.foodScentRate,
    dt,
  )

  if (params.spawnInterval > 0) {
    world.spawnTimer = Math.min(world.spawnTimer, params.spawnInterval)
    world.spawnTimer += dt
    let spawns = 0
    while (world.spawnTimer >= params.spawnInterval && spawns < MAX_SPAWNS_PER_STEP) {
      world.spawnTimer -= params.spawnInterval
      spawnAntNearNest(world)
      spawns++
    }
    if (world.spawnTimer >= params.spawnInterval) {
      world.spawnTimer %= params.spawnInterval
    }
  }

  for (const kind of PHEROMONE_KINDS) {
    const field = pheromones[kind]
    diffuse(field, grid, params.pheromoneDiffusion, dt)
    decay(field, params.pheromoneDecay, dt)
  }

  world.time += dt
  world.metrics.elapsed = world.time
}
