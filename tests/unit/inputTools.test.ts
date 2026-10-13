import { describe, it, expect } from 'vitest'
import { TOOLS, toolById } from '../../src/input/tools'
import type { ToolDef, ToolId } from '../../src/input/tools'

const VALID_MODES = ['point', 'paint', 'rect'] as const

const EXPECTED_IDS: readonly ToolId[] = [
  'food',
  'eraseFood',
  'attract',
  'repel',
  'erasePheromone',
  'wall',
  'eraseWall',
  'obstacle',
  'spawnAnt',
  'removeAnt',
]

const UNCHANGED_HINTS: ReadonlyArray<{ id: ToolId; hint: string }> = [
  { id: 'food', hint: 'Click to drop a food pile' },
  { id: 'eraseFood', hint: 'Remove food piles' },
  { id: 'attract', hint: 'Paint a trail ants are drawn to' },
  { id: 'repel', hint: 'Paint a trail ants avoid' },
  { id: 'erasePheromone', hint: 'Erase pheromone trails' },
  { id: 'wall', hint: 'Draw walls' },
  { id: 'eraseWall', hint: 'Remove walls and obstacles' },
  { id: 'spawnAnt', hint: 'Drop an ant' },
  { id: 'removeAnt', hint: 'Remove nearby ants' },
]

describe('input TOOLS', () => {
  it('has unique ids', () => {
    const ids = TOOLS.map((tool) => tool.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('lists exactly the expected ids in order', () => {
    expect(TOOLS.map((tool) => tool.id)).toEqual(EXPECTED_IDS)
  })

  it('assigns every entry a valid mode', () => {
    for (const tool of TOOLS) {
      expect(VALID_MODES).toContain(tool.mode)
    }
  })

  it('contains exactly one rect tool: obstacle', () => {
    const rectTools = TOOLS.filter((tool) => tool.mode === 'rect')
    expect(rectTools).toHaveLength(1)
    const rectTool = rectTools[0]!
    expect(rectTool.id).toBe('obstacle')
    expect(rectTool.label).toBe('Obstacle')
    expect(rectTool.hint).toBe('Drag to draw a grey obstacle block')
  })

  it('keeps point tools for the discrete actions', () => {
    const pointIds = TOOLS.filter((tool) => tool.mode === 'point').map((tool) => tool.id)
    expect(pointIds).toEqual(['food', 'eraseFood', 'spawnAnt', 'removeAnt'])
  })

  it('keeps paint tools for the continuous brushes', () => {
    const paintIds = TOOLS.filter((tool) => tool.mode === 'paint').map((tool) => tool.id)
    expect(paintIds).toEqual(['attract', 'repel', 'erasePheromone', 'wall', 'eraseWall'])
  })

  it('leaves existing ids and hints unchanged', () => {
    for (const { id, hint } of UNCHANGED_HINTS) {
      const tool: ToolDef = toolById(id)
      expect(tool.hint).toBe(hint)
    }
  })

  it('throws for an unknown id', () => {
    expect(() => toolById('nope' as ToolId)).toThrow()
  })
})
