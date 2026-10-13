import type { PheromoneKind, World } from '../sim'
import { COLORS, antColor } from './colors'
import { pheromonePixel } from './pheromonePixel'
import { wallColor } from './wallColor'

export interface UiRenderState {
  tool: string
  brush: number
  pointer: { x: number; y: number } | null
  visiblePheromones: ReadonlySet<PheromoneKind>
}

export interface Renderer {
  resize(): void
  render(world: World, ui: UiRenderState): void
  worldFromScreen(clientX: number, clientY: number): { x: number; y: number }
}

export function createRenderer(canvas: HTMLCanvasElement): Renderer {
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('2D canvas context is unavailable')
  }
  const ctx: CanvasRenderingContext2D = context

  const offscreen = document.createElement('canvas')
  const offContext = offscreen.getContext('2d')
  if (!offContext) {
    throw new Error('2D offscreen context is unavailable')
  }
  const off = offContext

  let dpr = 1
  let scale = 1
  let offsetX = 0
  let offsetY = 0
  let imageData: ImageData | null = null

  function resize(): void {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    const width = Math.max(1, Math.floor(rect.width))
    const height = Math.max(1, Math.floor(rect.height))
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
  }

  function layout(world: World): void {
    const width = canvas.width / dpr
    const height = canvas.height / dpr
    scale = Math.min(width / world.width, height / world.height)
    offsetX = (width - world.width * scale) / 2
    offsetY = (height - world.height * scale) / 2
  }

  function ensureImageData(world: World): ImageData {
    const { cols, rows } = world.grid
    if (offscreen.width !== cols || offscreen.height !== rows) {
      offscreen.width = cols
      offscreen.height = rows
      imageData = null
    }
    if (!imageData) {
      imageData = off.createImageData(cols, rows)
    }
    return imageData
  }

  function drawPheromones(world: World, visible: ReadonlySet<PheromoneKind>): void {
    if (visible.size === 0) {
      return
    }
    const data = ensureImageData(world)
    const { cols, rows } = world.grid
    const pixels = data.data
    const { home, food, attract, repel } = world.pheromones

    for (let i = 0; i < cols * rows; i++) {
      const pixel = pheromonePixel(
        {
          home: home[i] ?? 0,
          food: food[i] ?? 0,
          attract: attract[i] ?? 0,
          repel: repel[i] ?? 0,
        },
        visible,
      )

      const o = i * 4
      pixels[o] = pixel.r
      pixels[o + 1] = pixel.g
      pixels[o + 2] = pixel.b
      pixels[o + 3] = pixel.a
    }

    off.putImageData(data, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(offscreen, 0, 0, world.width, world.height)
  }

  function drawWalls(world: World): void {
    const { cols, rows, cellSize } = world.grid
    let current: string | null = null
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const color = wallColor(world.walls[row * cols + col] ?? 0)
        if (color === null) {
          continue
        }
        if (color !== current) {
          ctx.fillStyle = color
          current = color
        }
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize)
      }
    }
  }

  function drawNest(world: World): void {
    ctx.fillStyle = COLORS.nest
    ctx.beginPath()
    ctx.arc(world.nest.x, world.nest.y, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = COLORS.nestCore
    ctx.beginPath()
    ctx.arc(world.nest.x, world.nest.y, 3, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawFood(world: World): void {
    for (const food of world.foods) {
      const radius = 2 + Math.sqrt(food.amount) * 0.7
      ctx.fillStyle = COLORS.food
      ctx.beginPath()
      ctx.arc(food.x, food.y, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = 0.8
      ctx.strokeStyle = COLORS.foodEdge
      ctx.stroke()
    }
  }

  function drawAnts(world: World): void {
    for (const ant of world.ants) {
      ctx.save()
      ctx.translate(ant.x, ant.y)
      ctx.rotate(ant.angle)
      ctx.fillStyle = ant.carrying ? COLORS.antCarry : antColor(ant.typeId)
      ctx.beginPath()
      ctx.moveTo(1.7, 0)
      ctx.lineTo(-1.2, 1.1)
      ctx.lineTo(-1.2, -1.1)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
  }

  function drawBrush(ui: UiRenderState): void {
    if (!ui.pointer) {
      return
    }
    ctx.lineWidth = 1.5
    ctx.strokeStyle = COLORS.brush
    ctx.fillStyle = COLORS.brushFill
    ctx.beginPath()
    ctx.arc(ui.pointer.x, ui.pointer.y, ui.brush, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  return {
    resize,

    render(world: World, ui: UiRenderState): void {
      layout(world)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = COLORS.background
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr)

      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offsetX * dpr, offsetY * dpr)

      ctx.fillStyle = COLORS.arenaBackground
      ctx.fillRect(0, 0, world.width, world.height)

      drawPheromones(world, ui.visiblePheromones)
      drawWalls(world)
      drawFood(world)
      drawNest(world)
      drawAnts(world)
      drawBrush(ui)

      ctx.strokeStyle = COLORS.arenaBorder
      ctx.lineWidth = 1 / scale
      ctx.strokeRect(0, 0, world.width, world.height)
    },

    worldFromScreen(clientX: number, clientY: number): { x: number; y: number } {
      const rect = canvas.getBoundingClientRect()
      return {
        x: (clientX - rect.left - offsetX) / scale,
        y: (clientY - rect.top - offsetY) / scale,
      }
    },
  }
}
