import { describe, expect, it } from 'vitest'
import { shapeAt, shapeNear, shapesAlong } from './hit'
import type { Shape } from './types'

const horizontal: Shape = {
  id: 'horizontal',
  type: 'stroke',
  points: [{ x: 0, y: 100 }, { x: 200, y: 100 }],
}

const vertical: Shape = {
  id: 'vertical',
  type: 'stroke',
  points: [{ x: 100, y: 0 }, { x: 100, y: 200 }],
}

describe('shapeAt', () => {
  it('finds a stroke the point sits on', () => {
    expect(shapeAt([horizontal], { x: 100, y: 100 })?.id).toBe('horizontal')
  })

  it('finds a stroke the point sits near', () => {
    expect(shapeAt([horizontal], { x: 100, y: 108 })?.id).toBe('horizontal')
  })

  it('misses a stroke the point is well clear of', () => {
    expect(shapeAt([horizontal], { x: 100, y: 160 })).toBeNull()
  })

  it('misses a point beyond the end of a segment', () => {
    expect(shapeAt([horizontal], { x: 260, y: 100 })).toBeNull()
  })

  it('returns the topmost shape when two overlap', () => {
    expect(shapeAt([horizontal, vertical], { x: 100, y: 100 })?.id).toBe('vertical')
    expect(shapeAt([vertical, horizontal], { x: 100, y: 100 })?.id).toBe('horizontal')
  })

  it('handles a stroke of a single point', () => {
    const dot: Shape = { id: 'dot', type: 'stroke', points: [{ x: 50, y: 50 }] }

    expect(shapeAt([dot], { x: 53, y: 53 })?.id).toBe('dot')
    expect(shapeAt([dot], { x: 90, y: 90 })).toBeNull()
  })

  it('finds nothing among no shapes', () => {
    expect(shapeAt([], { x: 0, y: 0 })).toBeNull()
  })
})

describe('shapesAlong', () => {
  it('catches a shape the pointer crossed between two events', () => {
    // The pointer jumps clean over the vertical line — neither end touches it.
    const swept = shapesAlong([vertical], { x: 40, y: 100 }, { x: 160, y: 100 })

    expect(swept.map((shape) => shape.id)).toEqual(['vertical'])
  })

  it('catches every shape along the sweep', () => {
    const swept = shapesAlong([horizontal, vertical], { x: 100, y: 40 }, { x: 100, y: 160 })

    expect(swept.map((shape) => shape.id).sort()).toEqual(['horizontal', 'vertical'])
  })

  it('reports each shape once, however long the sweep', () => {
    const swept = shapesAlong([horizontal], { x: 0, y: 100 }, { x: 200, y: 100 })

    expect(swept).toHaveLength(1)
  })

  it('finds nothing when the sweep misses everything', () => {
    expect(shapesAlong([horizontal, vertical], { x: 400, y: 400 }, { x: 500, y: 500 })).toEqual([])
  })

  it('handles a sweep that never moved', () => {
    expect(shapesAlong([horizontal], { x: 100, y: 100 }, { x: 100, y: 100 })).toHaveLength(1)
  })
})

describe('shapeNear', () => {
  const box: Shape = { id: 'box', type: 'rect', from: { x: 0, y: 0 }, to: { x: 200, y: 100 } }

  it('picks a shape from inside it, not just from its edge', () => {
    expect(shapeAt([box], { x: 100, y: 50 })).toBeNull()
    expect(shapeNear([box], { x: 100, y: 50 })?.id).toBe('box')
  })

  it('still picks by edge', () => {
    expect(shapeNear([box], { x: 100, y: 0 })?.id).toBe('box')
  })

  it('prefers an outline hit over a merely-enclosing box', () => {
    // The line crosses the rectangle's interior; aiming at the line gets it.
    expect(shapeNear([box, vertical], { x: 100, y: 50 })?.id).toBe('vertical')
  })

  it('finds nothing outside everything', () => {
    expect(shapeNear([box], { x: 400, y: 400 })).toBeNull()
  })
})
