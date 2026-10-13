import type { Rng } from './rng'
import type { SimParams } from './params'
import type { Metrics } from './metrics'

export interface Vec2 {
  x: number
  y: number
}

export interface Grid {
  cols: number
  rows: number
  cellSize: number
}

export type AntState = 'wander' | 'return'

export interface Ant {
  id: number
  x: number
  y: number
  angle: number
  state: AntState
  carrying: boolean
  wander: number
  age: number
  lifespan: number
}

export interface FoodSource {
  id: number
  x: number
  y: number
  amount: number
}

export type PheromoneKind = 'home' | 'food' | 'attract' | 'repel'

export const PHEROMONE_KINDS: readonly PheromoneKind[] = [
  'home',
  'food',
  'attract',
  'repel',
]

export interface PheromoneFields {
  home: Float32Array
  food: Float32Array
  attract: Float32Array
  repel: Float32Array
}

export interface World {
  width: number
  height: number
  grid: Grid
  rng: Rng
  params: SimParams
  ants: Ant[]
  foods: FoodSource[]
  nest: Vec2
  walls: Uint8Array
  pheromones: PheromoneFields
  metrics: Metrics
  time: number
  spawnTimer: number
  nextId: number
}
