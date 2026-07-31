import { describe, expect, it } from 'vitest'
import { REFERENCE_WIDTH, scaleFor, toReference, toScreen } from './coords'

describe('coords', () => {
  it('round-trips a point through reference space', () => {
    const point = { x: 317, y: 842 }
    const back = toReference(toScreen(point, 1920), 1920)

    expect(back.x).toBeCloseTo(point.x)
    expect(back.y).toBeCloseTo(point.y)
  })

  it('is the identity at the reference width', () => {
    expect(scaleFor(REFERENCE_WIDTH)).toBe(1)
    expect(toScreen({ x: 10, y: 20 }, REFERENCE_WIDTH)).toEqual({ x: 10, y: 20 })
  })

  it('places a stored point at the same fraction of any surface width', () => {
    const stored = { x: REFERENCE_WIDTH / 2, y: 100 }

    expect(toScreen(stored, 640).x).toBe(320)
    expect(toScreen(stored, 2560).x).toBe(1280)
  })

  it('scales both axes by the same factor, so shapes keep their aspect', () => {
    const scaled = toScreen({ x: 100, y: 100 }, 640)

    expect(scaled.x).toBe(scaled.y)
  })
})
