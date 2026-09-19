import type { Locator, Page } from '@playwright/test'
import { WATERKRINGLOOP_TEXT } from '../src/boardbook/waterkringloop.text'
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
    type Stored = { type: string; kind?: string; weight?: number; anchor?: { target: { quote?: { exact: string } } } }
    return raw ? (JSON.parse(raw) as { shapes: Stored[] }) : null
  }, `wb:${surfaceId}`)
}

/** The box of a word in the text layer, in viewport coordinates. */
async function wordRect(page: Page, word: string) {
  return page.evaluate((word) => {
    const root = document.querySelector('.boardbook-text')!
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const index = (node as Text).data.indexOf(word)
      if (index === -1) continue
      const range = document.createRange()
      range.setStart(node, index)
      range.setEnd(node, index + word.length)
      const r = range.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    }
    throw new Error(`no "${word}"`)
  }, word)
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

test('armed, the highlighter snapping to words marks the words the picture shows', async ({ page }) => {
  await arm(page)
  await page.getByRole('button', { name: 'Highlighter', exact: true }).click()
  await page.getByRole('group', { name: 'Words' }).getByRole('button', { name: 'Snap to words' }).click()

  const from = await wordRect(page, 'Water')
  const to = await wordRect(page, 'altijd')
  await page.mouse.move(from.x + 4, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width - 4, to.y + to.height / 2, { steps: 12 })
  await page.mouse.up()

  await expect.poll(async () => (await stored(page))?.shapes.at(-1)?.type).toBe('mark')
  const mark = (await stored(page))!.shapes.at(-1)!
  expect(mark.kind).toBe('highlight')
  expect(mark.anchor?.target.quote?.exact).toBe('Water is altijd')

  // Drawn through the words, not where the pointer happened to be.
  const path = (await strokes(page).last().boundingBox())!
  expect(Math.abs(path.x - from.x)).toBeLessThan(8)
  expect(Math.abs(path.x + path.width - (to.x + to.width))).toBeLessThan(8)
  expect(Math.abs(path.y + path.height / 2 - (from.y + from.height / 2))).toBeLessThan(6)
})

test('the words end where the picture draws them, at rest and zoomed in', async ({ page }) => {
  const line = WATERKRINGLOOP_TEXT.find((line) => line.text.startsWith('Water is altijd'))!
  async function overshoot() {
    const box = (await page.locator('.boardbook-text').boundingBox())!
    const last = await wordRect(page, 'waterdamp,')
    const pictureEnd = box.x + ((line.x + line.width) / 100) * box.width
    // As a fraction of the line, so the check means the same at any zoom.
    return Math.abs(last.x + last.width - pictureEnd) / ((line.width / 100) * box.width)
  }
  expect(await overshoot()).toBeLessThan(0.01)

  // A zoom changes the font's rendered size, and with it the system font's tracking.
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect.poll(overshoot).toBeLessThan(0.01)
})

test('the highlighter snaps to words that lie under a focus area', async ({ page }) => {
  await arm(page)
  await page.getByRole('button', { name: 'Highlighter', exact: true }).click()
  await page.getByRole('group', { name: 'Words' }).getByRole('button', { name: 'Snap to words' }).click()

  // "Opdracht 3" is a focus area; its questions are under the area's button.
  const from = await wordRect(page, 'Waardoor')
  const to = await wordRect(page, 'Schrijf')
  await page.mouse.move(from.x + 4, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width - 4, to.y + to.height / 2, { steps: 12 })
  await page.mouse.up()

  await expect.poll(async () => (await stored(page))?.shapes.at(-1)?.type).toBe('mark')
  expect((await stored(page))!.shapes.at(-1)!.anchor?.target.quote?.exact).toBe('Waardoor verdampt water uit de zee? Schrijf')
})

test('the highlighter over the diagram is still a highlighter, words or not', async ({ page }) => {
  await arm(page)
  await page.getByRole('button', { name: 'Highlighter', exact: true }).click()
  await page.getByRole('group', { name: 'Words' }).getByRole('button', { name: 'Snap to words' }).click()

  // The right half of the page is the picture of the cycle; its labels are single words far apart.
  await draw(page, page.locator('.boardbook-viewer'), { x: 0.62, y: 0.45 })
  await expect.poll(async () => (await stored(page))?.shapes.at(-1)?.type).toBe('stroke')
})

