import { test, expect } from '@playwright/test'

type MazeAnts = {
  maze(): boolean
  stats(): { obstacles: number; walls: number }
  reset(seed?: number): void
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('maze is enabled by default and reports obstacles and walls', async ({ page }) => {
  const control = page.getByTestId('control-maze')
  await expect(control).toHaveClass(/active/)

  const stats = await page.evaluate(() => {
    const ants = window.ants as unknown as MazeAnts
    return { maze: ants.maze(), stats: ants.stats() }
  })

  expect(stats.maze).toBe(true)
  expect(stats.stats.obstacles).toBeGreaterThan(0)
  expect(stats.stats.walls).toBeGreaterThan(196)
})

test('toggling maze off leaves only border walls', async ({ page }) => {
  const before = await page.evaluate(() => (window.ants as unknown as MazeAnts).stats())
  expect(before.obstacles).toBeGreaterThan(0)
  expect(before.walls).toBeGreaterThan(196)

  await page.getByTestId('control-maze').click()

  const after = await page.evaluate(() => {
    const ants = window.ants as unknown as MazeAnts
    return { maze: ants.maze(), stats: ants.stats() }
  })

  await expect(page.getByTestId('control-maze')).not.toHaveClass(/active/)
  expect(after.maze).toBe(false)
  expect(after.stats.walls).toBe(196)
  expect(after.stats.obstacles).toBe(0)
})

test('toggling maze on again rebuilds the same maze from the same seed', async ({ page }) => {
  const before = await page.evaluate(() => (window.ants as unknown as MazeAnts).stats())
  expect(before.walls).toBeGreaterThan(196)

  await page.getByTestId('control-maze').click()
  await page.getByTestId('control-maze').click()

  const after = await page.evaluate(() => {
    const ants = window.ants as unknown as MazeAnts
    return { maze: ants.maze(), stats: ants.stats() }
  })

  await expect(page.getByTestId('control-maze')).toHaveClass(/active/)
  expect(after.maze).toBe(true)
  expect(after.stats.walls).toBe(before.walls)
  expect(after.stats.obstacles).toBe(before.obstacles)
})

test('reset with the same seed produces deterministic maze stats', async ({ page }) => {
  const first = await page.evaluate(() => {
    const ants = window.ants as unknown as MazeAnts
    ants.reset(1)
    return ants.stats()
  })
  expect(first.obstacles).toBeGreaterThan(0)
  expect(first.walls).toBeGreaterThan(196)

  const second = await page.evaluate(() => {
    const ants = window.ants as unknown as MazeAnts
    ants.reset(1)
    return ants.stats()
  })

  expect(second.walls).toBe(first.walls)
  expect(second.obstacles).toBe(first.obstacles)
})
