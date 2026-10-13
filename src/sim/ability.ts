import { deposit, PHEROMONE_DIRECTION_EPSILON, sample, sampleDirection } from './pheromone'
import type { Rng } from './rng'
import type { Ability, Ant, Condition, FollowAbility, PheromoneKind, World } from './types'

export const PHEROMONE_FRESHNESS_HALF_LIFE = 8

export function pheromoneContactSource(kind: PheromoneKind): 'nest' | 'food' {
  return kind === 'food' || kind === 'attract' ? 'food' : 'nest'
}

export function sourceFreshness(elapsed: number): number {
  return Math.exp((-elapsed * Math.LN2) / PHEROMONE_FRESHNESS_HALF_LIFE)
}

export function conditionMet(condition: Condition, ant: Ant): boolean {
  if (condition === 'always') {
    return true
  }
  if (condition === 'carrying') {
    return ant.carrying
  }
  return !ant.carrying
}

export function totalWalkSpeed(abilities: Ability[]): number {
  let total = 0
  for (const ability of abilities) {
    if (ability.kind === 'walk') {
      total += ability.speed
    }
  }
  return Math.min(80, Math.max(0, total))
}

export function wanderTurnDelta(abilities: Ability[], rng: Rng, dt: number): number {
  let delta = 0
  for (const ability of abilities) {
    if (ability.kind === 'wander') {
      delta += rng.range(-1, 1) * ability.strength * dt
    }
  }
  return delta
}

interface SensorProbe {
  field: number
  dir: { x: number; y: number; magnitude: number }
}

function sensorProbe(world: World, ant: Ant, ability: FollowAbility, offset: number): SensorProbe {
  const heading = ant.angle + offset
  const x = ant.x + Math.cos(heading) * ability.sensorDistance
  const y = ant.y + Math.sin(heading) * ability.sensorDistance
  const raw = sample(world.pheromones[ability.pheromone], world.grid, x, y)
  const field = raw < world.params.pheromoneDetectThreshold ? 0 : raw
  const dir = sampleDirection(world.pheromones, ability.pheromone, world.grid, x, y)
  return { field, dir }
}

function strongestProbe(probes: SensorProbe[]): number {
  let best = -1
  for (let i = 0; i < probes.length; i++) {
    const probe = probes[i]
    if (!probe || probe.field <= 0) {
      continue
    }
    if (best < 0 || probe.field > (probes[best]?.field ?? 0)) {
      best = i
    }
  }
  return best
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(-1, value))
}

function shortestSignedAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

function turnFromSamples(left: number, center: number, right: number): number {
  if (left > center && left >= right) {
    return -1
  }
  if (right > center && right > left) {
    return 1
  }
  return 0
}

export function followTurnDelta(world: World, ant: Ant, dt: number): number {
  let delta = 0
  for (const ability of ant.abilities) {
    if (ability.kind !== 'follow' || !conditionMet(ability.condition, ant)) {
      continue
    }
    const left = sensorProbe(world, ant, ability, -ability.sensorAngle)
    const center = sensorProbe(world, ant, ability, 0)
    const right = sensorProbe(world, ant, ability, ability.sensorAngle)
    const probes = [left, center, right]
    const strongest = strongestProbe(probes)
    const probe = strongest >= 0 ? probes[strongest] : undefined

    if (probe && probe.dir.magnitude > PHEROMONE_DIRECTION_EPSILON) {
      const away = ability.direction === 'away'
      const desired = Math.atan2(probe.dir.y, probe.dir.x) + (away ? Math.PI : 0)
      delta += clampUnit(shortestSignedAngle(desired - ant.angle)) * ability.turnRate * dt
      continue
    }

    const direction = ability.direction === 'away' ? -1 : 1
    delta +=
      turnFromSamples(left.field, center.field, right.field) * direction * ability.turnRate * dt
  }
  return delta
}

export function emitAbilities(world: World, ant: Ant, dt: number): void {
  for (const ability of ant.abilities) {
    if (ability.kind !== 'emit' || !conditionMet(ability.condition, ant)) {
      continue
    }
    const source = pheromoneContactSource(ability.pheromone)
    const contactTime = source === 'nest' ? ant.lastNestContact : ant.lastFoodContact
    const elapsed = Math.max(0, world.time - contactTime)
    const amount = ability.intensity * dt * sourceFreshness(elapsed)
    deposit(
      world.pheromones[ability.pheromone],
      world.pheromones.peaks[ability.pheromone],
      world.pheromones.dirs[ability.pheromone],
      world.grid,
      ant.x,
      ant.y,
      amount,
      Math.cos(ant.angle),
      Math.sin(ant.angle),
    )
  }
}
