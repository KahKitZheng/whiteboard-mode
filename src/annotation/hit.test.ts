import { describe, expect, it } from 'vitest'
import { shapeAt } from './hit'
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
