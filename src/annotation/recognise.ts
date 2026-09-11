import type { Point } from './coords'
import { quadratic } from './geometry'
import type { Heads } from './types'

/*
  What a rough stroke was meant to be, if it was meant to be one of a few
  things. Geometry only — no learning, no library: the shapes are so few and so
  different that a handful of measurements tells them apart. See ADR 0009.
*/

export type Recognised = {
  type: 'rect' | 'ellipse' | 'line'
  from: Point
  to: Point
  heads?: Heads
  bend?: Point
}

/** Fewer points than this is a tap or a tick, not a shape. */
const MIN_POINTS = 8
/** Smaller than this, in reference units, and there is nothing to recognise. */
const MIN_SIZE = 24
/** How many points the stroke is resampled to before measuring it. */
const SAMPLES = 64
/** Start and end this close together, as a fraction of the diagonal, is closed. */
const CLOSED = 0.22
/** A turn sharper than this, in radians, is a corner. */
const CORNER = Math.PI / 4
/** A line may stray this far from its chord, as a fraction of the chord. */
const STRAIGHT = 0.07
/** A curve may stray this far from the one-bend curve fitted through it. */
const CURVED = 0.06
/** How finely the fitted curve is sampled when measuring the stray. */
const CURVE_SAMPLES = 48
/** An arrowhead's stroke length, as a fraction of the shaft. */
const HEAD_MIN = 0.08
const HEAD_MAX = 0.6
/** Sides this close in length become equal — a circle, a square. */
const REGULAR = 0.12
/** A line this close to level or upright, in radians, becomes exactly so. */
const AXIS = Math.PI / 30

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function pathLength(points: Point[]): number {
  let total = 0
  for (let index = 1; index < points.length; index += 1) total += distance(points[index - 1], points[index])
  return total
}

function box(points: Point[]) {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

/** The same path as `count` points an equal distance apart along it. */
export function resample(points: Point[], count: number): Point[] {
  const step = pathLength(points) / (count - 1)
  if (step === 0) return points.slice(0, 1)
  const out: Point[] = [points[0]]
  let carried = 0

  for (let index = 1; index < points.length; index += 1) {
    let from = points[index - 1]
    const to = points[index]
    let segment = distance(from, to)
    while (carried + segment >= step && out.length < count) {
      const along = (step - carried) / segment
      const next = { x: from.x + (to.x - from.x) * along, y: from.y + (to.y - from.y) * along }
      out.push(next)
      from = next
      segment = distance(from, to)
      carried = 0
    }
    carried += segment
  }

  while (out.length < count) out.push(points[points.length - 1])
  return out
}

/** How far the stroke strays from the straight line between its ends, as a fraction of that line. */
function deviation(points: Point[]): number {
  const from = points[0]
  const to = points[points.length - 1]
  const chord = distance(from, to)
  if (chord === 0) return Infinity
  let worst = 0
  for (const point of points) {
    const cross = Math.abs((to.x - from.x) * (from.y - point.y) - (from.x - point.x) * (to.y - from.y))
    worst = Math.max(worst, cross / chord)
  }
  return worst / chord
}

/**
 * The one-bend curve through a stroke's middle, if the stroke stays close to
 * it. An S stays ink: one bend cannot follow it, and a curve with two is a
 * squiggle more often than a shape.
 */
function bendOf(points: Point[]): Point | null {
  const from = points[0]
  const to = points[points.length - 1]
  const chord = distance(from, to)
  if (chord === 0) return null
  const middle = points[Math.floor(points.length / 2)]
  const bend = { x: 2 * middle.x - (from.x + to.x) / 2, y: 2 * middle.y - (from.y + to.y) / 2 }

  const curve = Array.from({ length: CURVE_SAMPLES + 1 }, (_, step) => quadratic(from, bend, to, step / CURVE_SAMPLES))
  let worst = 0
  for (const point of points) {
    worst = Math.max(worst, Math.min(...curve.map((sample) => distance(point, sample))))
  }
  return worst / chord <= CURVED ? bend : null
}

/** Sharp turns along the path — runs of them count once, since a rounded corner spans a few samples. */
function corners(points: Point[]): number {
  let count = 0
  let inCorner = false
  for (let index = 2; index < points.length; index += 1) {
    const a = points[index - 2]
    const b = points[index - 1]
    const c = points[index]
    const turn = Math.abs(
      Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x),
    )
    const sharp = Math.min(turn, Math.PI * 2 - turn) > CORNER
    if (sharp && !inCorner) count += 1
    inCorner = sharp
  }
  return count
}

