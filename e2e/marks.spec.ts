import type { Page } from '@playwright/test'
import { expect, test } from './test'

const SURFACE = '[data-surface-id="lesson-reflow"]'
const WIDE = { width: 1280, height: 900 }
const NARROW = { width: 720, height: 1400 }

type Rect = { x: number; y: number; width: number; height: number }

/** The box of a word in the aside, in viewport coordinates (the page is not scrolled). */
async function wordRect(page: Page, word: string): Promise<Rect> {
  return page.evaluate((word) => {
    const root = document.querySelector('.lesson-aside')!
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

/** The stroke boxes of the last shape drawn, one per <path>. */
async function lastShapePaths(page: Page): Promise<Rect[]> {
  return page.evaluate((surface) => {
    // The last group that draws ink — the selection overlay is a group too.
    const groups = Array.from(document.querySelectorAll(`${surface} > svg > g`))
    const last = groups.reverse().find((group) => group.querySelector('path'))!
    return Array.from(last.querySelectorAll('path')).map((path) => {
      const r = path.getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    })
  }, SURFACE)
}

async function stored(page: Page) {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem('wb:lesson-reflow')
    type Stored = { type: string; kind?: string; anchor?: { target: { quote?: { exact: string } } } }
    return raw ? (JSON.parse(raw) as { shapes: Stored[] }).shapes : []
  })
}

/** Arm, pick a tool, and set its "Words" option. */
async function pick(page: Page, tool: 'Pen' | 'Highlighter', words: 'Snap to words' | 'Underline' | 'Strikethrough' | null) {
  await page.getByRole('button', { name: 'Whiteboard' }).click()
  await page.getByRole('button', { name: tool, exact: true }).click()
  if (words) await page.getByRole('group', { name: 'Words' }).getByRole('button', { name: words }).click()
}

async function dragWords(page: Page, from: Rect, to: Rect) {
  await page.mouse.move(from.x + 4, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width - 4, to.y + to.height / 2, { steps: 12 })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(WIDE)
  await page.goto('/lesson/reflow')
  await expect(page.locator(`${SURFACE} > svg`)).toBeVisible()
})

test('a highlight over words is stored as the words, and re-wraps with them', async ({ page }) => {
  // "then make the window narrower until": the line breaks after "narrower" at this width.
  const start = await wordRect(page, 'then')
  const end = await wordRect(page, 'until')
  expect(end.y).toBeGreaterThan(start.y)

  await pick(page, 'Highlighter', 'Snap to words')
  await dragWords(page, start, end)

  await expect.poll(async () => (await stored(page)).at(-1)?.type).toBe('mark')
  const shape = (await stored(page)).at(-1)!
  expect(shape.kind).toBe('highlight')
  expect(shape.anchor?.target.quote?.exact).toBe('then make the window narrower until')

  // Two lines here, so two strokes, the first starting at "then".
  const wide = await lastShapePaths(page)
  expect(wide).toHaveLength(2)
  expect(Math.abs(wide[0].x - start.x)).toBeLessThan(6)

  // Stacked, the column is wider and the phrase fits on one line: one stroke.
  await page.setViewportSize(NARROW)
  await expect.poll(async () => (await lastShapePaths(page)).length).toBe(1)
  const moved = await wordRect(page, 'then')
  const narrow = await lastShapePaths(page)
  expect(Math.abs(narrow[0].x - moved.x)).toBeLessThan(6)
  expect(Math.abs(narrow[0].y + narrow[0].height / 2 - (moved.y + moved.height / 2))).toBeLessThan(4)
})

test('an underline sits under its word and follows it', async ({ page }) => {
  const word = await wordRect(page, 'remembers')
  await pick(page, 'Pen', 'Underline')
  await dragWords(page, word, word)

  await expect.poll(async () => (await stored(page)).at(-1)?.kind).toBe('underline')
  expect((await stored(page)).at(-1)!.anchor?.target.quote?.exact).toBe('remembers')

  const [line] = await lastShapePaths(page)
  // Under the word: its centre is below the word's middle, and inside the word's box.
  expect(line.y + line.height / 2).toBeGreaterThan(word.y + word.height / 2)
  expect(line.y).toBeLessThan(word.y + word.height)
  // Within a pen-width or so: perfect-freehand's caps and streamlining add a little at each end.
  expect(Math.abs(line.width - word.width)).toBeLessThan(16)

  await page.setViewportSize(NARROW)
  const moved = await wordRect(page, 'remembers')
  await expect.poll(async () => Math.abs((await lastShapePaths(page))[0].x - moved.x)).toBeLessThan(6)
})

test('the highlighter over a picture is still a highlighter, snapping or not', async ({ page }) => {
  const figure = await page.locator('.lesson-figure').boundingBox()
  await pick(page, 'Highlighter', 'Snap to words')
  await page.mouse.move(figure!.x + 40, figure!.y + 40)
  await page.mouse.down()
  await page.mouse.move(figure!.x + 140, figure!.y + 60, { steps: 6 })
  await page.mouse.up()

  await expect.poll(async () => (await stored(page)).at(-1)?.type).toBe('stroke')
})

test('a mark can be restyled and deleted but not dragged', async ({ page }) => {
  const word = await wordRect(page, 'picture')
  await pick(page, 'Pen', 'Strikethrough')
  await dragWords(page, word, word)
  await expect.poll(async () => (await stored(page)).at(-1)?.type).toBe('mark')
  const before = (await lastShapePaths(page))[0]

  await page.getByRole('button', { name: 'Select', exact: true }).click()
  await page.mouse.click(before.x + before.width / 2, before.y + before.height / 2)
  await expect(page.getByRole('button', { name: 'Delete shape' })).toBeVisible()

  // Dragging it goes nowhere.
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
  await page.mouse.down()
  await page.mouse.move(before.x + 200, before.y + 120, { steps: 6 })
  await page.mouse.up()
  const after = (await lastShapePaths(page))[0]
  expect(Math.abs(after.x - before.x)).toBeLessThan(2)

  await page.getByRole('button', { name: 'Delete shape' }).click()
  await expect.poll(async () => (await stored(page)).filter((shape) => shape.type === 'mark').length).toBe(0)
})

test('without the option, the highlighter over words is plain ink', async ({ page }) => {
  const start = await wordRect(page, 'then')
  const end = await wordRect(page, 'window')
  await pick(page, 'Highlighter', null)
  await dragWords(page, start, end)

  await expect.poll(async () => (await stored(page)).at(-1)?.type).toBe('stroke')
})
