export interface Metrics {
  foodCollected: number
  foodInNest: number
  elapsed: number
}

export function createMetrics(): Metrics {
  return { foodCollected: 0, foodInNest: 0, elapsed: 0 }
}

export function collectionRate(metrics: Metrics): number {
  return metrics.elapsed > 0 ? metrics.foodInNest / metrics.elapsed : 0
}
