import { describe, it, expect } from 'vitest'
import { normalizeDragArea } from '../../src/render/dragArea'
import type { DragArea } from '../../src/render/canvasRenderer'

describe('normalizeDragArea', () => {
  it('leaves an already-normalized area intact', () => {
    const area: DragArea = { x0: 2, y0: 3, x1: 7, y1: 9 }
    expect(normalizeDragArea(area)).toEqual({ x: 2, y: 3, width: 5, height: 6 })
  })

  it('sorts swapped corners', () => {
    const area: DragArea = { x0: 7, y0: 9, x1: 2, y1: 3 }
    expect(normalizeDragArea(area)).toEqual({ x: 2, y: 3, width: 5, height: 6 })
  })

  it('sorts mixed-order corners', () => {
    const area: DragArea = { x0: 7, y0: 3, x1: 2, y1: 9 }
    expect(normalizeDragArea(area)).toEqual({ x: 2, y: 3, width: 5, height: 6 })
  })

  it('handles negative coordinates', () => {
    const area: DragArea = { x0: -5, y0: -2, x1: -1, y1: 4 }
    expect(normalizeDragArea(area)).toEqual({ x: -5, y: -2, width: 4, height: 6 })
  })

  it('yields a zero-size rect for a click without movement', () => {
    const area: DragArea = { x0: 4, y0: 4, x1: 4, y1: 4 }
    expect(normalizeDragArea(area)).toEqual({ x: 4, y: 4, width: 0, height: 0 })
  })

  it('clamps width and height to zero for equal corners in any order', () => {
    const area: DragArea = { x0: 9, y0: 1, x1: 9, y1: 1 }
    expect(normalizeDragArea(area)).toEqual({ x: 9, y: 1, width: 0, height: 0 })
  })

  it('never returns negative dimensions', () => {
    const area: DragArea = { x0: 1, y0: 1, x1: 1, y1: 1 }
    const rect = normalizeDragArea(area)
    expect(rect.width).toBeGreaterThanOrEqual(0)
    expect(rect.height).toBeGreaterThanOrEqual(0)
  })

  it('does not mutate the input area', () => {
    const area: DragArea = { x0: 7, y0: 9, x1: 2, y1: 3 }
    const snapshot = { ...area }
    normalizeDragArea(area)
    expect(area).toEqual(snapshot)
  })
})
