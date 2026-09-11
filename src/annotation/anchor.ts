import { scaleFor, type Point } from './coords'
import { bounds, mapPoints } from './geometry'
import type { LineBox, Mark, Shape } from './types'

/*
  A shape is about something on the page — a word, a picture, a paragraph —
  and should stay on it when the page reflows. So a shape remembers what was
  under it when it was made, and where that was; rendering finds the thing
  again and moves the shape by however far it went.
  See docs/adr/0007-shapes-anchor-to-host-content.md.
*/

/** The words a shape was drawn over, with enough context to find them again. */
export type Quote = { exact: string; prefix: string; suffix: string }

/** How the host element under a shape is found again. */
export type Target = {
  /** A CSS path from the surface element — or from the nearest id'd ancestor. */
  path: string
  /** The start of its text, to reject a different element that took its place. */
  snippet: string
  quote?: Quote
}

export type Anchor = {
  target: Target
  /** The target's top-left when the shape was made, reference units. */
  origin: Point
  /**
   * What the shape scales with. Text does not grow when its column does, so
   * a shape over text follows the font size; a picture's contents grow with
   * its box, so a shape over one follows the width. Pixels at creation.
   */
  basis: { kind: 'font' | 'width'; value: number }
  /**
   * The surface's box width when the shape was made. Reference coordinates
   * scale with the surface, but a word does not grow when the page does — so
   * placement undoes the surface's scale and applies the target's instead.
   */
  surfaceWidth: number
}

/** The surface a shape lives in: its element, and its box width in pixels. */
export type Frame = { surface: HTMLElement; width: number }

/** Where an anchor's target is now, and how much bigger it is than it was. */
export type Resolved = { origin: Point; scale: number }

const LAYER = '.annotation-layer'
const SURFACE = '.annotation-surface'
const CONTEXT = 32
const SNIPPET = 40
/** A shape over most of a block is about the block, not about its words. */
const WHOLE_BLOCK = 0.5
/** Content whose inside scales with its box. */
const REPLACED = new Set(['IMG', 'SVG', 'VIDEO', 'CANVAS', 'PICTURE', 'IFRAME', 'OBJECT'])

type Box = { left: number; top: number; right: number; bottom: number }

function escape(value: string): string {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(value) : value.replace(/[^\w-]/g, '\\$&')
}

function toRef(frame: Frame, clientX: number, clientY: number): Point {
  const rect = frame.surface.getBoundingClientRect()
  const scale = scaleFor(frame.width)
  return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale }
}

function toClient(frame: Frame, point: Point): Point {
  const rect = frame.surface.getBoundingClientRect()
  const scale = scaleFor(frame.width)
  return { x: rect.left + point.x * scale, y: rect.top + point.y * scale }
}

function screenBox(shape: Shape, frame: Frame): Box {
  const box = bounds(shape)
  const min = toClient(frame, { x: box.minX, y: box.minY })
  const max = toClient(frame, { x: box.maxX, y: box.maxY })
  return { left: min.x, top: min.y, right: max.x, bottom: max.y }
}

/** How much of `word` the box covers, on each axis, as a fraction of the word. */
function coverage(box: Box, word: DOMRect): { x: number; y: number } {
  if (word.width === 0 || word.height === 0) return { x: 0, y: 0 }
  const x = Math.max(0, Math.min(box.right, word.right) - Math.max(box.left, word.left)) / word.width
  const y = Math.max(0, Math.min(box.bottom, word.bottom) - Math.max(box.top, word.top)) / word.height
  return { x, y }
}

/*
  A word is under a shape when the shape covers a good part of it — not when
  a circle's edge grazes the line below, which is what any-overlap did. The
  reach goes up, not down: an underline sits under its word.
*/
const COVER_X = 0.3
const COVER_Y = 0.5
const REACH_UP = 0.8
const REACH_SIDE = 0.3

// ---- finding what is under a shape ----------------------------------------

/** Host content of this surface: not the layer, not another surface's. */
function isHostContent(frame: Frame, element: Element): boolean {
  if (element === frame.surface || !frame.surface.contains(element)) return false
  return !element.closest(LAYER) && element.closest(SURFACE) === frame.surface
}

