import { deposit, sample } from './pheromone'
import { isWallAt } from './walls'
import { findFoodAt, takeFood } from './food'
import { behaviorForType } from './antTypes'
import type { Ant, AntBehavior, World } from './types'

const TWO_PI = Math.PI * 2
const HALF_PI = Math.PI / 2

export function createAnt(
  id: number,
  x: number,
  y: number,
  angle: number,
  behavior: AntBehavior,
  age = 0,
  typeId = 'worker',
): Ant {
  return { id, x, y, angle, state: 'wander', carrying: false, wander: 0, age, behavior, typeId }
}

export function spawnAnt(world: World, x: number, y: number): Ant {
  const typeId = world.nestTypeId
  const behavior = behaviorForType(world, typeId)
  const ant = createAnt(world.nextId++, x, y, world.rng.angle(), behavior, 0, typeId)
  world.ants.push(ant)
  return ant
}

export function spawnAntNearNest(world: World, age = 0): Ant {
  const { nest, rng, params } = world
  const jitter = params.nestRadius * 0.5
  const x = nest.x + rng.range(-jitter, jitter)
  const y = nest.y + rng.range(-jitter, jitter)
  const typeId = world.nestTypeId
  const behavior = behaviorForType(world, typeId)
  const ant = createAnt(world.nextId++, x, y, rng.angle(), behavior, age, typeId)
  world.ants.push(ant)
  return ant
}

function normalizeAngle(angle: number): number {
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI
}

function angleDifference(target: number, current: number): number {
  let diff = normalizeAngle(target) - normalizeAngle(current)
  if (diff > Math.PI) {
    diff -= TWO_PI
  }
  if (diff < -Math.PI) {
    diff += TWO_PI
  }
  return diff
}

export function senseAt(world: World, ant: Ant, offset: number): number {
  const { grid, pheromones } = world
  const { behavior } = ant
  const field = ant.carrying ? pheromones.home : pheromones.food
  const heading = ant.angle + offset
  const sx = ant.x + Math.cos(heading) * behavior.sensorDistance
  const sy = ant.y + Math.sin(heading) * behavior.sensorDistance
  const follow = sample(field, grid, sx, sy) * behavior.followStrength
  const attract = sample(pheromones.attract, grid, sx, sy) * behavior.attractStrength
  const repel = sample(pheromones.repel, grid, sx, sy) * behavior.repelStrength
  return follow + attract - repel
}

export function updateAnt(world: World, ant: Ant, dt: number): void {
  const { params, grid, walls, rng } = world
  const { behavior } = ant

  if (!ant.carrying) {
    const food = findFoodAt(world.foods, ant.x, ant.y, params.pickupRadius)
    if (food && food.amount > 0) {
      const taken = takeFood(food, 1)
      if (taken > 0) {
        ant.carrying = true
        ant.state = 'return'
        world.metrics.foodCollected += taken
        ant.angle = normalizeAngle(ant.angle + Math.PI)
      }
    }
  } else if (Math.hypot(world.nest.x - ant.x, world.nest.y - ant.y) <= params.nestRadius) {
    ant.carrying = false
    ant.state = 'wander'
    world.metrics.foodInNest += 1
    ant.angle = normalizeAngle(ant.angle + Math.PI)
  }

  const left = senseAt(world, ant, -behavior.sensorAngle)
  const center = senseAt(world, ant, 0)
  const right = senseAt(world, ant, behavior.sensorAngle)

  let turn: number
  if (left === 0 && center === 0 && right === 0) {
    turn = rng.range(-1, 1)
  } else if (left > center && left >= right) {
    turn = -1
  } else if (right > center && right > left) {
    turn = 1
  } else {
    turn = 0
  }

  ant.angle += turn * behavior.turnRate * dt
  ant.angle += rng.range(-1, 1) * behavior.wanderStrength * dt

  if (ant.carrying) {
    const toNest = Math.atan2(world.nest.y - ant.y, world.nest.x - ant.x)
    const diff = angleDifference(toNest, ant.angle)
    ant.angle += Math.max(-1, Math.min(1, diff)) * behavior.nestBias * behavior.turnRate * dt
  }

  const nx = ant.x + Math.cos(ant.angle) * behavior.speed * dt
  const ny = ant.y + Math.sin(ant.angle) * behavior.speed * dt

  if (isWallAt(walls, grid, nx, ny)) {
    ant.angle = normalizeAngle(ant.angle + HALF_PI + rng.range(-HALF_PI, HALF_PI))
  } else {
    ant.x = nx
    ant.y = ny
  }

  const field = ant.carrying ? world.pheromones.food : world.pheromones.home
  deposit(field, grid, ant.x, ant.y, behavior.pheromoneDeposit * dt)

  ant.age += dt
  ant.angle = normalizeAngle(ant.angle)
}
