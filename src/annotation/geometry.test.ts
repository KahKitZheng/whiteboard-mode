import { describe, expect, it } from 'vitest'
import {
  bounds,
  cornerAt,
  cornerPoint,
  mapPoints,
  oppositeCorner,
  outline,
  scaleAbout,
  translate,
  withinBounds,
} from './geometry'
import { shapeAt } from './hit'
import type { Shape } from './types'

const rect: Shape = { id: 'r', type: 'rect', from: { x: 100, y: 100 }, to: { x: 300, y: 200 } }
const ellipse: Shape = { id: 'e', type: 'ellipse', from: { x: 0, y: 0 }, to: { x: 200, y: 100 } }
const arrow: Shape = { id: 'a', type: 'arrow', from: { x: 0, y: 0 }, to: { x: 100, y: 0 } }
const text: Shape = { id: 't', type: 'text', at: { x: 50, y: 50 }, text: 'hello' }

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

  it('reduces an arrow to its two ends', () => {
    expect(outline(arrow)).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }])
  })

  it('boxes text above its baseline', () => {
    const points = outline(text)

    expect(points.every((point) => point.y <= 50)).toBe(true)
    expect(Math.max(...points.map((point) => point.x))).toBeGreaterThan(50)
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

  it('finds an arrow along its shaft', () => {
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
    }
    const scaled = scaleAbout(stroke, { x: 0, y: 0 }, 2, 2)
    if (scaled.type !== 'stroke') throw new Error('type changed')

    expect(scaled.points).toEqual([{ x: 0, y: 0 }, { x: 20, y: 20 }, { x: 40, y: 0 }])
  })
})
