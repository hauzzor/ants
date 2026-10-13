export interface SimParams {
  antCount: number
  antSpeed: number
  antTurnRate: number
  sensorAngle: number
  sensorDistance: number
  wanderStrength: number
  pheromoneDeposit: number
  pheromoneDecay: number
  pheromoneDiffusion: number
  followStrength: number
  attractStrength: number
  repelStrength: number
  nestBias: number
  pickupRadius: number
  nestRadius: number
  foodAmount: number
  foodScentRate: number
  foodScentRadius: number
}

export const DEFAULT_PARAMS: SimParams = {
  antCount: 40,
  antSpeed: 26,
  antTurnRate: 4,
  sensorAngle: 0.6,
  sensorDistance: 6,
  wanderStrength: 1.2,
  pheromoneDeposit: 8,
  pheromoneDecay: 0.12,
  pheromoneDiffusion: 0.5,
  followStrength: 2.2,
  attractStrength: 1.6,
  repelStrength: 2.4,
  nestBias: 0.9,
  pickupRadius: 4,
  nestRadius: 6,
  foodAmount: 60,
  foodScentRate: 5,
  foodScentRadius: 16,
}

export function createParams(overrides: Partial<SimParams> = {}): SimParams {
  return { ...DEFAULT_PARAMS, ...overrides }
}
