import type { Locator, Page } from '@playwright/test'
import { expect, test } from './test'

const SURFACE = 'boardbook-waterkringloop'

function layer(page: Page, surfaceId = SURFACE): Locator {
  return page.locator(`[data-surface-id="${surfaceId}"] > svg`)
}

function strokes(page: Page, surfaceId = SURFACE): Locator {
  return layer(page, surfaceId).locator('path')
}

async function arm(page: Page) {
  const toggle = page.getByRole('button', { name: 'Whiteboard' })
  if ((await toggle.getAttribute('aria-pressed')) !== 'true') await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
}

async function disarm(page: Page) {
  const toggle = page.getByRole('button', { name: 'Whiteboard' })
  if ((await toggle.getAttribute('aria-pressed')) === 'true') await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
}

/** A short diagonal stroke starting at a fraction of the given box. */
async function draw(page: Page, target: Locator, at: { x: number; y: number } = { x: 0.3, y: 0.3 }) {
  const box = (await target.boundingBox())!
  const from = { x: box.x + box.width * at.x, y: box.y + box.height * at.y }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 40, from.y + 30, { steps: 6 })
  await page.mouse.move(from.x + 80, from.y + 40, { steps: 6 })
  await page.mouse.up()
}

async function stored(page: Page, surfaceId = SURFACE) {
  return page.evaluate((key) => {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as { shapes: { weight?: number }[] }) : null
  }, `wb:${surfaceId}`)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/boardbook/waterkringloop')
  await expect(layer(page)).toBeVisible()
})

test('a stroke stays on the same image pixels when the view zooms into a focus area', async ({ page }) => {
  await arm(page)
  await draw(page, layer(page))
  await expect(strokes(page)).toHaveCount(1)
  const before = await strokes(page).getAttribute('d')
  const home = (await layer(page).boundingBox())!.width

  await page.getByRole('button', { name: 'Start' }).click()
  await expect.poll(async () => (await layer(page).boundingBox())!.width).toBeGreaterThan(home * 1.5)

  // Shapes are laid out in image space, so the path is literally unchanged.
  expect(await strokes(page).getAttribute('d')).toBe(before)
})

test('ink drawn while zoomed in is stored thinner, so it stays anchored at the pen weight', async ({ page }) => {
  await arm(page)
  await draw(page, layer(page), { x: 0.2, y: 0.2 })
  await expect.poll(async () => (await stored(page))?.shapes.length).toBe(1)
  const home = (await layer(page).boundingBox())!.width

  await page.getByRole('button', { name: 'Start' }).click()
  await expect.poll(async () => (await layer(page).boundingBox())!.width).toBeGreaterThan(home * 1.5)

  await draw(page, page.locator('.boardbook-viewer'), { x: 0.5, y: 0.5 })
  await expect.poll(async () => (await stored(page))?.shapes.length).toBe(2)

  const [atHome, zoomed] = (await stored(page))!.shapes
  expect(zoomed.weight!).toBeLessThan(atHome.weight!)
})

test("an item dialog's marks belong to the dialog and come back with it", async ({ page }) => {
  await page.getByRole('button', { name: 'Verdamping', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await arm(page)
  await draw(page, dialog)
  await expect(strokes(page, `${SURFACE}:item-i1`)).toHaveCount(1)
  await expect(strokes(page)).toHaveCount(0)

  await disarm(page)
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toBeHidden()

  await page.getByRole('button', { name: 'Verdamping', exact: true }).click()
  await expect(strokes(page, `${SURFACE}:item-i1`)).toHaveCount(1)
  await expect(strokes(page)).toHaveCount(0)
})

test('armed, dragging from a marker draws and does not open it', async ({ page }) => {
  await arm(page)
  await draw(page, page.getByRole('button', { name: 'Verdamping', exact: true }), { x: 0.5, y: 0.5 })

  await expect(strokes(page)).toHaveCount(1)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('armed, tapping a marker opens it and draws nothing', async ({ page }) => {
  await arm(page)
  await page.getByRole('button', { name: 'Verdamping', exact: true }).click()

  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(strokes(page)).toHaveCount(0)
})

test('armed, tapping a focus area frames it', async ({ page }) => {
  await arm(page)
  await page.getByRole('button', { name: 'De kringloop' }).click()

  await expect(page.locator('.boardbook-bar-name')).toHaveText('1/3 · De kringloop')
  await expect(strokes(page)).toHaveCount(0)
})

test('armed, a tap outside the dialog dismisses it and a drag outside draws', async ({ page }) => {
  await arm(page)
  await page.getByRole('button', { name: 'Condensatie', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // Backdrop between the walkthrough bar and the popup, clear of the floating
  // whiteboard bars along the bottom.
  const outside = { x: 640, y: 150 }

  await page.mouse.move(outside.x, outside.y)
  await page.mouse.down()
  await page.mouse.move(outside.x + 60, outside.y - 40, { steps: 5 })
  await page.mouse.up()
  await expect(dialog).toBeVisible()
  await expect(strokes(page, `${SURFACE}:item-i2`)).toHaveCount(1)

  await page.mouse.click(outside.x, outside.y)
  await expect(dialog).toBeHidden()
})

test('armed, the item dialog closes from its own button, even with an unsteady hand', async ({ page }) => {
  await arm(page)
  await page.getByRole('button', { name: 'Condensatie', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // A real press drifts a few pixels between down and up. Still a tap.
  const close = (await dialog.getByRole('button', { name: 'Close' }).boundingBox())!
  const at = { x: close.x + close.width / 2, y: close.y + close.height / 2 }
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.move(at.x + 4, at.y + 3)
  await page.mouse.up()

  await expect(dialog).toBeHidden()
  await expect(strokes(page, `${SURFACE}:item-i2`)).toHaveCount(0)
})

test('the walkthrough steps through focus areas by their order, not their stored order', async ({ page }) => {
  const name = page.locator('.boardbook-bar-name')
  const start = page.getByRole('button', { name: 'Start' })
  const previous = page.getByRole('button', { name: 'Previous focus area' })
  const next = page.getByRole('button', { name: 'Next focus area' })

  await expect(start).toBeVisible()
  await expect(name).toHaveCount(0)

  await start.click()
  await expect(name).toHaveText('1/3 · De kringloop')
  await expect(previous).toBeDisabled()
  await next.click()
  await expect(name).toHaveText('2/3 · Verdamping en neerslag')
  await previous.click()
  await expect(name).toHaveText('1/3 · De kringloop')

  await next.click()
  await next.click()
  await expect(name).toHaveText('3/3 · Opdracht 3')
  await expect(next).toBeDisabled()

  await page.getByRole('button', { name: 'Overview' }).click()
  await expect(start).toBeVisible()
})

test('pressing a focus area frames it, and pressing it again zooms back out', async ({ page }) => {
  const name = page.locator('.boardbook-bar-name')
  const area = page.getByRole('button', { name: 'De kringloop' })
  const home = (await layer(page).boundingBox())!.width

  await area.click()
  await expect(name).toHaveText('1/3 · De kringloop')
  await expect.poll(async () => (await layer(page).boundingBox())!.width).toBeGreaterThan(home * 1.5)

  await area.click()
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
  await expect.poll(async () => (await layer(page).boundingBox())!.width).toBeLessThan(home * 1.05)
})