/**
 * Hit-testing by geometry, for when `elementFromPoint` cannot answer: the
 * point is outside the viewport — a shape below the fold being adopted at
 * load — or something else is painted over it, like the toolbar.
 */
function deepestElementAt(frame: Frame, x: number, y: number): Element | null {
  let best: Element | null = null
  let bestDepth = -1

  for (const element of frame.surface.querySelectorAll('*')) {
    if (!isHostContent(frame, element)) continue
    const rect = element.getBoundingClientRect()
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue

    let depth = 0
    for (let node = element.parentElement; node && node !== frame.surface; node = node.parentElement) depth += 1
    if (depth > bestDepth) {
      best = element
      bestDepth = depth
    }
  }

  return best
}

/** The host element at a client point. */
function hostElementAt(frame: Frame, x: number, y: number): Element | null {
  const hit = document.elementFromPoint(x, y)
  if (hit && isHostContent(frame, hit)) return hit
  return deepestElementAt(frame, x, y)
}

/** The element under a box — its centre first, then the middle of each edge. */
function hostElementUnder(frame: Frame, box: Box): Element | null {
  const cx = (box.left + box.right) / 2
  const cy = (box.top + box.bottom) / 2
  const probes: [number, number][] = [
    [cx, cy],
    [cx, box.top],
    [cx, box.bottom],
    [box.left, cy],
    [box.right, cy],
  ]
  for (const [x, y] of probes) {
    const hit = hostElementAt(frame, x, y)
    if (hit) return hit
  }
  return null
}

/** Up from a hit to the thing worth anchoring to: a picture, or the block around the text. */
function blockAround(hit: Element, surface: HTMLElement): Element | null {
  let node: Element | null = hit
  while (node && node !== surface) {
    if (REPLACED.has(node.tagName.toUpperCase())) return node
    const display = getComputedStyle(node).display
    if (!display.startsWith('inline') && display !== 'contents') return node
    node = node.parentElement
  }
  return null
}

// ---- naming an element so it can be found again ---------------------------

/**
 * A `>` path of `tag:nth-of-type` steps from the surface down — or from the
 * nearest ancestor with an id, which survives the host reordering things.
 */
export function pathTo(root: Element, element: Element): string | null {
  const steps: string[] = []
  let node: Element | null = element

  while (node && node !== root) {
    if (node.id) return [`#${escape(node.id)}`, ...steps].join(' > ')

    const parent: Element | null = node.parentElement
    if (!parent) return null
    const tag = node.tagName.toLowerCase()
    const siblings = Array.from(parent.children).filter((child) => child.tagName === node!.tagName)
    steps.unshift(`${tag}:nth-of-type(${siblings.indexOf(node) + 1})`)
    node = parent
  }

  return node === root ? [':scope', ...steps].join(' > ') : null
}

export function elementAt(root: Element, path: string): Element | null {
  try {
    return root.querySelector(path)
  } catch {
    return null
  }
}

function snippetOf(element: Element): string {
  return (element.textContent ?? '').trim().slice(0, SNIPPET)
}

// ---- text: words under a shape, and finding them again --------------------

type Span = { node: Text; start: number }

/** An element's text as one string, remembering where each node's share begins. */
function textOf(root: Node): { text: string; spans: Span[] } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest(LAYER) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  })
  const spans: Span[] = []
  let text = ''
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    spans.push({ node: node as Text, start: text.length })
    text += (node as Text).data
  }
  return { text, spans }
}

function positionOf(spans: Span[], offset: number, end: boolean): [Text, number] | null {
  for (let index = spans.length - 1; index >= 0; index -= 1) {
    const span = spans[index]
    const within = offset - span.start
    // An end offset at a node boundary belongs to the earlier node.
    if (within > 0 || (within === 0 && (!end || index === 0))) {
      return [span.node, Math.min(within, span.node.data.length)]
    }
  }
  return null
}

function rangeOf(spans: Span[], start: number, end: number): Range | null {
  const from = positionOf(spans, start, false)
  const to = positionOf(spans, end, true)
  if (!from || !to) return null
  const range = document.createRange()
  range.setStart(from[0], from[1])
  range.setEnd(to[0], to[1])
  return range
}

