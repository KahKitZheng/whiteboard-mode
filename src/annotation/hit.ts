import type { Point } from './coords'
import { outline } from './geometry'
import type { Shape } from './types'

/**
 * How far from a stroke's centreline still counts as touching it, in reference
 * space. A stroke renders as a filled outline roughly this wide, and being
 * generous costs nothing — a teacher tapping near a line means that line.
 */
const TOLERANCE = 12

function distanceToSegment(point: Point, from: Point, to: Point): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) return Math.hypot(point.x - from.x, point.y - from.y)

  const along = Math.min(
    1,
    Math.max(0, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared),
  )

  return Math.hypot(point.x - (from.x + along * dx), point.y - (from.y + along * dy))
}

function touches(shape: Shape, point: Point): boolean {
  // Every shape reduces to a polyline for this — see geometry.ts.
  const points = outline(shape)
  if (points.length === 0) return false
  if (points.length === 1) return Math.hypot(point.x - points[0].x, point.y - points[0].y) <= TOLERANCE

  for (let index = 0; index < points.length - 1; index += 1) {
    if (distanceToSegment(point, points[index], points[index + 1]) <= TOLERANCE) return true
  }
  return false
}

/** The topmost shape under a point, or null. Later shapes are drawn on top. */
export function shapeAt(shapes: Shape[], point: Point): Shape | null {
  for (let index = shapes.length - 1; index >= 0; index -= 1) {
    if (touches(shapes[index], point)) return shapes[index]
  }
  return null
}

/** How finely a pointer's path is sampled, in reference space. */
const SAMPLE = 8

/**
 * Every shape the pointer swept over between two positions — not just the ones
 * under its final resting place. A fast drag can jump a long way between
 * events, and skipping a thin line the teacher clearly crossed reads as broken.
 */
export function shapesAlong(shapes: Shape[], from: Point, to: Point): Shape[] {
  const distance = Math.hypot(to.x - from.x, to.y - from.y)
  const steps = Math.max(1, Math.ceil(distance / SAMPLE))
  const swept: Shape[] = []

  // ponytail: samples the path rather than intersecting segment against
  // segment. O(steps × shapes × points) — fine at annotation scale; if a very
  // fast sweep across hundreds of shapes ever stutters, do the real
  // segment-segment test instead.
  for (let step = 0; step <= steps; step += 1) {
    const along = step / steps
    const at = {
      x: from.x + (to.x - from.x) * along,
      y: from.y + (to.y - from.y) * along,
    }

    for (const shape of shapes) {
      if (!swept.includes(shape) && touches(shape, at)) swept.push(shape)
    }
  }

  return swept
}
