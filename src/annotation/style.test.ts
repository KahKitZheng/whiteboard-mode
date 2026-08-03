import { describe, expect, it } from 'vitest'
import { canFill, DEFAULT_STYLE, restyle, styleOf } from './style'
import type { Shape } from './types'

const stroke: Shape = {
  id: 's',
  type: 'stroke',
  points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
  color: '#e5484d',
  weight: 9,
  opacity: 1,
}
const rect: Shape = {
  id: 'r',
  type: 'rect',
  from: { x: 0, y: 0 },
  to: { x: 20, y: 10 },
  color: '#e5484d',
  weight: 9,
  opacity: 1,
  border: 'solid',
  fill: 'none',
}
const line: Shape = {
  id: 'n',
  type: 'line',
  from: { x: 0, y: 0 },
  to: { x: 20, y: 10 },
  color: '#e5484d',
  weight: 9,
  opacity: 1,
  border: 'solid',
}
const label: Shape = {
  id: 'l',
  type: 'text',
  at: { x: 0, y: 0 },
  text: 'hi',
  size: 30,
  color: '#e5484d',
  opacity: 1,
}
const timer: Shape = {
  id: 'w',
  type: 'timer',
  from: { x: 0, y: 0 },
  to: { x: 30, y: 20 },
  opacity: 1,
}

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

  it('gives a dash to a primitive but not to freehand ink', () => {
    const dashed = restyle(rect, { border: 'dashed' })
    if (dashed.type !== 'rect') throw new Error('type changed')

    expect(dashed.border).toBe('dashed')
    expect(restyle(stroke, { border: 'dashed' })).not.toHaveProperty('border')
  })

  it('fills a closed shape and leaves a line without one', () => {
    const filled = restyle(rect, { fill: 'solid' })
    if (filled.type !== 'rect') throw new Error('type changed')

    expect(filled.fill).toBe('solid')
    expect(restyle(line, { fill: 'solid' })).not.toHaveProperty('fill')
  })

  it('applies opacity to everything, widgets included', () => {
    for (const shape of [stroke, rect, line, label, timer]) {
      expect(restyle(shape, { opacity: 0.5 })).toHaveProperty('opacity', 0.5)
    }
  })

  it('gives a widget nothing but its opacity', () => {
    const next = restyle(timer, { color: '#3e63dd', weight: 18, border: 'dashed', fill: 'solid' })

    expect(next).toEqual(timer)
  })

  it('keeps geometry and identity', () => {
    const next = restyle(stroke, { color: '#30a46c', weight: 4 })
    if (next.type !== 'stroke') throw new Error('type changed')

    expect(next.id).toBe('s')
    expect(next.points).toEqual(stroke.points)
  })
})

describe('styleOf', () => {
  it('reports what a stroke has', () => {
    expect(styleOf(stroke)).toEqual({ color: '#e5484d', weight: 9, opacity: 1 })
  })

  it('reports a border for any primitive, a fill only for a closed one', () => {
    expect(styleOf(rect)).toHaveProperty('border', 'solid')
    expect(styleOf(rect)).toHaveProperty('fill', 'none')
    expect(styleOf(line)).toHaveProperty('border', 'solid')
    expect(styleOf(line)).not.toHaveProperty('fill')
  })

  it('reports colour, text size and opacity for a label', () => {
    expect(styleOf(label)).toEqual({ color: '#e5484d', textSize: 30, opacity: 1 })
  })

  it('reports only opacity for a widget', () => {
    expect(styleOf(timer)).toEqual({ opacity: 1 })
  })

  it('has a default for every setting', () => {
    expect(DEFAULT_STYLE.color).toBeTruthy()
    expect(DEFAULT_STYLE.weight).toBeGreaterThan(0)
    expect(DEFAULT_STYLE.textSize).toBeGreaterThan(0)
    expect(DEFAULT_STYLE.border).toBeTruthy()
    expect(DEFAULT_STYLE.fill).toBeTruthy()
    expect(DEFAULT_STYLE.opacity).toBe(1)
  })
})

describe('canFill', () => {
  it('is true only for shapes with an inside', () => {
    expect(canFill(rect)).toBe(true)
    expect(canFill(line)).toBe(false)
    expect(canFill(stroke)).toBe(false)
    expect(canFill(label)).toBe(false)
  })
})
