import { createRng } from './rng'
import { createParams } from './params'
import type { SimParams } from './params'
import { createGrid } from './grid'
import { createMetrics } from './metrics'
import { createFields, decay, diffuse } from './pheromone'
import { createWalls, addBorderWalls } from './walls'
import { createAnt, updateAnt } from './ant'
import { pruneDepleted } from './food'
import { PHEROMONE_KINDS } from './types'
import type { Vec2, World } from './types'

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
    nextId: 1,
  }

  const jitter = params.nestRadius * 0.5
  for (let i = 0; i < params.antCount; i++) {
    const x = nest.x + rng.range(-jitter, jitter)
    const y = nest.y + rng.range(-jitter, jitter)
    world.ants.push(createAnt(world.nextId++, x, y, rng.angle()))
  }

  return world
}

export function stepWorld(world: World, dt: number): void {
  const { params, grid, pheromones } = world

  for (const ant of world.ants) {
    updateAnt(world, ant, dt)
  }

  world.foods = pruneDepleted(world.foods)

  for (const kind of PHEROMONE_KINDS) {
    const field = pheromones[kind]
    diffuse(field, grid, params.pheromoneDiffusion, dt)
    decay(field, params.pheromoneDecay, dt)
  }

  world.time += dt
  world.metrics.elapsed = world.time
}
