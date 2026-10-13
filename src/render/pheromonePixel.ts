import type { PheromoneKind } from '../sim'

export interface PheromoneValues {
  home: number
  food: number
  attract: number
  repel: number
}

export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

function normalize(value: number): number {
  return value / (value + 3)
}

export function pheromonePixel(
  values: PheromoneValues,
  visible: ReadonlySet<PheromoneKind>,
): Rgba {
  const nh = visible.has('home') ? normalize(values.home) : 0
  const nf = visible.has('food') ? normalize(values.food) : 0
  const na = visible.has('attract') ? normalize(values.attract) : 0
  const nr = visible.has('repel') ? normalize(values.repel) : 0

  return {
    r: Math.min(255, (nf * 0.25 + na + nr + nh * 0.15) * 255),
    g: Math.min(255, (nf * 0.9 + nh * 0.5 + nr * 0.55 + na * 0.3) * 255),
    b: Math.min(255, (nh + na * 0.85 + nf * 0.15) * 255),
    a: Math.min(235, (nh + nf + na + nr) * 190),
  }
}
