import { describe, expect, it } from 'vitest'
import { mapPoints, outline } from './geometry'
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