function offsetOf(spans: Span[], node: Node, offset: number): number | null {
  const span = spans.find((candidate) => candidate.node === node)
  return span ? span.start + offset : null
}

/** A range described by its words and the words around them. */
export function describeQuote(root: Node, range: Range): Quote | null {
  const { text, spans } = textOf(root)
  const start = offsetOf(spans, range.startContainer, range.startOffset)
  const end = offsetOf(spans, range.endContainer, range.endOffset)
  if (start === null || end === null || end <= start) return null

  return {
    exact: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(end, end + CONTEXT),
  }
}

/** The range a quote describes — with its context if it can be, without if it must. */
export function findQuote(root: Node, quote: Quote): Range | null {
  const { text, spans } = textOf(root)

  const withContext = text.indexOf(quote.prefix + quote.exact + quote.suffix)
  const start = withContext !== -1 ? withContext + quote.prefix.length : text.indexOf(quote.exact)
  if (start === -1 || quote.exact.length === 0) return null

  return rangeOf(spans, start, start + quote.exact.length)
}

/**
 * The words a box covers, first to last, or null when it covers none. A
 * shape's box has to cover a good part of a word; a point — the end of a line
 * or an arrow — only has to touch one.
 */
function wordsUnder(element: Element, box: Box, fontSize: number, how: 'cover' | 'touch'): Range | null {
  // A stroke reaches up, since an underline sits under its word. A point is
  // exactly where it is — reaching up from the first word of a line would
  // catch the word above it.
  const reach: Box =
    how === 'cover'
      ? {
          left: box.left - fontSize * REACH_SIDE,
          right: box.right + fontSize * REACH_SIDE,
          top: box.top - fontSize * REACH_UP,
          bottom: box.bottom,
        }
      : box
  const { spans } = textOf(element)
  let first: [Text, number] | null = null
  let last: [Text, number] | null = null

  for (const { node } of spans) {
    for (const match of node.data.matchAll(/\S+/g)) {
      const range = document.createRange()
      range.setStart(node, match.index)
      range.setEnd(node, match.index + match[0].length)
      const covered = coverage(reach, range.getBoundingClientRect())
      if (how === 'cover' ? covered.x < COVER_X || covered.y < COVER_Y : covered.x === 0 || covered.y === 0) continue
      first ??= [node, match.index]
      last = [node, match.index + match[0].length]
    }
  }

  if (!first || !last) return null
  const range = document.createRange()
  range.setStart(...first)
  range.setEnd(...last)
  return range
}

// ---- anchoring and placing -------------------------------------------------

function fontSizeOf(element: Element): number {
  return parseFloat(getComputedStyle(element).fontSize) || 16
}

function firstRect(range: Range): DOMRect {
  return range.getClientRects()[0] ?? range.getBoundingClientRect()
}

/** What to anchor a box to, if anything: the words under it, else the block or picture. */
function anchorUnder(frame: Frame, box: Box, how: 'cover' | 'touch' = 'cover'): Anchor | null {
  const hit = hostElementUnder(frame, box)
  const element = hit && blockAround(hit, frame.surface)
  if (!element) return null

  const path = pathTo(frame.surface, element)
  if (!path) return null
  const target: Target = { path, snippet: snippetOf(element) }

  if (REPLACED.has(element.tagName.toUpperCase())) {
    const rect = element.getBoundingClientRect()
    return {
      target,
      origin: toRef(frame, rect.left, rect.top),
      basis: { kind: 'width', value: rect.width },
      surfaceWidth: frame.width,
    }
  }

  const fontSize = fontSizeOf(element)
  const words = wordsUnder(element, box, fontSize, how)
  const total = textOf(element).text.length
  if (words && words.toString().length < total * WHOLE_BLOCK) {
    const quote = describeQuote(element, words)
    if (quote) {
      const rect = firstRect(words)
      return {
        target: { ...target, quote },
        origin: toRef(frame, rect.left, rect.top),
        basis: { kind: 'font', value: fontSize },
        surfaceWidth: frame.width,
      }
    }
  }

  const rect = element.getBoundingClientRect()
  return {
    target,
    origin: toRef(frame, rect.left, rect.top),
    basis: { kind: 'font', value: fontSize },
    surfaceWidth: frame.width,
  }
}

