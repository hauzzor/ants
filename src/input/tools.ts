export type ToolId =
  | 'food'
  | 'eraseFood'
  | 'attract'
  | 'repel'
  | 'erasePheromone'
  | 'wall'
  | 'eraseWall'
  | 'obstacle'
  | 'spawnAnt'
  | 'removeAnt'

export type ToolMode = 'point' | 'paint' | 'rect'

export interface ToolDef {
  id: ToolId
  label: string
  hint: string
  mode: ToolMode
}

export const TOOLS: readonly ToolDef[] = [
  { id: 'food', label: 'Food', hint: 'Click to drop a food pile', mode: 'point' },
  { id: 'eraseFood', label: 'Erase food', hint: 'Remove food piles', mode: 'point' },
  {
    id: 'attract',
    label: 'Attract',
    hint: 'Paint a trail ants are drawn to',
    mode: 'paint',
  },
  {
    id: 'repel',
    label: 'Repel',
    hint: 'Paint a trail ants avoid',
    mode: 'paint',
  },
  {
    id: 'erasePheromone',
    label: 'Clear trail',
    hint: 'Erase pheromone trails',
    mode: 'paint',
  },
  { id: 'wall', label: 'Wall', hint: 'Draw walls', mode: 'paint' },
  { id: 'eraseWall', label: 'Erase wall', hint: 'Remove walls and obstacles', mode: 'paint' },
  { id: 'obstacle', label: 'Obstacle', hint: 'Drag to draw a grey obstacle block', mode: 'rect' },
  { id: 'spawnAnt', label: 'Add ant', hint: 'Drop an ant', mode: 'point' },
  { id: 'removeAnt', label: 'Remove ant', hint: 'Remove nearby ants', mode: 'point' },
]

export function toolById(id: ToolId): ToolDef {
  const found = TOOLS.find((tool) => tool.id === id)
  if (!found) {
    throw new Error(`Unknown tool: ${id}`)
  }
  return found
}
