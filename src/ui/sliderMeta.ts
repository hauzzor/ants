import type { SimParams } from '../sim'

export interface SliderMeta {
  key: string
  label: string
  description: string
  min: number
  max: number
  step: number
}

export interface SimSliderMeta extends Omit<SliderMeta, 'key'> {
  key: keyof SimParams
}

export type SpecialSliderKey = 'colony' | 'speed' | 'brush'

export interface SpecialSliderMeta extends SliderMeta {
  key: SpecialSliderKey
}

export const SIM_SLIDERS: readonly SimSliderMeta[] = [
  {
    key: 'spawnInterval',
    label: 'Spawn interval',
    description: 'Seconds between automatic ant spawns at the nest. 0 disables auto-spawn.',
    min: 0,
    max: 5,
    step: 0.1,
  },
  {
    key: 'pheromoneDecay',
    label: 'Decay',
    description: 'Fraction of pheromone that fades each step. Higher fades faster.',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: 'pheromoneDiffusion',
    label: 'Diffusion',
    description: 'How much pheromone spreads into neighboring cells.',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: 'foodScentRate',
    label: 'Food scent',
    description: 'Scent emitted by each food source per step to guide foragers.',
    min: 0,
    max: 30,
    step: 0.5,
  },
  {
    key: 'pheromoneDetectThreshold',
    label: 'Detect threshold',
    description: 'Pheromone strength below this is ignored by ant sensors.',
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    key: 'homeScentRate',
    label: 'Home scent',
    description: 'Home pheromone emitted by the nest per step.',
    min: 0,
    max: 30,
    step: 0.5,
  },
]

export const SPECIAL_SLIDERS: readonly SpecialSliderMeta[] = [
  {
    key: 'colony',
    label: 'Colony size',
    description: 'Target number of ants; adjusting adds or removes ants.',
    min: 0,
    max: 200,
    step: 1,
  },
  {
    key: 'speed',
    label: 'Sim speed',
    description: 'Simulation speed multiplier.',
    min: 0.25,
    max: 4,
    step: 0.25,
  },
  {
    key: 'brush',
    label: 'Brush',
    description: 'Tool brush radius, in cells.',
    min: 2,
    max: 30,
    step: 1,
  },
]
