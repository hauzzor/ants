import { emitAbilities, followTurnDelta, totalWalkSpeed, wanderTurnDelta } from './ability'
import { BLANK_TYPE, cloneAbilities, getAntType } from './antTypes'
import { findFoodAt, takeFood } from './food'
import { isWallAt } from './walls'
import type { Ability, Ant, AntType, World } from './types'

const TWO_PI = Math.PI * 2
const HALF_PI = Math.PI / 2

export function createAnt(
  id: number,
  x: number,
  y: number,
  angle: number,
  lifespan: number,
  abilities: Ability[],
  typeId = 'blank',
): Ant {
  return {
    id,
    x,
    y,
    angle,
    state: 'wander',
    carrying: false,
    age: 0,
    typeId,
    lifespan,
    abilities: cloneAbilities(abilities),
  }
}

function nestType(world: World): AntType {
  return getAntType(world, world.nestTypeId) ?? BLANK_TYPE
}

export function spawnAnt(world: World, x: number, y: number): Ant {
  const type = nestType(world)
  const ant = createAnt(
    world.nextId++,
    x,
    y,
    world.rng.angle(),
    type.lifespan,
    type.abilities,
    type.id,
  )
  world.ants.push(ant)
  return ant
}

export function spawnAntNearNest(world: World, age = 0): Ant {
  const { nest, rng, params } = world
  const jitter = params.nestRadius * 0.5
  const x = nest.x + rng.range(-jitter, jitter)
  const y = nest.y + rng.range(-jitter, jitter)
  const ant = spawnAnt(world, x, y)
  ant.age = age
  return ant
}

export function spawnAntWithType(world: World, type: AntType): Ant {
  const { nest, rng, params } = world
  const jitter = params.nestRadius * 0.5
  const x = nest.x + rng.range(-jitter, jitter)
  const y = nest.y + rng.range(-jitter, jitter)
  const ant = createAnt(
    world.nextId++,
    x,
    y,
    rng.angle(),
    type.lifespan,
    type.abilities,
    type.id,
  )
  world.ants.push(ant)
  return ant
}

function normalizeAngle(angle: number): number {
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI
}

export function updateAnt(world: World, ant: Ant, dt: number): void {
  const { params, grid, walls, rng } = world

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

  ant.angle += followTurnDelta(world, ant, dt) + wanderTurnDelta(ant.abilities, rng, dt)

  const speed = totalWalkSpeed(ant.abilities)
  if (speed > 0) {
    const nx = ant.x + Math.cos(ant.angle) * speed * dt
    const ny = ant.y + Math.sin(ant.angle) * speed * dt
    if (isWallAt(walls, grid, nx, ny)) {
      ant.angle = normalizeAngle(ant.angle + HALF_PI + rng.range(-HALF_PI, HALF_PI))
    } else {
      ant.x = nx
      ant.y = ny
    }
  }

  emitAbilities(world, ant, dt)

  ant.age += dt
  ant.angle = normalizeAngle(ant.angle)
}