/** The area the closed path encloses, as a fraction of its box. Round fills ~0.79, square ~1. */
function fill(points: Point[], area: number): number {
  let twice = 0
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index]
    const b = points[(index + 1) % points.length]
    twice += a.x * b.y - b.x * a.y
  }
  return area === 0 ? 0 : Math.abs(twice) / 2 / area
}

/** Nearly a circle or a square becomes exactly one, centred where it was. */
function regularise(minX: number, minY: number, width: number, height: number): { from: Point; to: Point } {
  if (Math.abs(width - height) / Math.max(width, height) > REGULAR) {
    return { from: { x: minX, y: minY }, to: { x: minX + width, y: minY + height } }
  }
  const side = (width + height) / 2
  const cx = minX + width / 2
  const cy = minY + height / 2
  return { from: { x: cx - side / 2, y: cy - side / 2 }, to: { x: cx + side / 2, y: cy + side / 2 } }
}

/** A line within a few degrees of level or upright becomes exactly so, pivoting on its start. */
function straighten(from: Point, to: Point): Point {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const length = distance(from, to)
  const level = Math.abs(Math.sin(angle)) < Math.sin(AXIS)
  const upright = Math.abs(Math.cos(angle)) < Math.sin(AXIS)
  if (level) return { x: from.x + Math.sign(Math.cos(angle)) * length, y: from.y }
  if (upright) return { x: from.x, y: from.y + Math.sign(Math.sin(angle)) * length }
  return to
}

export function recognise(points: Point[]): Recognised | null {
  if (points.length < MIN_POINTS) return null
  const bounds = box(points)
  const diagonal = Math.hypot(bounds.width, bounds.height)
  if (diagonal < MIN_SIZE) return null

  const path = resample(points, SAMPLES)

  if (distance(path[0], path[path.length - 1]) < diagonal * CLOSED && pathLength(path) > diagonal * 1.5) {
    const turns = corners(path)
    const filled = fill(path, bounds.width * bounds.height)
    const { from, to } = regularise(bounds.minX, bounds.minY, bounds.width, bounds.height)
    if (turns >= 3 && filled > 0.78) return { type: 'rect', from, to }
    if (turns <= 1 && filled > 0.55 && filled < 0.92) return { type: 'ellipse', from, to }
    return null
  }

  // Open: a line, or a line with a head on it. The tip is where the stroke
  // first gets as far from the start as it ever does — *first*, because an
  // arrowhead passes back through the tip and the shaft must end at the first
  // pass. What follows the tip is either nothing or the head.
  const start = path[0]
  const farthest = Math.max(...path.map((point) => distance(start, point)))
  let tip = path.findIndex((point) => distance(start, point) >= farthest * 0.985)
  while (tip + 1 < path.length && distance(start, path[tip + 1]) > distance(start, path[tip])) tip += 1
  const shaft = path.slice(0, tip + 1)
  const head = path.slice(tip)
  const shaftLength = distance(start, path[tip])
  if (shaft.length < 3) return null

  // Straight, or one clean bend; anything else is ink.
  const straight = deviation(shaft) <= STRAIGHT
  const bend = straight ? undefined : bendOf(shaft)
  if (!straight && !bend) return null

  const headLength = pathLength(head)
  const headStaysNear = head.every((point) => distance(point, path[tip]) < shaftLength * 0.45)
  if (!headStaysNear || headLength > shaftLength * HEAD_MAX) return null

  const to = straight ? straighten(start, path[tip]) : path[tip]
  const heads: Heads = headLength < shaftLength * HEAD_MIN ? 'none' : 'end'
  return { type: 'line', from: start, to, heads, ...(bend ? { bend } : {}) }
}
