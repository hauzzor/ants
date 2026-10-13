import type { World } from '../sim'
import type { SimParams } from '../sim'

interface SimSlider {
  key: keyof SimParams
  label: string
  min: number
  max: number
  step: number
}

const SIM_SLIDERS: readonly SimSlider[] = [
  { key: 'antSpeed', label: 'Speed', min: 0, max: 80, step: 1 },
  { key: 'antTurnRate', label: 'Turn rate', min: 0, max: 10, step: 0.1 },
  { key: 'antLifespan', label: 'Lifespan', min: 0, max: 180, step: 1 },
  { key: 'spawnInterval', label: 'Spawn interval', min: 0, max: 5, step: 0.1 },
  { key: 'sensorAngle', label: 'Sensor angle', min: 0, max: 2, step: 0.05 },
  { key: 'sensorDistance', label: 'Sensor dist', min: 0, max: 20, step: 0.5 },
  { key: 'wanderStrength', label: 'Wander', min: 0, max: 5, step: 0.1 },
  { key: 'pheromoneDeposit', label: 'Deposit', min: 0, max: 30, step: 0.5 },
  { key: 'foodScentRate', label: 'Food scent', min: 0, max: 30, step: 0.5 },
  { key: 'pheromoneDecay', label: 'Decay', min: 0, max: 1, step: 0.01 },
  { key: 'pheromoneDiffusion', label: 'Diffusion', min: 0, max: 1, step: 0.01 },
  { key: 'followStrength', label: 'Follow', min: 0, max: 8, step: 0.1 },
  { key: 'attractStrength', label: 'Attract', min: 0, max: 8, step: 0.1 },
  { key: 'repelStrength', label: 'Repel', min: 0, max: 8, step: 0.1 },
  { key: 'nestBias', label: 'Nest bias', min: 0, max: 3, step: 0.05 },
]

export interface SliderDeps {
  getWorld(): World
  getColony(): number
  onColony(value: number): void
  getSpeed(): number
  onSpeed(value: number): void
  getBrush(): number
  onBrush(value: number): void
}

export interface SlidersHandle {
  sync(): void
}

function sliderRow(
  testid: string,
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
): string {
  return `<label class="slider">
    <span class="slider-label">${label}<span class="slider-value" data-sv="${testid}">${value}</span></span>
    <input type="range" data-testid="${testid}" min="${min}" max="${max}" step="${step}" value="${value}" />
  </label>`
}

export function createSliders(root: HTMLElement, deps: SliderDeps): SlidersHandle {
  const specials = [
    sliderRow('slider-colony', 'Colony size', 0, 200, 1, deps.getColony()),
    sliderRow('slider-speed', 'Sim speed', 0.25, 4, 0.25, deps.getSpeed()),
    sliderRow('slider-brush', 'Brush', 2, 30, 1, deps.getBrush()),
  ]

  const sim = SIM_SLIDERS.map((s) =>
    sliderRow(
      `slider-${s.key}`,
      s.label,
      s.min,
      s.max,
      s.step,
      deps.getWorld().params[s.key],
    ),
  )

  root.innerHTML = `<div class="slider-group">${sim.join('')}</div>
    <div class="slider-group">${specials.join('')}</div>`

  const input = (testid: string): HTMLInputElement =>
    root.querySelector(`[data-testid="${testid}"]`) as HTMLInputElement
  const valueLabel = (testid: string): HTMLElement =>
    root.querySelector(`[data-sv="${testid}"]`) as HTMLElement

  for (const s of SIM_SLIDERS) {
    const testid = `slider-${s.key}`
    const el = input(testid)
    el.addEventListener('input', () => {
      const value = Number(el.value)
      deps.getWorld().params[s.key] = value
      valueLabel(testid).textContent = String(value)
    })
  }

  const colony = input('slider-colony')
  colony.addEventListener('input', () => {
    const value = Number(colony.value)
    deps.onColony(value)
    valueLabel('slider-colony').textContent = String(value)
  })

  const speed = input('slider-speed')
  speed.addEventListener('input', () => {
    const value = Number(speed.value)
    deps.onSpeed(value)
    valueLabel('slider-speed').textContent = String(value)
  })

  const brush = input('slider-brush')
  brush.addEventListener('input', () => {
    const value = Number(brush.value)
    deps.onBrush(value)
    valueLabel('slider-brush').textContent = String(value)
  })

  return {
    sync(): void {
      const world = deps.getWorld()
      for (const s of SIM_SLIDERS) {
        const testid = `slider-${s.key}`
        const value = world.params[s.key]
        input(testid).value = String(value)
        valueLabel(testid).textContent = String(value)
      }
      colony.value = String(deps.getColony())
      valueLabel('slider-colony').textContent = String(deps.getColony())
      speed.value = String(deps.getSpeed())
      valueLabel('slider-speed').textContent = String(deps.getSpeed())
      brush.value = String(deps.getBrush())
      valueLabel('slider-brush').textContent = String(deps.getBrush())
    },
  }
}
