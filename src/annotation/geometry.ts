import type { Point } from './coords'
import type { Shape } from './types'

/**
 * Everything that needs to reason about *where* a shape is — hit-testing,
 * rescaling — goes through these two, so neither has to know the shape types.
 * That is what keeps adding a shape type to a render branch and this file.
 */

const ELLIPSE_STEPS = 24

/** Only used where the browser can't be asked — see `textBox`. */
const CHARACTER_WIDTH = 0.55
const ESTIMATED_ASCENT = 0.75
const ESTIMATED_DESCENT = 0.2

/** Breathing room between the glyphs and the box drawn around them. */
const TEXT_PADDING = 0.12

/** Must match what `.annotation-layer text` actually renders with. */
const TEXT_FONT = "system-ui, 'Segoe UI', Roboto, sans-serif"

export const TEXT_SIZE = 28

let measurer: CanvasRenderingContext2D | null | undefined

/**
 * The box a string actually occupies. Estimating it from character count was
 * wildly off — a selection rectangle around "test" ran far past the final
 * letter, and sat above the glyphs rather than around them. The browser knows
 * the real metrics, so ask it.
 */
function textBox(text: string, size: number): { width: number; ascent: number; descent: number } {
  if (measurer === undefined) {
    measurer =
      typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
  }

  if (!measurer) {
    // No DOM (tests, SSR). Proportional to size, so everything stays coherent.
    return {
      width: text.length * size * CHARACTER_WIDTH,
      ascent: size * ESTIMATED_ASCENT,
      descent: size * ESTIMATED_DESCENT,
    }
  }

  measurer.font = `${size}px ${TEXT_FONT}`
  const metrics = measurer.measureText(text)

  return {
    width: metrics.width,
    ascent: metrics.actualBoundingBoxAscent || size * ESTIMATED_ASCENT,
    descent: metrics.actualBoundingBoxDescent || size * ESTIMATED_DESCENT,
  }
}

/** A polyline that approximates the shape's outline, for hit-testing. */
export function outline(shape: Shape): Point[] {
  switch (shape.type) {
    case 'stroke':
      return shape.points

    case 'line':
    case 'arrow':
      return [shape.from, shape.to]

    case 'rect':
    case 'timer': {
      const { from, to } = shape
      return [from, { x: to.x, y: from.y }, to, { x: from.x, y: to.y }, from]
    }

    case 'ellipse': {
      const centre = { x: (shape.from.x + shape.to.x) / 2, y: (shape.from.y + shape.to.y) / 2 }
      const radius = { x: Math.abs(shape.to.x - shape.from.x) / 2, y: Math.abs(shape.to.y - shape.from.y) / 2 }
      return Array.from({ length: ELLIPSE_STEPS + 1 }, (_, step) => {
        const angle = (step / ELLIPSE_STEPS) * Math.PI * 2
        return { x: centre.x + Math.cos(angle) * radius.x, y: centre.y + Math.sin(angle) * radius.y }
      })
    }

    case 'text': {
      // The measured glyph box, sitting on the baseline at `at`, with a little
      // padding so the selection rectangle doesn't crowd the letters.
      const { width, ascent, descent } = textBox(shape.text, shape.size)
      const pad = shape.size * TEXT_PADDING
      const left = shape.at.x - pad
      const right = shape.at.x + width + pad
      const top = shape.at.y - ascent - pad
      const bottom = shape.at.y + descent + pad

      const corners = [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
      ]
      return [...corners, corners[0]]
    }
  }
}

/** Rebuild a shape with every one of its points passed through `move`. */
export function mapPoints(shape: Shape, move: (point: Point) => Point): Shape {
  switch (shape.type) {
    case 'stroke':
      return { ...shape, points: shape.points.map(move) }
    case 'text':
      return { ...shape, at: move(shape.at) }
    default:
      return { ...shape, from: move(shape.from), to: move(shape.to) }
  }
}

export type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

/** The box a shape occupies, in reference space. */
export function bounds(shape: Shape): Bounds {
  const points = outline(shape)
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  }
}

