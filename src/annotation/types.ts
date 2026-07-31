import type { Point } from './coords'

/** A shape produced by freehand drawing, stored as its captured input points. */
export type Stroke = {
  id: string
  type: 'stroke'
  /** Reference space, not screen pixels. */
  points: Point[]
}

// ponytail: one shape type until #7 adds primitives — the union is what makes
// adding them cheap, so it exists from the start even with a single member.
export type Shape = Stroke
