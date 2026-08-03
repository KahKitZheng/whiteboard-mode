import type { Point } from './coords'

/** All coordinates and widths below are reference space, not screen pixels. */

/** Shared by everything that is drawn with ink. */
type Inked = {
  color: string
  /** Full stroke width, so a pen stroke and a border of the same number match. */
  weight: number
}

/** A shape produced by freehand drawing, stored as its captured input points. */
export type Stroke = Inked & {
  id: string
  type: 'stroke'
  points: Point[]
}

/**
 * A shape with a fixed geometric form, placed by dragging from one corner to
 * the other. They share a shape so that adding another costs a render branch
 * and nothing else.
 */
export type Primitive = Inked & {
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
  /** Cap height in reference space. Without it, text could only be moved. */
  size: number
  color: string
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