/** The anchor's element, if it is still there and still the same thing. */
function resolveElement(anchor: Anchor, frame: Frame): Element | null {
  const element = elementAt(frame.surface, anchor.target.path)
  if (!element) return null
  if (anchor.target.snippet && !snippetOf(element).startsWith(anchor.target.snippet.slice(0, 12))) return null
  return element
}

/** The words an anchor names, where they are now. */
export function resolveRange(anchor: Anchor, frame: Frame): Range | null {
  if (!anchor.target.quote) return null
  const element = resolveElement(anchor, frame)
  return element && findQuote(element, anchor.target.quote)
}

/**
 * Where an anchor's target is now — or null, when it is gone or is something
 * else. `scale` is in reference units: how much the target grew, with the
 * surface's own scaling taken back out.
 */
export function resolveAnchor(anchor: Anchor, frame: Frame): Resolved | null {
  const element = resolveElement(anchor, frame)
  if (!element) return null

  const grew = (now: number) => (anchor.basis.value > 0 ? now / anchor.basis.value : 1)
  const scale = (now: number) => grew(now) * (frame.width > 0 ? anchor.surfaceWidth / frame.width : 1)

  if (anchor.target.quote) {
    const range = findQuote(element, anchor.target.quote)
    if (!range) return null
    const rect = firstRect(range)
    return { origin: toRef(frame, rect.left, rect.top), scale: scale(fontSizeOf(element)) }
  }

  const rect = element.getBoundingClientRect()
  return {
    origin: toRef(frame, rect.left, rect.top),
    scale: scale(anchor.basis.kind === 'width' ? rect.width : fontSizeOf(element)),
  }
}

/** Moves a point the way its anchor's target moved: along with it, and scaled about it. */
export function follow(anchor: Anchor, now: Resolved): (point: Point) => Point {
  return (point) => ({
    x: now.origin.x + (point.x - anchor.origin.x) * now.scale,
    y: now.origin.y + (point.y - anchor.origin.y) * now.scale,
  })
}

/** The shape without its anchors — its geometry read as plain surface coordinates. */
export function unanchored(shape: Shape): Shape {
  // A mark *is* its anchor; there is nothing to read without it.
  if (shape.type === 'mark') return shape
  const { anchor: _anchor, toAnchor: _toAnchor, ...rest } = shape as Shape & { toAnchor?: Anchor }
  return rest as Shape
}

/**
 * A shape remembering what is under it. A line or arrow remembers each end
 * separately, so one drawn from a word to a picture keeps pointing at both.
 */
export function anchorShape(shape: Shape, frame: Frame): Shape {
  if (shape.type === 'mark') return shape
  const bare = unanchored(shape)

  if (bare.type === 'line' || bare.type === 'arrow') {
    const reach = 4
    const around = (point: Point): Box => {
      const at = toClient(frame, point)
      return { left: at.x - reach, right: at.x + reach, top: at.y - reach, bottom: at.y + reach }
    }
    const from = anchorUnder(frame, around(bare.from), 'touch')
    const to = anchorUnder(frame, around(bare.to), 'touch')
    return { ...bare, anchor: from ?? to ?? undefined, toAnchor: from && to ? to : undefined }
  }

  const anchor = anchorUnder(frame, screenBox(bare, frame))
  return anchor ? { ...bare, anchor } : bare
}

/** The shape where its anchor's target is now. Unanchored, or with the target gone, it stays put. */
export function placeShape(shape: Shape, frame: Frame): Shape {
  if (shape.type === 'mark') {
    const range = resolveRange(shape.anchor, frame)
    return range ? { ...shape, boxes: lineBoxes(range, frame) } : shape
  }
  if (!shape.anchor) return shape
  const now = resolveAnchor(shape.anchor, frame)
  if (!now) return shape
  const move = follow(shape.anchor, now)

  if ((shape.type === 'line' || shape.type === 'arrow') && shape.toAnchor) {
    const toNow = resolveAnchor(shape.toAnchor, frame)
    const moveTo = toNow ? follow(shape.toAnchor, toNow) : move
    return { ...shape, from: move(shape.from), to: moveTo(shape.to), weight: shape.weight * now.scale }
  }

  // Size and weight follow too, so the ink stays in proportion to what it marks.
  const moved = mapPoints(shape, move)
  if (moved.type === 'text') return { ...moved, size: moved.size * now.scale }
  if (moved.type === 'timer') return moved
  return { ...moved, weight: moved.weight * now.scale }
}

