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

test('sim parameter sliders are available', async ({ page }) => {
  await expect(page.getByTestId('slider-pheromoneDecay')).toBeVisible()
  await expect(page.getByTestId('slider-pheromoneDiffusion')).toBeVisible()
  await expect(page.getByTestId('slider-foodScentRate')).toBeVisible()
  await expect(page.getByTestId('slider-spawnInterval')).toBeVisible()
  await expect(page.getByTestId('slider-antSpeed')).not.toBeVisible()
  await expect(page.getByTestId('slider-antLifespan')).not.toBeVisible()
})

test('reset restarts the clock', async ({ page }) => {
  await page.waitForTimeout(500)
  await page.getByTestId('control-reset').click()
  const time = await page.evaluate(() => window.ants!.snapshot().time)
  expect(time).toBeLessThan(1)
})

test('blank ants are inert until given abilities', async ({ page }) => {
  await page.getByTestId('control-play').click()
  const count = await page.evaluate(() => {
    window.ants!.reset(1)
    return window.ants!.snapshot().ants
  })
  expect(count).toBe(100)

  await page.getByTestId('control-step').click()
  await page.getByTestId('control-step').click()
  await page.getByTestId('control-step').click()
  expect(await page.evaluate(() => window.ants!.stats().homePheromone)).toBe(0)

  await page.getByTestId('new-type').click()
  await page.getByTestId('ant-type-name').fill('Emitter')
  await page.getByTestId('add-ability-kind').selectOption('emit')
  await page.getByTestId('add-ability').click()
  await page.getByTestId('save-type').click()

  await page.getByTestId('nest-type').selectOption('custom-1')
  await expect.poll(() => page.evaluate(() => window.ants!.nestType())).toBe('custom-1')

  await page.getByTestId('tool-spawnAnt').click()
  const box = await page.locator('canvas#arena').boundingBox()
  if (!box) throw new Error('no canvas box')
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await expect
    .poll(() => page.evaluate(() => window.ants!.typeCounts()['custom-1'] ?? 0))
    .toBe(1)

  await page.getByTestId('control-step').click()
  expect(await page.evaluate(() => window.ants!.stats().homePheromone)).toBeGreaterThan(0)
})

test('editor adds and removes abilities', async ({ page }) => {
  await page.getByTestId('new-type').click()
  await page.getByTestId('ant-type-name').fill('Multi')

  await page.getByTestId('add-ability-kind').selectOption('walk')
  await page.getByTestId('add-ability').click()
  await page.getByTestId('add-ability-kind').selectOption('wander')
  await page.getByTestId('add-ability').click()
  await page.getByTestId('add-ability-kind').selectOption('emit')
  await page.getByTestId('add-ability').click()

  await page.getByTestId('save-type').click()

  const saved = await page.evaluate(() =>
    window.ants!.types().find((type) => type.id === 'custom-1'),
  )
  expect(saved).toBeDefined()
  expect(saved!.abilities.map((ability) => ability.kind)).toEqual(['walk', 'wander', 'emit'])

  await page.getByTestId('ability-1-remove').click()
  await page.getByTestId('save-type').click()

  const updated = await page.evaluate(() =>
    window.ants!.types().find((type) => type.id === 'custom-1'),
  )
  expect(updated).toBeDefined()
  expect(updated!.abilities).toHaveLength(2)
})

test('custom types persist across reloads', async ({ page }) => {
  await page.getByTestId('new-type').click()
  await page.getByTestId('ant-type-name').fill('Survivor')
  await page.getByTestId('save-type').click()

  await page.getByTestId('nest-type').selectOption('custom-1')
  await expect.poll(() => page.evaluate(() => window.ants!.nestType())).toBe('custom-1')

  await page.reload()

  const types = await page.evaluate(() => window.ants!.types())
  expect(types.some((type) => type.id === 'custom-1' && type.name === 'Survivor')).toBe(true)
  expect(await page.evaluate(() => window.ants!.nestType())).toBe('custom-1')
  await expect(page.getByTestId('nest-type').locator('option[value="custom-1"]')).toHaveCount(1)
})

test('deleting a type resets the nest selection', async ({ page }) => {
  await page.getByTestId('new-type').click()
  await page.getByTestId('ant-type-name').fill('Temporary')
  await page.getByTestId('save-type').click()

  await page.getByTestId('nest-type').selectOption('custom-1')
  await expect.poll(() => page.evaluate(() => window.ants!.nestType())).toBe('custom-1')

  await page.getByTestId('edit-type').selectOption('custom-1')
  await page.getByTestId('delete-type').click()

  const types = await page.evaluate(() => window.ants!.types())
  expect(types.some((type) => type.id === 'custom-1')).toBe(false)
  expect(await page.evaluate(() => window.ants!.nestType())).toBe('blank')
})

test('preview spawns a real ant of the draft type', async ({ page }) => {
  await page.getByTestId('control-play').click()
  const before = await page.evaluate(() => {
    window.ants!.reset(1)
    return window.ants!.snapshot().ants
  })
  expect(before).toBe(100)

  await page.getByTestId('new-type').click()
  await page.getByTestId('ant-type-name').fill('Preview')
  await page.getByTestId('add-ability-kind').selectOption('walk')
  await page.getByTestId('add-ability').click()
  await page.getByTestId('preview-type').click()

  await expect.poll(() => page.evaluate(() => window.ants!.snapshot().ants)).toBe(before + 1)
  expect(await page.evaluate(() => window.ants!.typeCounts()['preview'] ?? 0)).toBe(1)
})
