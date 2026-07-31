import { describe, expect, it } from 'vitest'
import { REFERENCE_WIDTH } from './coords'
import { strokePath } from './stroke'

const POINTS = [
  { x: 100, y: 100 },
  { x: 140, y: 130 },
  { x: 200, y: 120 },
  { x: 260, y: 170 },
]

/** Largest coordinate in a path — a cheap proxy for the stroke's size. */
function extent(path: string): number {
  return Math.max(...path.split(' ').map(Number).filter(Number.isFinite))
}

describe('strokePath', () => {
  it('returns nothing for a stroke with no points', () => {
    expect(strokePath([], REFERENCE_WIDTH)).toBe('')
  })

  it('produces a closed outline, since the stroke is filled not stroked', () => {
    const path = strokePath(POINTS, REFERENCE_WIDTH)

    expect(path.startsWith('M ')).toBe(true)
    expect(path.endsWith(' Z')).toBe(true)
  })

  it('scales the outline with the surface width', () => {
    const half = extent(strokePath(POINTS, REFERENCE_WIDTH / 2))
    const full = extent(strokePath(POINTS, REFERENCE_WIDTH))

    expect(half).toBeCloseTo(full / 2, 0)
  })

  it('survives a single-point stroke', () => {
    expect(() => strokePath([{ x: 10, y: 10 }], REFERENCE_WIDTH)).not.toThrow()
  })
})
