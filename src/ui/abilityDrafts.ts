import type { Ability, AntTypeDraft } from '../sim/types'

export type AbilityKind = 'walk' | 'wander' | 'emit' | 'follow'

export const ABILITY_KINDS: readonly AbilityKind[] = ['walk', 'wander', 'emit', 'follow']

export const DEFAULT_ABILITY_NUMBER_RANGES = {
  speed: { min: 0, max: 80, step: 1 },
  strength: { min: 0, max: 10, step: 0.1 },
  intensity: { min: 0, max: 40, step: 0.5 },
  sensorAngle: { min: 0, max: 2, step: 0.05 },
  sensorDistance: { min: 0, max: 24, step: 0.5 },
  turnRate: { min: 0, max: 12, step: 0.1 },
} as const

type AbilitySpec = {
  kind: AbilityKind
  fields: {
    name: string
    key: string
    min: number
    max: number
    step: number
  }[]
}

export const ABILITY_SPECS: Readonly<Record<AbilityKind, AbilitySpec['fields']>> = {
  walk: [{ name: 'Speed', key: 'speed', min: 0, max: 80, step: 1 }],
  wander: [{ name: 'Strength', key: 'strength', min: 0, max: 10, step: 0.1 }],
  emit: [
    { name: 'Intensity', key: 'intensity', min: 0, max: 40, step: 0.5 },
  ],
  follow: [
    { name: 'Sensor angle', key: 'sensorAngle', min: 0, max: 2, step: 0.05 },
    { name: 'Sensor dist', key: 'sensorDistance', min: 0, max: 24, step: 0.5 },
    { name: 'Turn rate', key: 'turnRate', min: 0, max: 12, step: 0.1 },
  ],
}

export function newAbility(kind: AbilityKind): Ability {
  switch (kind) {
    case 'walk':
      return { kind: 'walk', speed: 26 }
    case 'wander':
      return { kind: 'wander', strength: 1.2 }
    case 'emit':
      return { kind: 'emit', pheromone: 'home', intensity: 8, condition: 'empty' }
    case 'follow':
      return {
        kind: 'follow',
        pheromone: 'food',
        direction: 'toward',
        sensorAngle: 0.6,
        sensorDistance: 6,
        turnRate: 4,
        condition: 'empty',
      }
  }
}

export function duplicateAbility(ability: Ability): Ability {
  return structuredClone(ability)
}

export function freshDraft(
  base: { name: string; lifespan: number; abilities: Ability[] },
): AntTypeDraft {
  return {
    name: base.name,
    lifespan: base.lifespan,
    abilities: base.abilities.map(duplicateAbility),
  }
}
