import type { DragArea, Renderer } from '../render/canvasRenderer'
import { toolById } from './tools'
import type { ToolId } from './tools'

export interface PointerState {
  tool: ToolId
  brush: number
  pointer: { x: number; y: number } | null
  dragArea: DragArea | null
}

export interface PointerHandlers {
  apply(x: number, y: number): void
  applyRect(x0: number, y0: number, x1: number, y1: number): void
}

export function attachPointer(
  canvas: HTMLCanvasElement,
  renderer: Renderer,
  state: PointerState,
  handlers: PointerHandlers,
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
    if (toolById(state.tool).mode === 'rect') {
      state.dragArea = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }
    } else {
      handlers.apply(p.x, p.y)
    }
  }

  const onMove = (event: PointerEvent): void => {
    const p = toWorld(event)
    state.pointer = p
    if (!painting) {
      return
    }
    const mode = toolById(state.tool).mode
    if (mode === 'paint') {
      handlers.apply(p.x, p.y)
    } else if (mode === 'rect' && state.dragArea) {
      state.dragArea.x1 = p.x
      state.dragArea.y1 = p.y
    }
  }

  const onUp = (event: PointerEvent): void => {
    const area = state.dragArea
    painting = false
    if (toolById(state.tool).mode === 'rect' && area) {
      handlers.applyRect(area.x0, area.y0, area.x1, area.y1)
      state.dragArea = null
    }
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }

  const onCancel = (event: PointerEvent): void => {
    painting = false
    state.dragArea = null
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }

  const onLeave = (): void => {
    const wasPainting = painting
    painting = false
    state.pointer = null
    if (!wasPainting) {
      state.dragArea = null
    }
  }

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onCancel)
  canvas.addEventListener('pointerleave', onLeave)

  return () => {
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('pointercancel', onCancel)
    canvas.removeEventListener('pointerleave', onLeave)
  }
}