test('the page never leaves its box: no drag when fitted, and the view stays on the page zoomed in', async ({ page }) => {
  const viewer = (await page.locator('.boardbook-viewer').boundingBox())!
  const rest = (await layer(page).boundingBox())!

  // Fitted, the whole page is in view; a drag has nowhere to take it.
  const from = { x: rest.x + rest.width * 0.1, y: rest.y + rest.height * 0.2 }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + 120, from.y + 80, { steps: 8 })
  await page.mouse.up()
  await page.mouse.wheel(0, 600)
  await page.getByRole('button', { name: 'Zoom out' }).click()
  await page.waitForTimeout(400)
  expect(await layer(page).boundingBox()).toEqual(rest)

  // Zoomed in, a drag pans — but the page's edge never comes inside the box.
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect.poll(async () => (await layer(page).boundingBox())!.width).toBeGreaterThan(rest.width * 1.9)
  const zoomed = (await layer(page).boundingBox())!
  const centre = { x: viewer.x + viewer.width / 2, y: viewer.y + viewer.height / 2 }
  await page.mouse.move(centre.x, centre.y)
  await page.mouse.down()
  await page.mouse.move(centre.x + 4000, centre.y + 3000, { steps: 20 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  const dragged = (await layer(page).boundingBox())!
  expect(dragged.x).not.toEqual(zoomed.x)
  expect(dragged.x).toBeLessThanOrEqual(viewer.x + 1)
  expect(dragged.y).toBeLessThanOrEqual(viewer.y + 1)
  expect(dragged.x + dragged.width).toBeGreaterThanOrEqual(viewer.x + viewer.width - 1)
  expect(dragged.y + dragged.height).toBeGreaterThanOrEqual(viewer.y + viewer.height - 1)
})

test('off, a drag that starts on a focus area pans, and a tap on it still frames it', async ({ page }) => {
  await disarm(page)
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  const rest = (await layer(page).boundingBox())!
  await expect.poll(async () => (await layer(page).boundingBox())!.width).toBeGreaterThan(rest.width * 0.99)

  const area = (await page.getByRole('button', { name: /De kringloop/ }).boundingBox())!
  const on = { x: area.x + area.width / 2, y: area.y + area.height / 2 }
  await page.mouse.move(on.x, on.y)
  await page.mouse.down()
  await page.mouse.move(on.x - 150, on.y - 100, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  const before = (await layer(page).boundingBox())!
  expect(before.x).not.toEqual(rest.x)
  // A drag is not a press: nothing was framed, so the bar shows no name.
  await expect(page.locator('.boardbook-bar-name')).toHaveCount(0)

  const again = (await page.getByRole('button', { name: /De kringloop/ }).boundingBox())!
  await page.mouse.click(again.x + again.width / 2, again.y + again.height / 2)
  await expect(page.locator('.boardbook-bar-name')).toHaveText('1/3 · De kringloop')
})

test('zoomed in, two fingers on a trackpad pan the page and a pinch zooms it', async ({ page }) => {
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  const viewer = (await page.locator('.boardbook-viewer').boundingBox())!
  await page.mouse.move(viewer.x + viewer.width / 2, viewer.y + viewer.height / 2)
  // Settled, not mid-animation: two reads a frame apart agree.
  let zoomed = (await layer(page).boundingBox())!
  await expect
    .poll(async () => {
      const next = (await layer(page).boundingBox())!
      const settled = next.width > viewer.width && Math.abs(next.width - zoomed.width) < 0.5
      zoomed = next
      return settled
    })
    .toBe(true)

  // A wheel is a pan: the page moves, its size does not change.
  await page.mouse.wheel(0, 200)
  await expect.poll(async () => (await layer(page).boundingBox())!.y).toBeLessThan(zoomed.y - 50)
  expect(Math.abs((await layer(page).boundingBox())!.width - zoomed.width)).toBeLessThan(2)

  // A pinch arrives as ctrl+wheel and zooms.
  await page.keyboard.down('Control')
  await page.mouse.wheel(0, -100)
  await page.keyboard.up('Control')
  await expect.poll(async () => (await layer(page).boundingBox())!.width).toBeGreaterThan(zoomed.width * 1.5)
})

test('a press OSD did not capture still counts as a drag, and its click is swallowed', async ({ page }) => {
  await page.getByRole('button', { name: 'Zoom in' }).click()
  const area = page.getByRole('button', { name: /De kringloop/ })
  await expect.poll(async () => (await area.boundingBox())!.width).toBeGreaterThan(300)

  // Hand-made pointer events: their ids are unknown to the browser, so
  // `setPointerCapture` fails and the click goes where the release lands.
  await area.evaluate((button) => {
    const box = button.getBoundingClientRect()
    const at = (dx: number) => ({ clientX: box.x + box.width / 2 + dx, clientY: box.y + box.height / 2, bubbles: true, pointerId: 77, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1 })
    button.dispatchEvent(new PointerEvent('pointerdown', at(0)))
    for (let step = 1; step <= 6; step += 1) button.dispatchEvent(new PointerEvent('pointermove', at(step * 15)))
    button.dispatchEvent(new PointerEvent('pointerup', { ...at(90), buttons: 0 }))
    button.dispatchEvent(new MouseEvent('click', { ...at(90), buttons: 0 }))
  })
  await page.waitForTimeout(300)
  await expect(page.locator('.boardbook-bar-name')).toHaveCount(0)

  // The same without moving is a tap, and frames the area once.
  await area.evaluate((button) => {
    const box = button.getBoundingClientRect()
    const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, bubbles: true, pointerId: 78, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1 }
    button.dispatchEvent(new PointerEvent('pointerdown', at))
    button.dispatchEvent(new PointerEvent('pointerup', { ...at, buttons: 0 }))
    button.dispatchEvent(new MouseEvent('click', { ...at, buttons: 0 }))
  })
  await expect(page.locator('.boardbook-bar-name')).toHaveText('1/3 · De kringloop')
})

test('the focus areas can be hidden from the bar, and the walkthrough still frames them', async ({ page }) => {
  const toggle = page.getByRole('button', { name: 'Show focus areas' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.boardbook-area')).toHaveCount(3)

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.boardbook-area')).toHaveCount(0)
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.locator('.boardbook-bar-name')).toHaveText('1/3 · De kringloop')

  await toggle.click()
  await expect(page.locator('.boardbook-area')).toHaveCount(3)
})
