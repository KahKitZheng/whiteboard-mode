import type { Page } from '@playwright/test'
import { expect, test } from './test'

const SURFACE = '[data-surface-id="lesson-one"]'
/** Empty space in the right column, clear of the toolbar and of the bubble above it. */
const AT = { x: 1060, y: 700 }

async function stored(page: Page) {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem('wb:lesson-one')
    type Stored = { type: string; from?: { x: number; y: number }; to?: { x: number; y: number } }
    return raw ? (JSON.parse(raw) as { shapes: Stored[] }).shapes : []
  })
}

async function pickPen(page: Page, tidy: boolean) {
  await page.getByRole('button', { name: 'Whiteboard' }).click()
  await page.getByRole('button', { name: 'Pen', exact: true }).click()
  if (tidy) await page.getByRole('group', { name: 'Shapes' }).getByRole('button', { name: 'Tidy shapes' }).click()
}

/** A hand-drawn circle: a little uneven, not quite closed. `up` decides how it ends. */
async function roughCircle(page: Page, up: 'lift' | 'hold') {
  const r = 55
  const point = (step: number) => {
    const angle = (step / 28) * Math.PI * 2 * 0.96
    const wobble = 1 + Math.sin(step * 2.3) * 0.05
    return { x: AT.x + Math.cos(angle) * r * wobble, y: AT.y + Math.sin(angle) * r * wobble }
  }
  await page.mouse.move(point(0).x, point(0).y)
  await page.mouse.down()
  for (let step = 1; step <= 28; step += 1) await page.mouse.move(point(step).x, point(step).y)
  // Holding still is waiting; nothing observable changes until the clock runs out.
  if (up === 'hold') await page.waitForTimeout(900)
  await page.mouse.up()
}

async function roughBox(page: Page) {
  const corners = [
    { x: AT.x - 90, y: AT.y - 50 },
    { x: AT.x + 90, y: AT.y - 52 },
    { x: AT.x + 92, y: AT.y + 50 },
    { x: AT.x - 88, y: AT.y + 48 },
    { x: AT.x - 86, y: AT.y - 46 },
  ]
  await page.mouse.move(corners[0].x, corners[0].y)
  await page.mouse.down()
  for (let side = 1; side < corners.length; side += 1) await page.mouse.move(corners[side].x, corners[side].y, { steps: 8 })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/lesson/one')
  await expect(page.locator(`${SURFACE} > svg`)).toBeVisible()
})

test('with Tidy shapes on, a rough circle becomes a circle', async ({ page }) => {
  await pickPen(page, true)
  await roughCircle(page, 'lift')

  await expect.poll(async () => (await stored(page)).at(-1)?.type).toBe('ellipse')
  const shape = (await stored(page)).at(-1)!
  const width = shape.to!.x - shape.from!.x
  const height = shape.to!.y - shape.from!.y
  expect(Math.abs(width - height)).toBeLessThan(0.01)
})

test('with Tidy shapes on, a rough box becomes a rectangle', async ({ page }) => {
  await pickPen(page, true)
  await roughBox(page)

  await expect.poll(async () => (await stored(page)).at(-1)?.type).toBe('rect')
})

test('with Tidy shapes off, the same circle is ink', async ({ page }) => {
  await pickPen(page, false)
  await roughCircle(page, 'lift')

  await expect.poll(async () => (await stored(page)).at(-1)?.type).toBe('stroke')
})

test('with Tidy shapes off, holding still before lifting snaps it anyway — previewed first', async ({ page }) => {
  await pickPen(page, false)
  const r = 55
  const point = (step: number) => {
    const angle = (step / 28) * Math.PI * 2 * 0.96
    return { x: AT.x + Math.cos(angle) * r, y: AT.y + Math.sin(angle) * r }
  }
  await page.mouse.move(point(0).x, point(0).y)
  await page.mouse.down()
  for (let step = 1; step <= 28; step += 1) await page.mouse.move(point(step).x, point(step).y)

  // Still ink while the hand is moving…
  await expect(page.locator(`${SURFACE} > svg > ellipse`)).toHaveCount(0)
  // …a circle once it has been still long enough.
  await expect(page.locator(`${SURFACE} > svg > ellipse`)).toHaveCount(1, { timeout: 3000 })
  await page.mouse.up()

  await expect.poll(async () => (await stored(page)).at(-1)?.type).toBe('ellipse')
})

