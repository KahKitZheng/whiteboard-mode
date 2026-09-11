import { describe, expect, it } from 'vitest'
import {
  aspectOf,
  bounds,
  cornerAt,
  cornerPoint,
  mapPoints,
  oppositeCorner,
  keepAspect,
  outline,
  scaleAbout,
  translate,
  uniformFactors,
  withinBounds,
} from './geometry'
import { shapeAt } from './hit'
import type { Shape, Text } from './types'

/** Every inked fixture looks the same; only its geometry is under test. */
const INK = { color: '#e5484d', weight: 9, opacity: 1, border: 'solid' } as const

const rect: Shape = {
  id: 'r',
  type: 'rect',
  from: { x: 100, y: 100 },
  to: { x: 300, y: 200 },
  ...INK,
}
const ellipse: Shape = {
  id: 'e',
  type: 'ellipse',
  from: { x: 0, y: 0 },
  to: { x: 200, y: 100 },
  ...INK,
}
const arrow: Shape = {
  id: 'a',
  type: 'line',
  heads: 'end',
  from: { x: 0, y: 0 },
  to: { x: 100, y: 0 },
  ...INK,
}
const text: Text = {
  id: 't',
  type: 'text',
  at: { x: 50, y: 50 },
  text: 'hello',
  size: 28,
  color: '#e5484d',
  opacity: 1,
}

describe('outline', () => {
  it('closes a rectangle back on its first corner', () => {
    const points = outline(rect)

    expect(points).toHaveLength(5)
    expect(points[0]).toEqual(points[4])
  })

  it('traces an ellipse through its extremes', () => {
    const points = outline(ellipse)
    const xs = points.map((point) => point.x)
    const ys = points.map((point) => point.y)

    expect(Math.min(...xs)).toBeCloseTo(0)
    expect(Math.max(...xs)).toBeCloseTo(200)
    expect(Math.min(...ys)).toBeCloseTo(0)
    expect(Math.max(...ys)).toBeCloseTo(100)
  })

  it('reduces a straight line to its two ends', () => {
    expect(outline(arrow)).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }])
  })

  it('boxes text around its baseline', () => {
    const box = bounds(text)

    // Mostly above the baseline, dipping below it for descenders.
    expect(box.minY).toBeLessThan(50)
    expect(box.maxY).toBeGreaterThan(50)
    expect(50 - box.minY).toBeGreaterThan(box.maxY - 50)
    expect(box.maxX).toBeGreaterThan(box.minX)
  })

  it('boxes a longer string wider than a shorter one', () => {
    const short = bounds({ ...text, text: 'a' })
    const long = bounds({ ...text, text: 'a much longer label' })

    expect(long.maxX - long.minX).toBeGreaterThan(short.maxX - short.minX)
  })
})

describe('hit-testing every shape type', () => {
  it('finds a rectangle by its edge, not its middle', () => {
    expect(shapeAt([rect], { x: 200, y: 100 })?.id).toBe('r')
    expect(shapeAt([rect], { x: 200, y: 150 })).toBeNull()
  })

  it('finds an ellipse by its curve', () => {
    expect(shapeAt([ellipse], { x: 100, y: 0 })?.id).toBe('e')
    expect(shapeAt([ellipse], { x: 100, y: 50 })).toBeNull()
  })

  it('finds a line along its shaft', () => {
    expect(shapeAt([arrow], { x: 50, y: 4 })?.id).toBe('a')
    expect(shapeAt([arrow], { x: 50, y: 90 })).toBeNull()
  })

  it('finds text by its box', () => {
    expect(shapeAt([text], { x: 55, y: 45 })?.id).toBe('t')
    expect(shapeAt([text], { x: 400, y: 400 })).toBeNull()
  })
})

describe('mapPoints', () => {
  it('moves every point of a primitive', () => {
    const moved = mapPoints(rect, (point) => ({ x: point.x + 10, y: point.y * 2 }))
    if (moved.type !== 'rect') throw new Error('type changed')

    expect(moved.from).toEqual({ x: 110, y: 200 })
    expect(moved.to).toEqual({ x: 310, y: 400 })
  })

  it('moves text without touching its string', () => {
    const moved = mapPoints(text, (point) => ({ x: point.x * 2, y: point.y * 2 }))
    if (moved.type !== 'text') throw new Error('type changed')

    expect(moved.at).toEqual({ x: 100, y: 100 })
    expect(moved.text).toBe('hello')
  })

  it('keeps a shape id stable', () => {
    expect(mapPoints(arrow, (point) => point).id).toBe('a')
  })
})

