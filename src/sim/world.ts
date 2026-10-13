import { createRng } from './rng'
import { createParams } from './params'
import type { SimParams } from './params'
import { createGrid } from './grid'
import { createMetrics } from './metrics'
import { createFields, cullDiluted, decay, diffuse, emitRadial, recordPeaks } from './pheromone'
import { createWalls, addBorderWalls } from './walls'
import { generateMaze } from './maze'
import { updateAnt, spawnAntNearNest } from './ant'
import { BLANK_TYPE, cloneAbilities, getAntType } from './antTypes'
import { emitScent, pruneDepleted } from './food'
import { PHEROMONE_KINDS } from './types'
import type { AntType, Vec2, World } from './types'

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
  types?: Record<string, AntType>
  nestTypeId?: string
  maze?: boolean
  mazeCellSize?: number
  mazeObstacles?: number
}

function cloneBlankType(): AntType {
  return { ...BLANK_TYPE, abilities: cloneAbilities(BLANK_TYPE.abilities) }
}

function createDefaultTypes(): Record<string, AntType> {
  return {
    blank: cloneBlankType(),
  }
}

function nextCustomTypeId(types: Record<string, AntType>): number {
  let max = 0
  for (const id of Object.keys(types)) {
    const match = /^custom-(\d+)$/.exec(id)
    if (match) {
      const n = Number(match[1])
      if (n > max) {
        max = n
      }
    }
  }
  return max + 1
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
  const types = options.types ? { ...options.types } : createDefaultTypes()
  if (!types['blank']) {
    types['blank'] = cloneBlankType()
  }
  const nestTypeId =
    options.nestTypeId && types[options.nestTypeId] ? options.nestTypeId : 'blank'

  const walls = createWalls(grid)
  addBorderWalls(walls, grid)
  if (options.maze !== false) {
    generateMaze(walls, grid, rng, nest, {
      cellSize: options.mazeCellSize,
      obstacles: options.mazeObstacles,
    })
  }

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
    types,
    nestTypeId,
    nextTypeId: nextCustomTypeId(types),
    time: 0,
    spawnTimer: 0,
    nextId: 1,
  }

  const initialLifespan = (getAntType(world, nestTypeId) ?? BLANK_TYPE).lifespan
  for (let i = 0; i < params.antCount; i++) {
    spawnAntNearNest(world, rng.range(0, initialLifespan))
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
    pheromones.peaks.food,
    pheromones.dirs.food,
    grid,
    params.foodScentRadius,
    params.foodScentRate,
    dt,
  )

  emitRadial(
    pheromones.home,
    pheromones.peaks.home,
    pheromones.dirs.home,
    grid,
    world.nest.x,
    world.nest.y,
    params.homeScentRadius,
    params.homeScentRate,
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
    const peak = pheromones.peaks[kind]
    const dir = pheromones.dirs[kind]
    diffuse(field, grid, params.pheromoneDiffusion, dt)
    recordPeaks(field, peak)
    decay(field, params.pheromoneDecay, dt, dir)
    cullDiluted(field, peak, dir)
  }

  world.time += dt
  world.metrics.elapsed = world.time
}