export const CORNERS = ['nw', 'ne', 'se', 'sw'] as const

export type Corner = (typeof CORNERS)[number]

export function cornerPoint(box: Bounds, corner: Corner): Point {
  const west = corner === 'nw' || corner === 'sw'
  const north = corner === 'nw' || corner === 'ne'
  return { x: west ? box.minX : box.maxX, y: north ? box.minY : box.maxY }
}

/** Resizing from a corner holds the opposite one still. */
export function oppositeCorner(box: Bounds, corner: Corner): Point {
  const opposite: Record<Corner, Corner> = { nw: 'se', ne: 'sw', se: 'nw', sw: 'ne' }
  return cornerPoint(box, opposite[corner])
}

/** Half the width of a resize handle, in reference space. */
export const HANDLE_REACH = 14

/** The resize handle under a point, if any. */
export function cornerAt(shape: Shape, point: Point): Corner | null {
  const box = bounds(shape)

  for (const corner of CORNERS) {
    const at = cornerPoint(box, corner)
    if (Math.abs(point.x - at.x) <= HANDLE_REACH && Math.abs(point.y - at.y) <= HANDLE_REACH) {
      return corner
    }
  }
  return null
}

/** Inside a shape's box, handle reach included. */
export function withinBounds(shape: Shape, point: Point): boolean {
  const box = bounds(shape)
  return (
    point.x >= box.minX - HANDLE_REACH &&
    point.x <= box.maxX + HANDLE_REACH &&
    point.y >= box.minY - HANDLE_REACH &&
    point.y <= box.maxY + HANDLE_REACH
  )
}

/**
 * Types whose box has to keep its proportions. A timer lays its face and
 * controls out against its own height, so an arbitrary box renders nonsense —
 * and scaling its axes independently squashes it.
 *
 * This lives here rather than in the widget because it is a fact about the
 * shape's geometry, alongside `outline` and `mapPoints`.
 */
const TIMER_ASPECT = 3 / 2

export function aspectOf(shape: Shape): number | null {
  if (shape.type === 'timer') return TIMER_ASPECT

  // Text's proportions come from its own string. Stretching one axis would
  // either distort the glyphs or leave them adrift in their own box, so a
  // resize scales it whole.
  if (shape.type === 'text') {
    const box = bounds(shape)
    const height = box.maxY - box.minY
    return height > 0 ? (box.maxX - box.minX) / height : null
  }

  return null
}

/** A dragged corner pulled onto the nearest box of the required proportions. */
export function keepAspect(from: Point, to: Point, ratio: number): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  // Follow whichever axis was dragged further, so the box tracks the pointer
  // rather than shrinking to the smaller one.
  const width = Math.max(Math.abs(dx), Math.abs(dy) * ratio)

  return {
    x: from.x + (dx < 0 ? -width : width),
    y: from.y + (dy < 0 ? -width / ratio : width / ratio),
  }
}

/** Two scale factors reduced to one magnitude, keeping each axis's direction. */
export function uniformFactors(fx: number, fy: number): [number, number] {
  const size = Math.max(Math.abs(fx), Math.abs(fy))
  return [fx < 0 ? -size : size, fy < 0 ? -size : size]
}

export function translate(shape: Shape, dx: number, dy: number): Shape {
  return mapPoints(shape, (point) => ({ x: point.x + dx, y: point.y + dy }))
}

export function scaleAbout(shape: Shape, anchor: Point, fx: number, fy: number): Shape {
  const moved = mapPoints(shape, (point) => ({
    x: anchor.x + (point.x - anchor.x) * fx,
    y: anchor.y + (point.y - anchor.y) * fy,
  }))

  // Text is a point and a size, not a span of points. Moving the point alone
  // relocates it without resizing anything, which is what made resizing text
  // look like it did nothing at all.
  if (moved.type !== 'text') return moved

  return { ...moved, size: moved.size * Math.max(Math.abs(fx), Math.abs(fy)) }
}
