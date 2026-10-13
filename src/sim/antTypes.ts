import { PHEROMONE_KINDS } from './types'
import type {
  Ability,
  AntType,
  AntTypeDraft,
  Condition,
  PheromoneKind,
  World,
} from './types'

export const BLANK_TYPE: AntType = {
  id: 'blank',
  name: 'Blank',
  lifespan: 60,
  abilities: [],
}

const MAX_NAME_LENGTH = 40
const LIFESPAN_MIN = 1
const LIFESPAN_MAX = 300

const PHEROMONE_KIND_SET: ReadonlySet<string> = new Set(PHEROMONE_KINDS)
const CONDITION_SET: ReadonlySet<string> = new Set<Condition>([
  'always',
  'carrying',
  'empty',
])
const DIRECTION_SET: ReadonlySet<string> = new Set(['toward', 'away'])

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isPheromoneKind(value: unknown): value is PheromoneKind {
  return typeof value === 'string' && PHEROMONE_KIND_SET.has(value)
}

function isCondition(value: unknown): value is Condition {
  return typeof value === 'string' && CONDITION_SET.has(value)
}

function isDirection(value: unknown): value is 'toward' | 'away' {
  return typeof value === 'string' && DIRECTION_SET.has(value)
}

function sanitizeAbility(raw: unknown): Ability | undefined {
  if (!isRecord(raw)) {
    return undefined
  }
  switch (raw.kind) {
    case 'walk':
      if (!isFiniteNumber(raw.speed)) {
        return undefined
      }
      return { kind: 'walk', speed: clamp(raw.speed, 0, 80) }
    case 'wander':
      if (!isFiniteNumber(raw.strength)) {
        return undefined
      }
      return { kind: 'wander', strength: clamp(raw.strength, 0, 10) }
    case 'emit':
      if (!isFiniteNumber(raw.intensity)) {
        return undefined
      }
      if (!isPheromoneKind(raw.pheromone) || !isCondition(raw.condition)) {
        return undefined
      }
      return {
        kind: 'emit',
        pheromone: raw.pheromone,
        intensity: clamp(raw.intensity, 0, 40),
        condition: raw.condition,
      }
    case 'follow':
      if (
        !isFiniteNumber(raw.sensorAngle) ||
        !isFiniteNumber(raw.sensorDistance) ||
        !isFiniteNumber(raw.turnRate)
      ) {
        return undefined
      }
      if (
        !isPheromoneKind(raw.pheromone) ||
        !isDirection(raw.direction) ||
        !isCondition(raw.condition)
      ) {
        return undefined
      }
      return {
        kind: 'follow',
        pheromone: raw.pheromone,
        direction: raw.direction,
        sensorAngle: clamp(raw.sensorAngle, 0, 2),
        sensorDistance: clamp(raw.sensorDistance, 0, 24),
        turnRate: clamp(raw.turnRate, 0, 12),
        condition: raw.condition,
      }
    default:
      return undefined
  }
}

export function cloneAbilities(abilities: Ability[]): Ability[] {
  return abilities.map((ability) => ({ ...ability }))
}

export function sanitizeAbilities(abilities: readonly unknown[]): Ability[] {
  const result: Ability[] = []
  for (const ability of abilities) {
    const sanitized = sanitizeAbility(ability)
    if (sanitized) {
      result.push(sanitized)
    }
  }
  return result
}

function sanitizeName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return 'Custom ant'
  }
  return trimmed.slice(0, MAX_NAME_LENGTH)
}

export function createAntType(world: World, draft: AntTypeDraft): AntType {
  const id = `custom-${world.nextTypeId++}`
  const type: AntType = {
    id,
    name: sanitizeName(draft.name),
    lifespan: clamp(draft.lifespan, LIFESPAN_MIN, LIFESPAN_MAX),
    abilities: sanitizeAbilities(draft.abilities),
  }
  world.types[id] = type
  return type
}

export function updateAntType(world: World, id: string, draft: AntTypeDraft): boolean {
  if (id === 'blank') {
    return false
  }
  const type = world.types[id]
  if (!type) {
    return false
  }
  type.name = sanitizeName(draft.name)
  type.lifespan = clamp(draft.lifespan, LIFESPAN_MIN, LIFESPAN_MAX)
  type.abilities = sanitizeAbilities(draft.abilities)
  return true
}

export function deleteAntType(world: World, id: string): boolean {
  if (id === 'blank' || !world.types[id]) {
    return false
  }
  delete world.types[id]
  if (world.nestTypeId === id) {
    world.nestTypeId = 'blank'
  }
  return true
}

export function getAntTypes(world: World): AntType[] {
  return Object.values(world.types)
}

export function getAntType(world: World, id: string): AntType | undefined {
  return world.types[id]
}

export function setNestType(world: World, id: string): boolean {
  if (!world.types[id]) {
    return false
  }
  world.nestTypeId = id
  return true
}
