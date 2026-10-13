import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('defaults: all pheromone toggles are visible and checked', async ({ page }) => {
  const home = page.getByTestId('pheromone-toggle-home')
  const food = page.getByTestId('pheromone-toggle-food')
  const attract = page.getByTestId('pheromone-toggle-attract')
  const repel = page.getByTestId('pheromone-toggle-repel')

  await expect(home).toBeVisible()
  await expect(food).toBeVisible()
  await expect(attract).toBeVisible()
  await expect(repel).toBeVisible()

  await expect(home).toBeChecked()
  await expect(food).toBeChecked()
  await expect(attract).toBeChecked()
  await expect(repel).toBeChecked()

  const visible = await page.evaluate(() => window.ants!.visiblePheromones())
  expect(visible).toEqual(['home', 'food', 'attract', 'repel'])
})

test('multi-select: toggles independently change visiblePheromones', async ({ page }) => {
  const attract = page.getByTestId('pheromone-toggle-attract')
  const repel = page.getByTestId('pheromone-toggle-repel')

  await attract.uncheck()
  await repel.uncheck()

  await expect(attract).not.toBeChecked()
  await expect(repel).not.toBeChecked()

  let visible = await page.evaluate(() => window.ants!.visiblePheromones())
  expect(visible).toEqual(['home', 'food'])

  await attract.check()
  await expect(attract).toBeChecked()

  visible = await page.evaluate(() => window.ants!.visiblePheromones())
  expect(visible).toEqual(['home', 'food', 'attract'])
})

test('rendering respects the selected pheromone overlay', async ({ page }) => {
  await page.getByTestId('control-play').click()
  await page.getByTestId('tool-attract').click()

  const box = await page.locator('canvas#arena').boundingBox()
  if (!box) throw new Error('no canvas box')

  const cssX = box.width * 0.25
  const cssY = box.height * 0.25
  await page.mouse.click(box.x + cssX, box.y + cssY)
  await page.waitForTimeout(150)

  const samplePixel = () =>
    page.evaluate(
      ({ x, y }) => {
        const canvas = document.querySelector('canvas#arena') as HTMLCanvasElement
        const ctx = canvas.getContext('2d')!
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const data = ctx.getImageData(Math.round(x * scaleX), Math.round(y * scaleY), 1, 1).data
        return [data[0], data[1], data[2]]
      },
      { x: cssX, y: cssY },
    )

  const visibleColor = await samplePixel()

  await page.getByTestId('pheromone-toggle-attract').uncheck()
  await page.waitForTimeout(150)
  const hiddenColor = await samplePixel()

  await page.getByTestId('pheromone-toggle-attract').check()
  await page.waitForTimeout(150)
  const restoredColor = await samplePixel()

  expect(hiddenColor).not.toEqual(visibleColor)
  expect(hiddenColor).not.toEqual(restoredColor)
})

test('pheromone lifetime floor: decayed attract pheromone vanishes completely', async ({ page }) => {
  await page.getByTestId('control-play').click()
  await page.getByTestId('tool-attract').click()

  const box = await page.locator('canvas#arena').boundingBox()
  if (!box) throw new Error('no canvas box')
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25)

  expect(await page.evaluate(() => window.ants!.stats().attract)).toBeGreaterThan(0)

  await page.getByTestId('slider-pheromoneDecay').evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '1'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })

  await page.getByTestId('control-play').click()

  await expect
    .poll(() => page.evaluate(() => window.ants!.stats().attract), { timeout: 30000 })
    .toBe(0)
})
