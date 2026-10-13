import './editor.css'
import type { World } from '../sim'
import { SIM_SLIDERS, SPECIAL_SLIDERS, type SimSliderMeta, type SpecialSliderKey, type SpecialSliderMeta } from './sliderMeta'

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

export function sliderRow(meta: SimSliderMeta | SpecialSliderMeta, value: number): string {
  const id = `slider-${meta.key}`
  const descId = `slider-desc-${meta.key}`
  return `<div class="slider">
    <label class="slider-label" for="${id}">${meta.label}<span class="slider-value" data-sv="${id}">${value}</span></label>
    <input type="range" id="${id}" data-testid="${id}" aria-describedby="${descId}" min="${meta.min}" max="${meta.max}" step="${meta.step}" value="${value}" />
    <span class="slider-desc" id="${descId}" data-testid="${descId}">${meta.description}</span>
  </div>`
}

export function createSliders(root: HTMLElement, deps: SliderDeps): SlidersHandle {
  const specialHandlers: Record<SpecialSliderKey, { get(): number; set(value: number): void }> = {
    colony: { get: deps.getColony, set: deps.onColony },
    speed: { get: deps.getSpeed, set: deps.onSpeed },
    brush: { get: deps.getBrush, set: deps.onBrush },
  }

  const specials = SPECIAL_SLIDERS.map((s) => sliderRow(s, specialHandlers[s.key].get()))
  const sim = SIM_SLIDERS.map((s) => sliderRow(s, deps.getWorld().params[s.key]))

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

  for (const s of SPECIAL_SLIDERS) {
    const testid = `slider-${s.key}`
    const handler = specialHandlers[s.key]
    const el = input(testid)
    el.addEventListener('input', () => {
      const value = Number(el.value)
      handler.set(value)
      valueLabel(testid).textContent = String(value)
    })
  }

  return {
    sync(): void {
      const world = deps.getWorld()
      for (const s of SIM_SLIDERS) {
        const testid = `slider-${s.key}`
        const value = world.params[s.key]
        input(testid).value = String(value)
        valueLabel(testid).textContent = String(value)
      }
      for (const s of SPECIAL_SLIDERS) {
        const testid = `slider-${s.key}`
        const value = specialHandlers[s.key].get()
        input(testid).value = String(value)
        valueLabel(testid).textContent = String(value)
      }
    },
  }
}
