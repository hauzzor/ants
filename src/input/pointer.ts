import type { Renderer } from '../render/canvasRenderer'
import { toolById } from './tools'
import type { ToolId } from './tools'

export interface PointerState {
  tool: ToolId
  brush: number
  pointer: { x: number; y: number } | null
}

export function attachPointer(
  canvas: HTMLCanvasElement,
  renderer: Renderer,
  state: PointerState,
  apply: (x: number, y: number) => void,
): () => void {
  let painting = false

  const toWorld = (event: PointerEvent): { x: number; y: number } =>
    renderer.worldFromScreen(event.clientX, event.clientY)

  const onDown = (event: PointerEvent): void => {
    event.preventDefault()
    painting = true
    canvas.setPointerCapture(event.pointerId)
    const p = toWorld(event)
    state.pointer = p
    apply(p.x, p.y)
  }

  const onMove = (event: PointerEvent): void => {
    const p = toWorld(event)
    state.pointer = p
    if (painting && toolById(state.tool).continuous) {
      apply(p.x, p.y)
    }
  }

  const onUp = (event: PointerEvent): void => {
    painting = false
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }

  const onLeave = (): void => {
    painting = false
    state.pointer = null
  }

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  canvas.addEventListener('pointerleave', onLeave)

  return () => {
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('pointercancel', onUp)
    canvas.removeEventListener('pointerleave', onLeave)
  }
}
