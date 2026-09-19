import type { Page } from '@playwright/test'
import { expect, test } from './test'

const SURFACE = '[data-surface-id="lesson-reflow"]'
const WIDE = { width: 1280, height: 900 }
const NARROW = { width: 720, height: 1400 }

type Rect = { x: number; y: number; width: number; height: number }

/** The box of the first occurrence of a word inside an element, in page coordinates. */
async function wordRect(page: Page, scope: string, word: string): Promise<Rect> {
  return page.evaluate(
    ([scope, word]) => {
      const root = document.querySelector(scope)!
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const index = (node as Text).data.indexOf(word)
        if (index === -1) continue
        const range = document.createRange()
        range.setStart(node, index)
        range.setEnd(node, index + word.length)
        const r = range.getBoundingClientRect()
        return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }
      }
      throw new Error(`no "${word}" in ${scope}`)
    },
    [scope, word] as const,
  )
}

async function fontSizeOf(page: Page, selector: string): Promise<number> {
  return page.evaluate((selector) => parseFloat(getComputedStyle(document.querySelector(selector)!).fontSize), selector)
}

async function rectOf(page: Page, selector: string): Promise<Rect> {
  return page.evaluate((selector) => {
    const r = document.querySelector(selector)!.getBoundingClientRect()
    return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }
  }, selector)
}

async function lastStrokeRect(page: Page): Promise<Rect> {
  return page.evaluate((surface) => {
    const paths = document.querySelectorAll(`${surface} > svg path`)
    const r = paths[paths.length - 1].getBoundingClientRect()
    return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }
  }, SURFACE)
}

async function arm(page: Page) {
  await page.getByRole('button', { name: 'Whiteboard' }).click()
}

/** A loop around a box — what circling a word looks like. */
async function circle(page: Page, box: Rect) {
  const cx = box.x + box.width / 2 - (await page.evaluate(() => scrollX))
  const cy = box.y + box.height / 2 - (await page.evaluate(() => scrollY))
  const rx = box.width / 2 + 8
  const ry = box.height / 2 + 6
  await page.mouse.move(cx + rx, cy)
  await page.mouse.down()
  for (let step = 1; step <= 16; step += 1) {
    const angle = (step / 16) * Math.PI * 2
    await page.mouse.move(cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry)
  }
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(WIDE)
  await page.goto('/lesson/reflow')
  await expect(page.locator(`${SURFACE} > svg`)).toBeVisible()
})

test('a circle around a word stays around it when the columns stack', async ({ page }) => {
  const word = await wordRect(page, '.lesson-aside', 'narrower')
  await arm(page)
  await circle(page, word)
  const strokes = page.locator(`${SURFACE} > svg path`)
  await expect(strokes).toHaveCount(2)

  const before = await lastStrokeRect(page)
  const offset = { x: before.x - word.x, y: before.y - word.y }

  await page.setViewportSize(NARROW)
  const movedWord = await wordRect(page, '.lesson-aside', 'narrower')
  // The column dropped under the other one, so the word is far from where it was.
  expect(movedWord.y - word.y).toBeGreaterThan(300)

  await expect
    .poll(async () => {
      const after = await lastStrokeRect(page)
      return Math.max(Math.abs(after.x - movedWord.x - offset.x), Math.abs(after.y - movedWord.y - offset.y))
    })
    .toBeLessThan(2)
})

test('a stroke over a picture follows it and scales with it', async ({ page }) => {
  const figure = await rectOf(page, '.lesson-figure')
  await arm(page)
  const x = figure.x + figure.width * 0.3
  const y = figure.y + figure.height * 0.4
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + figure.width * 0.3, y + figure.height * 0.1, { steps: 8 })
  await page.mouse.up()

  const before = await lastStrokeRect(page)
  const relative = { x: (before.x - figure.x) / figure.width, w: before.width / figure.width }

  await page.setViewportSize(NARROW)
  const movedFigure = await rectOf(page, '.lesson-figure')
  expect(Math.abs(movedFigure.width - figure.width)).toBeGreaterThan(50)

  await expect
    .poll(async () => {
      const after = await lastStrokeRect(page)
      return Math.max(
        Math.abs((after.x - movedFigure.x) / movedFigure.width - relative.x),
        Math.abs(after.width / movedFigure.width - relative.w),
      )
    })
    .toBeLessThan(0.01)
})

test('shapes from before anchoring are adopted where they sit, and follow from then on', async ({ page }) => {
  // The seeded shapes carry no anchor. After first layout they all do.
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const raw = sessionStorage.getItem('wb:lesson-reflow')
        return raw ? (JSON.parse(raw) as { shapes: { anchor?: unknown }[] }).shapes.every((shape) => shape.anchor) : null
      }),
    )
    .toBe(true)

  // The ellipse around the title now follows the title, whose font shrinks on a narrow screen.
  const title = await rectOf(page, '.lesson h1')
  const font = await fontSizeOf(page, '.lesson h1')
  const ellipse = await page.evaluate((surface) => {
    const r = document.querySelector(`${surface} > svg path`)!.getBoundingClientRect()
    return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }
  }, SURFACE)
  const relative = { x: (ellipse.x - title.x) / font, w: ellipse.width / font }

  await page.setViewportSize(NARROW)
  const movedTitle = await rectOf(page, '.lesson h1')
  const movedFont = await fontSizeOf(page, '.lesson h1')
  expect(movedFont).toBeLessThan(font * 0.8)

  await expect
    .poll(async () => {
      const after = await page.evaluate((surface) => {
        const r = document.querySelector(`${surface} > svg path`)!.getBoundingClientRect()
        return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }
      }, SURFACE)
      return Math.max(Math.abs((after.x - movedTitle.x) / movedFont - relative.x), Math.abs(after.width / movedFont - relative.w))
    })
    .toBeLessThan(0.1)
})

test('a shape whose target is gone stays where it was', async ({ page }) => {
  const word = await wordRect(page, '.lesson-aside', 'remembers')
  await arm(page)
  await circle(page, word)
  const before = await lastStrokeRect(page)

  // The host rewrites the block out from under it. Nothing above moved, so
  // the fallback — the shape's own coordinates — puts it exactly where it was.
  await page.evaluate(() => document.querySelectorAll('.lesson-aside p')[1].remove())

  await expect
    .poll(async () => {
      const after = await lastStrokeRect(page)
      return Math.max(Math.abs(after.x - before.x), Math.abs(after.y - before.y))
    })
    .toBeLessThan(1)
})
