import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('obstacle tool draws a rectangle on release', async ({ page }) => {
  await page.getByTestId('control-play').click()
  await page.getByTestId('tool-obstacle').click()

  const before = await page.evaluate(() => window.ants!.stats())

  const box = await page.locator('canvas#arena').boundingBox()
  if (!box) throw new Error('no canvas box')

  const startX = box.x + box.width * 0.35
  const startY = box.y + box.height * 0.35
  const endX = box.x + box.width * 0.55
  const endY = box.y + box.height * 0.55

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(endX, endY, { steps: 8 })

  expect(await page.evaluate(() => window.ants!.stats().obstacles)).toBe(0)

  await page.mouse.up()

  await expect.poll(() => page.evaluate(() => window.ants!.stats().obstacles)).toBeGreaterThan(0)

  const after = await page.evaluate(() => window.ants!.stats())
  expect(after.walls - before.walls).toBe(after.obstacles)
})

test('a single click places one obstacle cell', async ({ page }) => {
  await page.getByTestId('control-play').click()
  await page.getByTestId('tool-obstacle').click()

  const box = await page.locator('canvas#arena').boundingBox()
  if (!box) throw new Error('no canvas box')
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)

  await expect.poll(() => page.evaluate(() => window.ants!.stats().obstacles)).toBe(1)
})

test('obstacles are erased with the erase wall tool', async ({ page }) => {
  await page.getByTestId('control-play').click()
  await page.getByTestId('tool-obstacle').click()

  const box = await page.locator('canvas#arena').boundingBox()
  if (!box) throw new Error('no canvas box')

  const startX = box.x + box.width * 0.45
  const startY = box.y + box.height * 0.45
  const endX = box.x + box.width * 0.55
  const endY = box.y + box.height * 0.55

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(endX, endY, { steps: 8 })
  await page.mouse.up()

  await expect.poll(() => page.evaluate(() => window.ants!.stats().obstacles)).toBeGreaterThan(0)

  await page.getByTestId('tool-eraseWall').click()

  const left = startX - box.width * 0.03
  const right = endX + box.width * 0.03
  const top = startY - box.height * 0.03
  const bottom = endY + box.height * 0.03
  const rows = 5

  for (let i = 0; i <= rows; i++) {
    const y = top + (bottom - top) * (i / rows)
    await page.mouse.move(left, y)
    await page.mouse.down()
    await page.mouse.move(right, y, { steps: 8 })
    await page.mouse.up()
  }

  await expect.poll(() => page.evaluate(() => window.ants!.stats().obstacles)).toBe(0)
})
