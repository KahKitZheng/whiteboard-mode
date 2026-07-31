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
