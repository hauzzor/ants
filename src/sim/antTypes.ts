import type { SimParams } from './params'
import type { AntBehavior, AntType, World } from './types'

export const BUILT_IN_TYPES: readonly AntType[] = [
  { id: 'worker', name: 'Worker', description: '' },
  { id: 'scout', name: 'Scout', description: 'fast curious explorer with keen senses' },
  { id: 'trailblazer', name: 'Trailblazer', description: 'hardworking loyal trail follower' },
]

export function behaviorFromParams(params: SimParams): AntBehavior {
  return {
    speed: params.antSpeed,
    turnRate: params.antTurnRate,
    sensorAngle: params.sensorAngle,
    sensorDistance: params.sensorDistance,
    wanderStrength: params.wanderStrength,
    pheromoneDeposit: params.pheromoneDeposit,
    followStrength: params.followStrength,
    attractStrength: params.attractStrength,
    repelStrength: params.repelStrength,
    nestBias: params.nestBias,
    lifespan: params.antLifespan,
  }
}

interface FieldRule {
  readonly words: readonly string[]
  readonly multiplier: number
}

const RULES: Record<keyof AntBehavior, readonly FieldRule[]> = {
  speed: [
    { words: ['fast', 'quick', 'speedy', 'swift', 'rapid'], multiplier: 1.5 },
    { words: ['slow', 'sluggish', 'lazy'], multiplier: 0.6 },
  ],
  turnRate: [
    { words: ['agile', 'nimble', 'twitchy', 'erratic'], multiplier: 1.6 },
    { words: ['steady', 'calm', 'gentle'], multiplier: 0.6 },
  ],
  sensorAngle: [],
  sensorDistance: [
    { words: ['keen', 'farsighted', 'aware', 'far sighted'], multiplier: 1.5 },
    { words: ['shortsighted', 'short sighted', 'near sighted'], multiplier: 0.6 },
  ],
  wanderStrength: [
    {
      words: ['wander', 'wanderer', 'explore', 'explorer', 'curious', 'scout', 'random'],
      multiplier: 1.6,
    },
    { words: ['direct', 'focused', 'determined', 'purposeful'], multiplier: 0.5 },
  ],
  pheromoneDeposit: [
    { words: ['hardworking', 'diligent', 'busy', 'industrious'], multiplier: 1.5 },
    { words: ['lazy'], multiplier: 0.5 },
  ],
  followStrength: [
    { words: ['follow', 'follower', 'trail', 'trailblazer', 'loyal'], multiplier: 1.6 },
    { words: ['independent', 'loner', 'ignore', 'ignores'], multiplier: 0.3 },
  ],
  attractStrength: [
    { words: ['food', 'hungry', 'greedy', 'forager', 'forage', 'foodie'], multiplier: 1.6 },
  ],
  repelStrength: [
    { words: ['cautious', 'careful', 'shy', 'avoid', 'avoids', 'repelled'], multiplier: 1.6 },
    { words: ['brave', 'bold', 'fearless', 'reckless'], multiplier: 0.4 },
  ],
  nestBias: [
    { words: ['home', 'homing', 'loyal', 'nest'], multiplier: 1.5 },
    { words: ['adventurous', 'roam', 'roamer'], multiplier: 0.5 },
  ],
  lifespan: [
    { words: ['long lived', 'immortal', 'ancient'], multiplier: 1.5 },
    { words: ['short lived', 'mayfly', 'fleeting'], multiplier: 0.5 },
  ],
}

const CLAMPS: Record<keyof AntBehavior, readonly [number, number]> = {
  speed: [2, 80],
  turnRate: [0.5, 12],
  sensorAngle: [0.1, 2],
  sensorDistance: [2, 24],
  wanderStrength: [0, 6],
  pheromoneDeposit: [0, 40],
  followStrength: [0, 10],
  attractStrength: [0, 10],
  repelStrength: [0, 10],
  nestBias: [0, 4],
  lifespan: [5, 300],
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function firstMultiplier(padded: string, rules: readonly FieldRule[]): number | undefined {
  for (const rule of rules) {
    for (const word of rule.words) {
      if (padded.includes(` ${word} `)) {
        return rule.multiplier
      }
    }
  }
  return undefined
}

function resolveField(
  padded: string,
  field: keyof AntBehavior,
  base: number,
  alwaysClamp = false,
): number {
  const [min, max] = CLAMPS[field]
  const multiplier = firstMultiplier(padded, RULES[field])
  if (multiplier === undefined) {
    return alwaysClamp ? clamp(base, min, max) : base
  }
  return clamp(base * multiplier, min, max)
}

export function parseAntBehavior(description: string, base: AntBehavior): AntBehavior {
  const padded = ` ${description.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `
  return {
    speed: resolveField(padded, 'speed', base.speed),
    turnRate: resolveField(padded, 'turnRate', base.turnRate),
    sensorAngle: resolveField(padded, 'sensorAngle', base.sensorAngle, true),
    sensorDistance: resolveField(padded, 'sensorDistance', base.sensorDistance),
    wanderStrength: resolveField(padded, 'wanderStrength', base.wanderStrength),
    pheromoneDeposit: resolveField(padded, 'pheromoneDeposit', base.pheromoneDeposit),
    followStrength: resolveField(padded, 'followStrength', base.followStrength),
    attractStrength: resolveField(padded, 'attractStrength', base.attractStrength),
    repelStrength: resolveField(padded, 'repelStrength', base.repelStrength),
    nestBias: resolveField(padded, 'nestBias', base.nestBias),
    lifespan: resolveField(padded, 'lifespan', base.lifespan),
  }
}

export function typeNameFromDescription(description: string): string {
  const trimmed = description.trim()
  if (trimmed.length === 0) {
    return 'Custom'
  }
  return trimmed
    .split(/\s+/)
    .slice(0, 3)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ')
}

export function getAntTypes(world: World): AntType[] {
  return Object.values(world.types)
}

export function getAntType(world: World, id: string): AntType | undefined {
  return world.types[id]
}

export function createAntType(world: World, description: string): AntType {
  const id = `custom-${world.nextTypeId++}`
  const type: AntType = { id, name: typeNameFromDescription(description), description }
  world.types[id] = type
  return type
}

export function setNestType(world: World, id: string): boolean {
  if (!world.types[id]) {
    return false
  }
  world.nestTypeId = id
  return true
}

export function behaviorForType(world: World, id: string): AntBehavior {
  const base = behaviorFromParams(world.params)
  const type = world.types[id] ?? world.types['worker']
  if (!type) {
    return base
  }
  return parseAntBehavior(type.description, base)
}
