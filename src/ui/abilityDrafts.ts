import type { Ability, AntTypeDraft } from '../sim/types'

export type AbilityKind = 'walk' | 'wander' | 'emit' | 'follow'

export const ABILITY_KINDS: readonly AbilityKind[] = ['walk', 'wander', 'emit', 'follow']

export const ABILITY_KIND_LABELS: Record<AbilityKind, string> = {
  walk: 'Walk',
  wander: 'Wander',
  emit: 'Emit pheromone',
  follow: 'Follow pheromone',
}

export const ABILITY_KIND_DESCRIPTIONS: Record<AbilityKind, string> = {
  walk: 'Move forward at a constant speed.',
  wander: 'Add random jitter to the heading.',
  emit: 'Deposit a pheromone trail while moving.',
  follow: 'Sense a pheromone trail and steer along or away from it.',
}

export const PHEROMONE_OPTIONS = ['home', 'food', 'attract', 'repel'] as const
export const DIRECTION_OPTIONS = ['toward', 'away'] as const
export const CONDITION_OPTIONS = ['always', 'carrying', 'empty'] as const

export const FIELD_DESCRIPTIONS: Record<string, string> = {
  speed: 'Forward speed in cells per second.',
  strength: 'How much the heading jitters each step.',
  intensity: 'Pheromone deposited per step.',
  sensorAngle: 'Angle of the side sensors, in radians.',
  sensorDistance: 'How far ahead sensors sample, in cells.',
  turnRate: 'Maximum turn per step toward the sensed trail.',
  pheromone: 'Which trail this ability reads or writes.',
  direction: 'Steer toward the strongest scent, or away from it.',
  condition: 'When this ability applies, based on whether the ant carries food.',
}

export const SELECT_FIELD_LABELS: Record<string, string> = {
  pheromone: 'Pheromone',
  direction: 'Direction',
  condition: 'Condition',
}

export const OPTION_LABELS: Record<string, string> = {
  ...ABILITY_KIND_LABELS,
  home: 'home trail',
  food: 'food trail',
  attract: 'attract',
  repel: 'repel',
  toward: 'toward scent',
  away: 'away from scent',
  always: 'always',
  carrying: 'while carrying food',
  empty: 'when empty-handed',
}

export const IDENTITY_DESCRIPTIONS = {
  name: 'Display name for this ant type.',
  lifespan: 'How long an ant lives, in seconds.',
  editType: 'Pick a type to edit, or start a new one.',
  nestSpawns: 'Nest spawns this type',
} as const

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
