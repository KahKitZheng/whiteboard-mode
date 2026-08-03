import { describe, expect, it } from 'vitest'
import { DEFAULT_STYLE, restyle, styleOf } from './style'
import type { Shape } from './types'

const stroke: Shape = {
  id: 's',
  type: 'stroke',
  points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
  color: '#e5484d',
  weight: 9,
}
const label: Shape = { id: 'l', type: 'text', at: { x: 0, y: 0 }, text: 'hi', size: 30, color: '#e5484d' }
const timer: Shape = { id: 'w', type: 'timer', from: { x: 0, y: 0 }, to: { x: 30, y: 20 } }

describe('restyle', () => {
  it('recolours a stroke without touching its weight', () => {
    const next = restyle(stroke, { color: '#3e63dd' })
    if (next.type !== 'stroke') throw new Error('type changed')

    expect(next.color).toBe('#3e63dd')
    expect(next.weight).toBe(9)
  })

  it('applies text size to a label, not weight', () => {
    const next = restyle(label, { textSize: 46, weight: 18 })
    if (next.type !== 'text') throw new Error('type changed')

    expect(next.size).toBe(46)
    expect(next).not.toHaveProperty('weight')
  })

  it('ignores text size on a stroke', () => {
    const next = restyle(stroke, { textSize: 46 })

    expect(next).toEqual(stroke)
  })

  it('leaves a widget alone — it draws itself', () => {
    expect(restyle(timer, { color: '#3e63dd', weight: 18 })).toBe(timer)
  })

  it('keeps geometry and identity', () => {
    const next = restyle(stroke, { color: '#30a46c', weight: 4 })
    if (next.type !== 'stroke') throw new Error('type changed')

    expect(next.id).toBe('s')
    expect(next.points).toEqual(stroke.points)
  })
})

describe('styleOf', () => {
  it('reports colour and weight for inked shapes', () => {
    expect(styleOf(stroke)).toEqual({ color: '#e5484d', weight: 9 })
  })

  it('reports colour and text size for a label', () => {
    expect(styleOf(label)).toEqual({ color: '#e5484d', textSize: 30 })
  })

  it('reports nothing for a widget', () => {
    expect(styleOf(timer)).toBeNull()
  })

  it('has a default for every setting', () => {
    expect(DEFAULT_STYLE.color).toBeTruthy()
    expect(DEFAULT_STYLE.weight).toBeGreaterThan(0)
    expect(DEFAULT_STYLE.textSize).toBeGreaterThan(0)
  })
})
