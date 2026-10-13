export interface SimParams {
  antCount: number
  pheromoneDecay: number
  pheromoneDiffusion: number
  pickupRadius: number
  nestRadius: number
  foodAmount: number
  foodScentRate: number
  foodScentRadius: number
  spawnInterval: number
}

export const DEFAULT_PARAMS: SimParams = {
  antCount: 100,
  pheromoneDecay: 0.12,
  pheromoneDiffusion: 0.5,
  pickupRadius: 4,
  nestRadius: 6,
  foodAmount: 60,
  foodScentRate: 5,
  foodScentRadius: 16,
  spawnInterval: 1,
}

export function createParams(overrides: Partial<SimParams> = {}): SimParams {
  return { ...DEFAULT_PARAMS, ...overrides }
}
