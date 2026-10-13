import {
  paintPheromone,
  erasePheromone,
  placeFood,
  removeFoodAt,
  drawWall,
  spawnAntAt,
  removeAntAt,
} from '../sim'
import type { World } from '../sim'
import type { ToolId } from './tools'

const PAINT_AMOUNT = 6

export function applyTool(
  world: World,
  tool: ToolId,
  x: number,
  y: number,
  brush: number,
): void {
  switch (tool) {
    case 'food':
      placeFood(world, x, y)
      break
    case 'eraseFood':
      removeFoodAt(world, x, y, brush)
      break
    case 'attract':
      paintPheromone(world, 'attract', x, y, brush, PAINT_AMOUNT)
      break
    case 'repel':
      paintPheromone(world, 'repel', x, y, brush, PAINT_AMOUNT)
      break
    case 'erasePheromone':
      erasePheromone(world, x, y, brush)
      break
    case 'wall':
      drawWall(world, x, y, brush, 1)
      break
    case 'eraseWall':
      drawWall(world, x, y, brush, 0)
      break
    case 'obstacle':
      break
    case 'spawnAnt':
      spawnAntAt(world, x, y)
      break
    case 'removeAnt':
      removeAntAt(world, x, y, brush)
      break
  }
}
