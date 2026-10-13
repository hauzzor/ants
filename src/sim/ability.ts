import { deposit, sample } from './pheromone'
import type { Rng } from './rng'
import type { Ability, Ant, Condition, FollowAbility, World } from './types'

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

function sensorSample(world: World, ant: Ant, ability: FollowAbility, offset: number): number {
  const heading = ant.angle + offset
  const x = ant.x + Math.cos(heading) * ability.sensorDistance
  const y = ant.y + Math.sin(heading) * ability.sensorDistance
  return sample(world.pheromones[ability.pheromone], world.grid, x, y)
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
    const left = sensorSample(world, ant, ability, -ability.sensorAngle)
    const center = sensorSample(world, ant, ability, 0)
    const right = sensorSample(world, ant, ability, ability.sensorAngle)
    const direction = ability.direction === 'away' ? -1 : 1
    delta += turnFromSamples(left, center, right) * direction * ability.turnRate * dt
  }
  return delta
}

export function emitAbilities(world: World, ant: Ant, dt: number): void {
  for (const ability of ant.abilities) {
    if (ability.kind !== 'emit' || !conditionMet(ability.condition, ant)) {
      continue
    }
    deposit(world.pheromones[ability.pheromone], world.grid, ant.x, ant.y, ability.intensity * dt)
  }
}
