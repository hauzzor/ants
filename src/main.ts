import './style.css'
import {
  PHEROMONE_KINDS,
  createAntType,
  createWorld,
  deleteAntType,
  getAntTypes,
  placeObstacleRect,
  setAntCount,
  setNestType,
  spawnAntWithType,
  stepWorld,
  totalFood,
  updateAntType,
} from './sim'
import type { AntType, PheromoneKind } from './sim'
import { obstacleCount, wallCount } from './sim/walls'
import { createRenderer } from './render/canvasRenderer'
import type { DragArea } from './render/canvasRenderer'
import { attachPointer } from './input/pointer'
import { applyTool } from './input/actions'
import { toolById } from './input/tools'
import type { ToolId } from './input/tools'
import { createHud } from './ui/hud'
import { createPalette } from './ui/palette'
import { createSliders } from './ui/sliders'
import { createControls } from './ui/controls'
import { createAntPanel } from './ui/antPanel'
import { createPheromoneFilter } from './ui/pheromoneFilter'
import { loadTypeStore, saveTypeStore } from './ui/typeStore'

const FIXED_DT = 1 / 60
const MAX_STEPS_PER_FRAME = 240

function requireElement<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector)
  if (!el) {
    throw new Error(`Missing required element: ${selector}`)
  }
  return el
}

const canvas = requireElement<HTMLCanvasElement>('#arena')
const metricsEl = requireElement<HTMLElement>('#metrics')
const controlsEl = requireElement<HTMLElement>('#controls')
const paletteEl = requireElement<HTMLElement>('#palette')
const slidersEl = requireElement<HTMLElement>('#sliders')
const antPanelEl = requireElement<HTMLElement>('#ant-panel')
const pheromoneFilterEl = requireElement<HTMLElement>('#pheromone-filter')
const hintEl = requireElement<HTMLElement>('#hint')

interface GameState {
  paused: boolean
  speed: number
  tool: ToolId
  brush: number
  pointer: { x: number; y: number } | null
  dragArea: DragArea | null
  seed: number
}

const state: GameState = {
  paused: false,
  speed: 1,
  tool: 'attract',
  brush: 14,
  pointer: null,
  dragArea: null,
  seed: 1,
}

const storedTypes = loadTypeStore()
let world = createWorld(
  storedTypes
    ? { seed: 1, types: storedTypes.types, nestTypeId: storedTypes.nestTypeId }
    : { seed: 1 },
)

function persistTypes(): void {
  saveTypeStore({ types: world.types, nestTypeId: world.nestTypeId })
}

const renderer = createRenderer(canvas)
const hud = createHud(metricsEl)
const pheromoneFilter = createPheromoneFilter(pheromoneFilterEl)

createPalette(
  paletteEl,
  () => state.tool,
  (id) => {
    state.tool = id
    hintEl.textContent = toolById(id).hint
  },
)

const sliders = createSliders(slidersEl, {
  getWorld: () => world,
  getColony: () => world.ants.length,
  onColony: (value) => setAntCount(world, value),
  getSpeed: () => state.speed,
  onSpeed: (value) => {
    state.speed = value
  },
  getBrush: () => state.brush,
  onBrush: (value) => {
    state.brush = value
  },
})

const antPanel = createAntPanel(antPanelEl, {
  getWorld: () => world,
  onSelectType: (id) => {
    if (setNestType(world, id)) persistTypes()
  },
  onSaveType: (draft, id) => {
    const type =
      id === undefined
        ? createAntType(world, draft)
        : updateAntType(world, id, draft)
          ? world.types[id]
          : undefined
    if (type) persistTypes()
    return type
  },
  onDeleteType: (id) => {
    if (deleteAntType(world, id)) persistTypes()
  },
  onPreviewType: (draft) => {
    spawnAntWithType(world, {
      id: 'preview',
      name: draft.name,
      lifespan: draft.lifespan,
      abilities: draft.abilities,
    })
  },
})

function resetWorld(seed: number = state.seed): void {
  state.seed = seed
  world = createWorld({
    seed,
    params: world.params,
    types: world.types,
    nestTypeId: world.nestTypeId,
  })
  sliders.sync()
  antPanel.refresh()
}

const controls = createControls(controlsEl, {
  onTogglePlay: () => {
    state.paused = !state.paused
    controls.setPaused(state.paused)
  },
  onStep: () => {
    state.paused = true
    controls.setPaused(true)
    stepWorld(world, FIXED_DT)
  },
  onReset: () => resetWorld(),
  onNewSeed: () => resetWorld(Math.floor(Math.random() * 2 ** 31)),
})

attachPointer(canvas, renderer, state, {
  apply: (x, y) => {
    applyTool(world, state.tool, x, y, state.brush)
  },
  applyRect: (x0, y0, x1, y1) => {
    placeObstacleRect(world, x0, y0, x1, y1)
  },
})

hintEl.textContent = toolById(state.tool).hint

function onResize(): void {
  renderer.resize()
}
window.addEventListener('resize', onResize)
renderer.resize()

let last = performance.now()
let accumulator = 0

function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now

  if (state.paused) {
    accumulator = 0
  } else {
    accumulator += dt * state.speed
    let steps = 0
    while (accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      stepWorld(world, FIXED_DT)
      accumulator -= FIXED_DT
      steps++
    }
    if (accumulator > FIXED_DT) {
      accumulator = 0
    }
  }

  renderer.render(world, {
    tool: state.tool,
    brush: state.brush,
    pointer: state.pointer,
    visiblePheromones: pheromoneFilter.visible(),
    dragArea: state.dragArea,
  })
  hud.update(world)
  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)

declare global {
  interface Window {
    ants?: {
      snapshot(): { time: number; ants: number; collected: number; delivered: number }
      stats(): {
        foodSources: number
        foodTotal: number
        attract: number
        foodScent: number
        homePheromone: number
        walls: number
        obstacles: number
      }
      types(): AntType[]
      nestType(): string
      typeCounts(): Record<string, number>
      visiblePheromones(): PheromoneKind[]
      reset(seed?: number): void
    }
  }
}

window.ants = {
  snapshot: () => ({
    time: world.time,
    ants: world.ants.length,
    collected: world.metrics.foodCollected,
    delivered: world.metrics.foodInNest,
  }),
  stats: () => ({
    foodSources: world.foods.length,
    foodTotal: totalFood(world.foods),
    attract: world.pheromones.attract.reduce((sum, value) => sum + value, 0),
    foodScent: world.pheromones.food.reduce((sum, value) => sum + value, 0),
    homePheromone: world.pheromones.home.reduce((sum, value) => sum + value, 0),
    walls: wallCount(world.walls),
    obstacles: obstacleCount(world.walls),
  }),
  types: () => getAntTypes(world),
  nestType: () => world.nestTypeId,
  typeCounts: () => {
    const counts: Record<string, number> = {}
    for (const ant of world.ants) {
      counts[ant.typeId] = (counts[ant.typeId] ?? 0) + 1
    }
    return counts
  },
  visiblePheromones: () =>
    PHEROMONE_KINDS.filter((kind) => pheromoneFilter.visible().has(kind)),
  reset: (seed?: number) => {
    resetWorld(seed ?? state.seed)
  },
}

export {}
