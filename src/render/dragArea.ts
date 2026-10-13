import type { DragArea } from './canvasRenderer'

export function normalizeDragArea(area: DragArea): {
  x: number
  y: number
  width: number
  height: number
} {
  const x = Math.min(area.x0, area.x1)
  const y = Math.min(area.y0, area.y1)
  const width = Math.abs(area.x1 - area.x0)
  const height = Math.abs(area.y1 - area.y0)
  return { x, y, width, height }
}