test('moving on after the preview takes the ink back', async ({ page }) => {
  await pickPen(page, false)
  const r = 55
  const point = (step: number) => {
    const angle = (step / 28) * Math.PI * 2 * 0.96
    return { x: AT.x + Math.cos(angle) * r, y: AT.y + Math.sin(angle) * r }
  }
  await page.mouse.move(point(0).x, point(0).y)
  await page.mouse.down()
  for (let step = 1; step <= 28; step += 1) await page.mouse.move(point(step).x, point(step).y)
  await expect(page.locator(`${SURFACE} > svg > ellipse`)).toHaveCount(1, { timeout: 3000 })

  // Keep drawing: a scribble across the middle. No longer a circle.
  await page.mouse.move(AT.x - 40, AT.y + 10, { steps: 5 })
  await page.mouse.move(AT.x + 40, AT.y - 30, { steps: 5 })
  await page.mouse.move(AT.x - 30, AT.y - 40, { steps: 5 })
  await page.mouse.up()

  await expect.poll(async () => (await stored(page)).at(-1)?.type).toBe('stroke')
})

test('turning Tidy shapes on turns the pen back to free ink over words', async ({ page }) => {
  await pickPen(page, false)
  const words = page.getByRole('group', { name: 'Words' })
  await words.getByRole('button', { name: 'Underline' }).click()
  await expect(words.getByRole('button', { name: 'Underline' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('group', { name: 'Shapes' }).getByRole('button', { name: 'Tidy shapes' }).click()
  await expect(words.getByRole('button', { name: 'Free' })).toHaveAttribute('aria-pressed', 'true')
  await expect(words.getByRole('button', { name: 'Underline' })).toHaveAttribute('aria-pressed', 'false')

  // And back: asking for underlines gives up tidy shapes.
  await words.getByRole('button', { name: 'Underline' }).click()
  await expect(page.getByRole('group', { name: 'Shapes' }).getByRole('button', { name: 'Free' })).toHaveAttribute('aria-pressed', 'true')
})

test('with Tidy shapes on, an arc becomes a bent line, and its bend can be dragged', async ({ page }) => {
  await pickPen(page, true)
  // A quarter of a circle centred below the chord — bowing upwards.
  const r = 120
  const point = (step: number) => {
    const angle = ((-150 + (120 * step) / 24) * Math.PI) / 180
    return { x: AT.x + Math.cos(angle) * r, y: AT.y + 60 + Math.sin(angle) * r }
  }
  await page.mouse.move(point(0).x, point(0).y)
  await page.mouse.down()
  for (let step = 1; step <= 24; step += 1) await page.mouse.move(point(step).x, point(step).y)
  await page.mouse.up()

  await expect.poll(async () => (await stored(page)).at(-1)?.type).toBe('line')
  const line = (await stored(page)).at(-1) as { bend?: { x: number; y: number }; from: { y: number }; to: { y: number } }
  expect(line.bend).toBeDefined()
  expect(line.bend!.y).toBeLessThan(Math.min(line.from.y, line.to.y))

  // Select it and pull its middle handle down: the bow flips.
  await page.getByRole('button', { name: 'Select', exact: true }).click()
  const middle = point(12)
  await page.mouse.click(middle.x, middle.y)
  await expect(page.getByRole('button', { name: 'Delete shape' })).toBeVisible()
  await page.mouse.move(middle.x, middle.y)
  await page.mouse.down()
  await page.mouse.move(middle.x, middle.y + 90, { steps: 6 })
  await page.mouse.up()

  await expect
    .poll(async () => ((await stored(page)).at(-1) as { bend?: { y: number }; from: { y: number } }).bend!.y)
    .toBeGreaterThan(line.from.y)
})

test('the line tool draws an arrow when asked for heads', async ({ page }) => {
  await page.getByRole('button', { name: 'Whiteboard' }).click()
  await page.getByRole('button', { name: 'Line', exact: true }).click()
  await page.getByRole('group', { name: 'Heads' }).getByRole('button', { name: 'Arrow at end' }).click()
  await page.mouse.move(AT.x - 80, AT.y)
  await page.mouse.down()
  await page.mouse.move(AT.x + 80, AT.y, { steps: 6 })
  await page.mouse.up()

  await expect.poll(async () => (await stored(page)).at(-1)?.type).toBe('line')
  expect(((await stored(page)).at(-1) as { heads?: string }).heads).toBe('end')
})

test('off, every tool is on the bar with none in hand, and pressing one arms the whiteboard', async ({ page }) => {
  const pen = page.getByRole('button', { name: 'Pen', exact: true })
  await expect(pen).toBeVisible()
  await expect(page.getByRole('button', { name: 'Timer', exact: true })).toBeVisible()
  await expect(pen).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.tool-bubble')).toHaveCount(0)

  await page.getByRole('button', { name: 'Line', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Whiteboard' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Line', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('group', { name: 'Heads' })).toBeVisible()
})