describe('bounds and transforms', () => {
  it('boxes a shape by its extremes', () => {
    expect(bounds(rect)).toEqual({ minX: 100, minY: 100, maxX: 300, maxY: 200 })
  })

  it('picks the corner opposite the one being dragged', () => {
    const box = bounds(rect)

    expect(cornerPoint(box, 'nw')).toEqual({ x: 100, y: 100 })
    expect(oppositeCorner(box, 'nw')).toEqual({ x: 300, y: 200 })
    expect(oppositeCorner(box, 'se')).toEqual({ x: 100, y: 100 })
  })

  it('finds a handle only near a corner', () => {
    expect(cornerAt(rect, { x: 102, y: 102 })).toBe('nw')
    expect(cornerAt(rect, { x: 298, y: 198 })).toBe('se')
    expect(cornerAt(rect, { x: 200, y: 150 })).toBeNull()
  })

  it('treats the box interior as within bounds', () => {
    expect(withinBounds(rect, { x: 200, y: 150 })).toBe(true)
    expect(withinBounds(rect, { x: 600, y: 150 })).toBe(false)
  })

  it('moves a shape without changing its size', () => {
    const moved = translate(rect, 50, -20)

    expect(bounds(moved)).toEqual({ minX: 150, minY: 80, maxX: 350, maxY: 180 })
  })

  it('scales about an anchor, holding the anchor still', () => {
    const anchor = { x: 100, y: 100 }
    const scaled = bounds(scaleAbout(rect, anchor, 2, 3))

    expect(scaled.minX).toBe(100)
    expect(scaled.minY).toBe(100)
    expect(scaled.maxX).toBe(500)
    expect(scaled.maxY).toBe(400)
  })

  it('scales a stroke point-by-point, not just its box', () => {
    const stroke: Shape = {
      id: 's',
      type: 'stroke',
      points: [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }],
      color: '#e5484d',
      weight: 9,
      opacity: 1,
    }
    const scaled = scaleAbout(stroke, { x: 0, y: 0 }, 2, 2)
    if (scaled.type !== 'stroke') throw new Error('type changed')

    expect(scaled.points).toEqual([{ x: 0, y: 0 }, { x: 20, y: 20 }, { x: 40, y: 0 }])
  })
})

describe('fixed proportions', () => {
  const RATIO = 3 / 2

  it('only constrains the types that need it', () => {
    const timer: Shape = { id: 'w', type: 'timer', from: { x: 0, y: 0 }, to: { x: 30, y: 20 }, opacity: 1 }
    const stroke: Shape = { id: 's', type: 'stroke', points: [{ x: 0, y: 0 }, { x: 5, y: 5 }], color: '#e5484d', weight: 9, opacity: 1 }

    expect(aspectOf(timer)).toBeCloseTo(RATIO)
    expect(aspectOf(rect)).toBeNull()
    expect(aspectOf(stroke)).toBeNull()
    // Text's ratio comes from its own string, so it resizes whole.
    expect(aspectOf(text)).toBeGreaterThan(0)
  })

  it('snaps a dragged corner to the ratio', () => {
    const to = keepAspect({ x: 0, y: 0 }, { x: 300, y: 40 }, RATIO)

    expect(to.x / to.y).toBeCloseTo(RATIO)
  })

  it('follows whichever axis was dragged further', () => {
    // Dragged far down but barely across — height wins, width follows it.
    const to = keepAspect({ x: 0, y: 0 }, { x: 20, y: 200 }, RATIO)

    expect(to.y).toBeCloseTo(200)
    expect(to.x).toBeCloseTo(300)
  })

  it('keeps the drag direction when dragging up and left', () => {
    const to = keepAspect({ x: 0, y: 0 }, { x: -300, y: -40 }, RATIO)

    expect(to.x).toBeLessThan(0)
    expect(to.y).toBeLessThan(0)
    expect(Math.abs(to.x / to.y)).toBeCloseTo(RATIO)
  })

  it('reduces two resize factors to one magnitude', () => {
    expect(uniformFactors(2, 0.5)).toEqual([2, 2])
    expect(uniformFactors(0.5, 3)).toEqual([3, 3])
  })

  it('keeps each axis direction when a resize flips one', () => {
    expect(uniformFactors(-2, 0.5)).toEqual([-2, 2])
    expect(uniformFactors(1, -4)).toEqual([4, -4])
  })

  it('holds the ratio through a constrained resize', () => {
    const timer: Shape = { id: 't', type: 'timer', from: { x: 0, y: 0 }, to: { x: 300, y: 200 }, opacity: 1 }
    const [fx, fy] = uniformFactors(2, 0.4)
    const box = bounds(scaleAbout(timer, { x: 0, y: 0 }, fx, fy))

    expect((box.maxX - box.minX) / (box.maxY - box.minY)).toBeCloseTo(RATIO)
  })
})

