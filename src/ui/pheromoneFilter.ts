import './editor.css'
import { PHEROMONE_KINDS } from '../sim'
import type { PheromoneKind } from '../sim'

export interface PheromoneFilterOptions {
  visible?: readonly PheromoneKind[]
}

export interface PheromoneFilterHandle {
  visible(): ReadonlySet<PheromoneKind>
  setVisible(kinds: readonly PheromoneKind[]): void
}

const PHEROMONE_LABELS: Record<PheromoneKind, string> = {
  home: 'Home trail',
  food: 'Food trail',
  attract: 'Attract',
  repel: 'Repel',
}

export function pheromoneToggleRow(kind: PheromoneKind, checked: boolean): string {
  const id = `pheromone-toggle-${kind}`
  return `<label class="pheromone-filter-row" for="${id}">
    <input type="checkbox" id="${id}" data-testid="${id}"${checked ? ' checked' : ''} />
    <i class="sw ${kind}"></i>
    <span class="pheromone-filter-label">${PHEROMONE_LABELS[kind]}</span>
  </label>`
}

export function nextVisible(
  current: ReadonlySet<PheromoneKind>,
  kind: PheromoneKind,
  on: boolean,
): Set<PheromoneKind> {
  const next = new Set(current)
  if (on) next.add(kind)
  else next.delete(kind)
  return next
}

export function createPheromoneFilter(
  root: HTMLElement,
  options?: PheromoneFilterOptions,
): PheromoneFilterHandle {
  let current = new Set<PheromoneKind>(options?.visible ?? PHEROMONE_KINDS)

  root.dataset.testid = 'pheromone-filter'
  root.classList.add('pheromone-filter')
  root.innerHTML = PHEROMONE_KINDS.map((kind) => pheromoneToggleRow(kind, current.has(kind))).join('')

  const inputs = new Map<PheromoneKind, HTMLInputElement>()
  for (const kind of PHEROMONE_KINDS) {
    const el = root.querySelector(`[data-testid="pheromone-toggle-${kind}"]`) as HTMLInputElement
    inputs.set(kind, el)
    el.addEventListener('change', () => {
      current = nextVisible(current, kind, el.checked)
    })
  }

  const syncChecks = (): void => {
    for (const kind of PHEROMONE_KINDS) {
      inputs.get(kind)!.checked = current.has(kind)
    }
  }

  return {
    visible(): ReadonlySet<PheromoneKind> {
      return current
    },
    setVisible(kinds: readonly PheromoneKind[]): void {
      current = new Set(kinds)
      syncChecks()
    },
  }
}