/** An anchor's origin is in reference units, so a reference-width change moves it too. */
export function rescaleAnchor(anchor: Anchor, factor: number): Anchor {
  return { ...anchor, origin: { x: anchor.origin.x * factor, y: anchor.origin.y * factor } }
}

// ---- marks: the words under a pen, and the lines they occupy ---------------

/** The word under a client point, with the block it is in. Null over anything but text. */
export function wordAt(frame: Frame, x: number, y: number): { block: Element; range: Range } | null {
  const hit = hostElementAt(frame, x, y)
  const block = hit && blockAround(hit, frame.surface)
  if (!block || REPLACED.has(block.tagName.toUpperCase())) return null

  const reach = 2
  const range = wordsUnder(block, { left: x - reach, right: x + reach, top: y - reach, bottom: y + reach }, fontSizeOf(block), 'touch')
  return range ? { block, range } : null
}

/** The words from the earlier of two ranges to the later — a drag may go either way. */
export function wordsBetween(a: Range, b: Range): Range {
  const range = document.createRange()
  const first = a.compareBoundaryPoints(Range.START_TO_START, b) <= 0 ? a : b
  const last = a.compareBoundaryPoints(Range.END_TO_END, b) >= 0 ? a : b
  range.setStart(first.startContainer, first.startOffset)
  range.setEnd(last.endContainer, last.endOffset)
  return range
}

type Edges = { left: number; top: number; right: number; bottom: number }

/**
 * `getClientRects` gives one box per text node per line — a phrase through an
 * <em> is three boxes on one line. Merge whatever shares a line into one.
 */
export function mergeLines(rects: Edges[]): Edges[] {
  const lines: Edges[] = []
  // Copied field by field: a DOMRect's edges are prototype getters, and
  // spreading one gives an empty object.
  const edges = rects.map((rect) => ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }))
  for (const rect of edges.sort((a, b) => a.top - b.top || a.left - b.left)) {
    if (rect.right <= rect.left || rect.bottom <= rect.top) continue
    const line = lines[lines.length - 1]
    const overlap = line ? Math.min(line.bottom, rect.bottom) - Math.max(line.top, rect.top) : 0
    const shorter = line ? Math.min(line.bottom - line.top, rect.bottom - rect.top) : 0
    if (line && overlap >= shorter * 0.5) {
      line.left = Math.min(line.left, rect.left)
      line.right = Math.max(line.right, rect.right)
      line.top = Math.min(line.top, rect.top)
      line.bottom = Math.max(line.bottom, rect.bottom)
    } else {
      lines.push({ ...rect })
    }
  }
  return lines
}

/** One box per line the words occupy, in the surface's reference units. */
export function lineBoxes(range: Range, frame: Frame): LineBox[] {
  const scale = scaleFor(frame.width)
  return mergeLines(Array.from(range.getClientRects())).map((line) => {
    const at = toRef(frame, line.left, line.top)
    return { x: at.x, y: at.y, width: (line.right - line.left) / scale, height: (line.bottom - line.top) / scale }
  })
}

/** A mark over these words, as it should be stored. Null if the block cannot be named. */
export function markOver(
  frame: Frame,
  block: Element,
  range: Range,
  mark: Pick<Mark, 'id' | 'kind' | 'color' | 'weight' | 'opacity'>,
): Mark | null {
  const path = pathTo(frame.surface, block)
  const quote = describeQuote(block, range)
  if (!path || !quote) return null
  const rect = firstRect(range)
  return {
    ...mark,
    type: 'mark',
    anchor: {
      target: { path, snippet: snippetOf(block), quote },
      origin: toRef(frame, rect.left, rect.top),
      basis: { kind: 'font', value: fontSizeOf(block) },
      surfaceWidth: frame.width,
    },
    boxes: lineBoxes(range, frame),
  }
}
