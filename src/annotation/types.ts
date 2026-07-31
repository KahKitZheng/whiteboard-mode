import type { Point } from './coords'

/** All coordinates below are reference space, not screen pixels. */

/** A shape produced by freehand drawing, stored as its captured input points. */
export type Stroke = {
  id: string
  type: 'stroke'
  points: Point[]
}

/**
 * A shape with a fixed geometric form, placed by dragging from one corner to
 * the other. They share a shape so that adding another costs a render branch
 * and nothing else.
 */
export type Primitive = {
  id: string
  type: 'rect' | 'ellipse' | 'line' | 'arrow'
  from: Point
  to: Point
}

export type Text = {
  id: string
  type: 'text'
  at: Point
  text: string
}

/**
 * A shape whose rendering is interactive rather than static. It carries the
 * same dragged box as a primitive, which is the whole point: everything that
 * reasons about *where* a shape is already handles it.
 */
export type Widget = {
  id: string
  type: 'timer'
  from: Point
  to: Point
}

export type Shape = Stroke | Primitive | Text | Widget

export type ShapeType = Shape['type']
