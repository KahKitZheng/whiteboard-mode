import type { Point } from './coords'
import type { Shape } from './types'

/**
 * Everything that needs to reason about *where* a shape is — hit-testing,
 * rescaling — goes through these two, so neither has to know the shape types.
 * That is what keeps adding a shape type to a render branch and this file.
 */

const ELLIPSE_STEPS = 24

/** Rough width of a character relative to the font size. */
const CHARACTER_WIDTH = 0.55

export const TEXT_SIZE = 28

/** A polyline that approximates the shape's outline, for hit-testing. */
export function outline(shape: Shape): Point[] {
  switch (shape.type) {
    case 'stroke':
      return shape.points

    case 'line':
    case 'arrow':
      return [shape.from, shape.to]

    case 'rect': {
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
      // Close enough to tap: the box the glyphs occupy, sitting on the baseline.
      const width = shape.text.length * TEXT_SIZE * CHARACTER_WIDTH
      const top = shape.at.y - TEXT_SIZE
      const corners = [
        { x: shape.at.x, y: top },
        { x: shape.at.x + width, y: top },
        { x: shape.at.x + width, y: shape.at.y },
        { x: shape.at.x, y: shape.at.y },
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

export function translate(shape: Shape, dx: number, dy: number): Shape {
  return mapPoints(shape, (point) => ({ x: point.x + dx, y: point.y + dy }))
}

export function scaleAbout(shape: Shape, anchor: Point, fx: number, fy: number): Shape {
  return mapPoints(shape, (point) => ({
    x: anchor.x + (point.x - anchor.x) * fx,
    y: anchor.y + (point.y - anchor.y) * fy,
  }))
}
