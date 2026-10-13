import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('loads the arena and shows live metrics', async ({ page }) => {
  await expect(page.locator('canvas#arena')).toBeVisible()
  const ants = await page.evaluate(() => {
    window.ants!.reset(1)
    return window.ants!.snapshot().ants
  })
  expect(ants).toBe(100)
  await expect(page.getByTestId('metric-ants')).toHaveText(/\d+/)
  await expect(page.locator('.tool')).toHaveCount(9)
})

test('the simulation advances over time', async ({ page }) => {
  const before = await page.evaluate(() => window.ants!.snapshot().time)
  await page.waitForTimeout(700)
  const after = await page.evaluate(() => window.ants!.snapshot().time)
  expect(after).toBeGreaterThan(before)
})

test('pausing freezes the simulation and stepping advances it once', async ({ page }) => {
  await page.getByTestId('control-play').click()
  const paused = await page.evaluate(() => window.ants!.snapshot().time)
  await page.waitForTimeout(400)
  expect(await page.evaluate(() => window.ants!.snapshot().time)).toBe(paused)

  await page.getByTestId('control-step').click()
  const stepped = await page.evaluate(() => window.ants!.snapshot().time)
  expect(stepped).toBeGreaterThan(paused)
})

test('placing food adds a source', async ({ page }) => {
  await page.getByTestId('tool-food').click()
  const box = await page.locator('canvas#arena').boundingBox()
  if (!box) throw new Error('no canvas box')
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
  await expect
    .poll(() => page.evaluate(() => window.ants!.stats().foodSources))
    .toBe(1)
})

test('adding an ant increases the colony', async ({ page }) => {
  await page.getByTestId('control-play').click()
  const before = await page.evaluate(() => window.ants!.snapshot().ants)
  await page.getByTestId('tool-spawnAnt').click()
  const box = await page.locator('canvas#arena').boundingBox()
  if (!box) throw new Error('no canvas box')
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await expect
    .poll(() => page.evaluate(() => window.ants!.snapshot().ants))
    .toBe(before + 1)
})

test('painting attract pheromone adds to the field', async ({ page }) => {
  await page.getByTestId('tool-attract').click()
  const box = await page.locator('canvas#arena').boundingBox()
  if (!box) throw new Error('no canvas box')
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 6 })
  await page.mouse.up()
  const attract = await page.evaluate(() => window.ants!.stats().attract)
  expect(attract).toBeGreaterThan(0)
})

test('drawing a wall increases the wall count', async ({ page }) => {
  await page.getByTestId('control-play').click()
  const before = await page.evaluate(() => window.ants!.stats().walls)
  await page.getByTestId('tool-wall').click()
  const box = await page.locator('canvas#arena').boundingBox()
  if (!box) throw new Error('no canvas box')
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  const after = await page.evaluate(() => window.ants!.stats().walls)
  expect(after).toBeGreaterThan(before)
})

test('the colony size slider changes the number of ants', async ({ page }) => {
  await page.getByTestId('control-play').click()
  await page.getByTestId('slider-colony').evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '80'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect
    .poll(() => page.evaluate(() => window.ants!.snapshot().ants))
    .toBe(80)
})

test('food sources spread scent pheromone', async ({ page }) => {
  await page.getByTestId('control-play').click()
  await page.getByTestId('tool-food').click()
  const box = await page.locator('canvas#arena').boundingBox()
  if (!box) throw new Error('no canvas box')
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3)
  await expect
    .poll(() => page.evaluate(() => window.ants!.stats().foodSources))
    .toBe(1)

  await page.getByTestId('control-step').click()
  await page.getByTestId('control-step').click()
  const foodScent = await page.evaluate(() => window.ants!.stats().foodScent)
  expect(foodScent).toBeGreaterThan(0)
})

test('the food scent slider is available', async ({ page }) => {
  const slider = page.getByTestId('slider-foodScentRate')
  await expect(slider).toBeVisible()
  await expect(slider).toHaveValue('5')
})

test('lifecycle sliders are available', async ({ page }) => {
  await expect(page.getByTestId('slider-antLifespan')).toHaveValue('60')
  await expect(page.getByTestId('slider-spawnInterval')).toHaveValue('1')
})

test('reset restarts the clock', async ({ page }) => {
  await page.waitForTimeout(500)
  await page.getByTestId('control-reset').click()
  const time = await page.evaluate(() => window.ants!.snapshot().time)
  expect(time).toBeLessThan(1)
})

test('creates an ant type from a natural-language description', async ({ page }) => {
  await expect(page.getByTestId('nest-type').locator('option')).toHaveCount(3)

  await page.getByTestId('ant-description').fill('fast curious scout')
  await page.getByTestId('create-ant-type').click()

  await expect(page.getByTestId('nest-type').locator('option')).toHaveCount(4)
  await expect(page.getByTestId('nest-type')).toHaveValue('custom-1')
  await expect(page.getByTestId('nest-type-description')).toHaveText('fast curious scout')

  const [customSpeed, workerSpeed, customWander, workerWander] = await page.evaluate(() => [
    window.ants!.typeBehavior('custom-1').speed,
    window.ants!.typeBehavior('worker').speed,
    window.ants!.typeBehavior('custom-1').wanderStrength,
    window.ants!.typeBehavior('worker').wanderStrength,
  ])
  expect(customSpeed).toBeGreaterThan(workerSpeed)
  expect(customWander).toBeGreaterThan(workerWander)
  expect(await page.evaluate(() => window.ants!.nestType())).toBe('custom-1')
})

test('nest spawns the selected ant type', async ({ page }) => {
  await page.getByTestId('control-play').click()

  await page.getByTestId('ant-description').fill('fast curious scout')
  await page.getByTestId('create-ant-type').click()

  const workerCount = await page.evaluate(() => window.ants!.typeCounts()['worker'] ?? 0)

  await page.getByTestId('tool-spawnAnt').click()
  const box = await page.locator('canvas#arena').boundingBox()
  if (!box) throw new Error('no canvas box')
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)

  await expect
    .poll(() => page.evaluate(() => window.ants!.typeCounts()['custom-1'] ?? 0))
    .toBe(1)
  expect(await page.evaluate(() => window.ants!.typeCounts()['worker'] ?? 0)).toBe(workerCount)
})

test('reset preserves player-created types', async ({ page }) => {
  await page.getByTestId('ant-description').fill('fast curious scout')
  await page.getByTestId('create-ant-type').click()

  await page.getByTestId('control-reset').click()

  await expect(page.getByTestId('nest-type').locator('option[value="custom-1"]')).toHaveCount(1)
  expect(await page.evaluate(() => window.ants!.nestType())).toBe('custom-1')
})
