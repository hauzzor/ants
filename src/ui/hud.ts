import { collectionRate } from '../sim'
import type { World } from '../sim'

export interface HudHandle {
  update(world: World): void
}

function metric(testid: string, label: string): string {
  return `<div class="metric"><span class="metric-value" data-testid="${testid}">0</span><span class="metric-label">${label}</span></div>`
}

export function createHud(root: HTMLElement): HudHandle {
  root.innerHTML = [
    metric('metric-collected', 'collected'),
    metric('metric-delivered', 'in nest'),
    metric('metric-ants', 'ants'),
    metric('metric-time', 'time'),
    metric('metric-rate', 'per sec'),
  ].join('')

  const collected = root.querySelector(`[data-testid="metric-collected"]`) as HTMLElement
  const delivered = root.querySelector(`[data-testid="metric-delivered"]`) as HTMLElement
  const ants = root.querySelector(`[data-testid="metric-ants"]`) as HTMLElement
  const time = root.querySelector(`[data-testid="metric-time"]`) as HTMLElement
  const rate = root.querySelector(`[data-testid="metric-rate"]`) as HTMLElement

  return {
    update(world: World): void {
      collected.textContent = String(world.metrics.foodCollected)
      delivered.textContent = String(world.metrics.foodInNest)
      ants.textContent = String(world.ants.length)
      time.textContent = `${world.metrics.elapsed.toFixed(0)}s`
      rate.textContent = collectionRate(world.metrics).toFixed(2)
    },
  }
}