describe('resizing text', () => {
  const label: Text = {
    id: 'l',
    type: 'text',
    at: { x: 100, y: 100 },
    text: 'hello',
    size: 20,
    color: '#e5484d',
    opacity: 1,
  }

  it('scales the glyph size, not just the position', () => {
    const bigger = scaleAbout(label, { x: 0, y: 0 }, 2, 2)
    if (bigger.type !== 'text') throw new Error('type changed')

    expect(bigger.size).toBe(40)
    expect(bigger.at).toEqual({ x: 200, y: 200 })
  })

  it('grows its box, so the selection follows', () => {
    const before = bounds(label)
    const after = bounds(scaleAbout(label, { x: 0, y: 0 }, 2, 2))

    expect(after.maxX - after.minX).toBeCloseTo((before.maxX - before.minX) * 2)
    expect(after.maxY - after.minY).toBeCloseTo((before.maxY - before.minY) * 2)
  })

  it('shrinks as well as grows', () => {
    const smaller = scaleAbout(label, { x: 0, y: 0 }, 0.5, 0.5)
    if (smaller.type !== 'text') throw new Error('type changed')

    expect(smaller.size).toBe(10)
  })

  it('takes the larger factor when a drag is lopsided', () => {
    const scaled = scaleAbout(label, { x: 0, y: 0 }, 1.2, 3)
    if (scaled.type !== 'text') throw new Error('type changed')

    expect(scaled.size).toBe(60)
  })

  it('leaves the string alone', () => {
    const scaled = scaleAbout(label, { x: 0, y: 0 }, 4, 4)
    if (scaled.type !== 'text') throw new Error('type changed')

    expect(scaled.text).toBe('hello')
  })
})

describe('text metrics', () => {
  const at = { x: 0, y: 100 }

  it('gives the same height whatever the string says', () => {
    const tall = bounds({ id: 'a', type: 'text', at, text: 'T', size: 28, color: '#e5484d', opacity: 1 })
    const short = bounds({ id: 'b', type: 'text', at, text: 'o', size: 28, color: '#e5484d', opacity: 1 })
    const descending = bounds({ id: 'c', type: 'text', at, text: 'g', size: 28, color: '#e5484d', opacity: 1 })

    expect(short.maxY - short.minY).toBeCloseTo(tall.maxY - tall.minY)
    expect(descending.maxY - descending.minY).toBeCloseTo(tall.maxY - tall.minY)
  })

  it('gives the same height for an empty string', () => {
    const empty = bounds({ id: 'a', type: 'text', at, text: '', size: 28, color: '#e5484d', opacity: 1 })
    const typed = bounds({ id: 'b', type: 'text', at, text: 'hello', size: 28, color: '#e5484d', opacity: 1 })

    expect(empty.maxY - empty.minY).toBeCloseTo(typed.maxY - typed.minY)
  })

  it('scales the height with the size', () => {
    const small = bounds({ id: 'a', type: 'text', at, text: 'x', size: 20, color: '#e5484d', opacity: 1 })
    const large = bounds({ id: 'b', type: 'text', at, text: 'x', size: 40, color: '#e5484d', opacity: 1 })

    expect(large.maxY - large.minY).toBeCloseTo((small.maxY - small.minY) * 2)
  })
})
