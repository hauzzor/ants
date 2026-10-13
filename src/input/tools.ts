export type ToolId =
  | 'food'
  | 'eraseFood'
  | 'attract'
  | 'repel'
  | 'erasePheromone'
  | 'wall'
  | 'eraseWall'
  | 'spawnAnt'
  | 'removeAnt'

export interface ToolDef {
  id: ToolId
  label: string
  hint: string
  continuous: boolean
}

export const TOOLS: readonly ToolDef[] = [
  { id: 'food', label: 'Food', hint: 'Click to drop a food pile', continuous: false },
  { id: 'eraseFood', label: 'Erase food', hint: 'Remove food piles', continuous: false },
  {
    id: 'attract',
    label: 'Attract',
    hint: 'Paint a trail ants are drawn to',
    continuous: true,
  },
  {
    id: 'repel',
    label: 'Repel',
    hint: 'Paint a trail ants avoid',
    continuous: true,
  },
  {
    id: 'erasePheromone',
    label: 'Clear trail',
    hint: 'Erase pheromone trails',
    continuous: true,
  },
  { id: 'wall', label: 'Wall', hint: 'Draw obstacles', continuous: true },
  { id: 'eraseWall', label: 'Erase wall', hint: 'Remove obstacles', continuous: true },
  { id: 'spawnAnt', label: 'Add ant', hint: 'Drop an ant', continuous: false },
  { id: 'removeAnt', label: 'Remove ant', hint: 'Remove nearby ants', continuous: false },
]

export function toolById(id: ToolId): ToolDef {
  const found = TOOLS.find((tool) => tool.id === id)
  if (!found) {
    throw new Error(`Unknown tool: ${id}`)
  }
  return found
}
