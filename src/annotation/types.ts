import type { Anchor } from './anchor'
import type { Point } from './coords'

/** All coordinates and widths below are reference space, not screen pixels. */

/** How a line is drawn. Freehand ink has none of it — a stroke is a filled
 * outline rather than a stroked path, so a dash pattern has nothing to sit on. */
export type BorderStyle = 'solid' | 'dashed' | 'dotted'

/** Only closed shapes have an inside to fill. */
export type FillStyle = 'none' | 'tinted' | 'solid'

/** Which ends of a line carry an arrowhead. */
export type Heads = 'none' | 'end' | 'both'

/**
 * What was under the shape when it was made, so it can follow that when the
 * page reflows. Absent, the shape sits at its coordinates. See anchor.ts.
 */
type Anchored = {
  anchor?: Anchor
}

/** Shared by everything that is drawn with ink. */
type Inked = Anchored & {
  color: string
  /** Full stroke width, so a pen stroke and a border of the same number match. */
  weight: number
  opacity: number
}

/** A shape produced by freehand drawing, stored as its captured input points. */
export type Stroke = Inked & {
  id: string
  type: 'stroke'
  points: Point[]
  /**
   * Ink laid over the words rather than beside them: broad, and see-through
   * enough that the lesson text still reads underneath. A flag on a stroke
   * rather than a type of its own, because a highlight is drawn, moved, erased
   * and scaled exactly like any other freehand mark.
   */
  highlight?: boolean
}

/**
 * A shape with a fixed geometric form, placed by dragging from one corner to
 * the other. They share a shape so that adding another costs a render branch
 * and nothing else.
 */
export type Primitive = Inked & {
  id: string
  type: 'rect' | 'ellipse' | 'line'
  from: Point
  to: Point
  /** A line may hold on to two things: `anchor` is `from`'s, this is `to`'s. */
  toAnchor?: Anchor
  border: BorderStyle
  /** Closed shapes only — a line has no inside. */
  fill?: FillStyle
  /** Lines only. An arrow is a line with a head; a curve is a line with a bend. */
  heads?: Heads
  /** The control point of a quadratic curve. Absent, the line is straight. */
  bend?: Point
}

export type Text = Anchored & {
  id: string
  type: 'text'
  at: Point
  text: string
  /** Cap height in reference space. Without it, text could only be moved. */
  size: number
  color: string
  opacity: number
}

/**
 * A shape whose rendering is interactive rather than static. It carries the
 * same dragged box as a primitive, which is the whole point: everything that
 * reasons about *where* a shape is already handles it.
 */
export type Widget = Anchored & {
  id: string
  type: 'timer'
  from: Point
  to: Point
  opacity: number
}

/** One line of the words a mark covers, reference units. */
export type LineBox = { x: number; y: number; width: number; height: number }

/**
 * A highlight or underline stored as the words it covers, not as ink. It is
 * drawn from wherever those words are on every layout, so wrapping costs it
 * nothing — the way a rich-text editor's marks survive reflow. Always
 * anchored: without its words it is nothing. See ADR 0008.
 */
export type Mark = {
  id: string
  type: 'mark'
  kind: 'highlight' | 'underline' | 'strikethrough'
  anchor: Anchor
  /** Where the words were last seen — what is drawn, and the fallback when they are gone. */
  boxes: LineBox[]
  color: string
  weight: number
  opacity: number
}

export type Shape = Stroke | Primitive | Text | Widget | Mark

export type ShapeType = Shape['type']
