import { describe, expect, it } from 'vitest'
import type { Point } from './coords'
import { recognise, resample } from './recognise'

/** Deterministic wobble, so the strokes are rough the way a hand is but the tests are not flaky. */
function wobble(seed: number, amount: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return (x - Math.floor(x) - 0.5) * 2 * amount
}

function circle(cx: number, cy: number, r: number, noise = 0.04): Point[] {
  return Array.from({ length: 40 }, (_, step) => {
    const angle = (step / 39) * Math.PI * 2 * 0.97
    const radius = r * (1 + wobble(step, noise))
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }
  })
}

function oval(cx: number, cy: number, rx: number, ry: number): Point[] {
  return Array.from({ length: 40 }, (_, step) => {
    const angle = (step / 39) * Math.PI * 2 * 0.97
    return { x: cx + Math.cos(angle) * rx * (1 + wobble(step, 0.03)), y: cy + Math.sin(angle) * ry * (1 + wobble(step + 7, 0.03)) }
  })
}

function rectangle(x: number, y: number, w: number, h: number, noise = 3): Point[] {
  const corners = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
    { x: x + 4, y: y + 3 },
  ]
  const out: Point[] = []
  for (let side = 0; side < 4; side += 1) {
    const from = corners[side]
    const to = corners[side + 1]
    for (let step = 0; step < 10; step += 1) {
      const along = step / 10
      out.push({
        x: from.x + (to.x - from.x) * along + wobble(side * 10 + step, noise),
        y: from.y + (to.y - from.y) * along + wobble(side * 10 + step + 50, noise),
      })
    }
  }
  return out
}

function line(from: Point, to: Point, noise = 2): Point[] {
  return Array.from({ length: 20 }, (_, step) => {
    const along = step / 19
    return { x: from.x + (to.x - from.x) * along + wobble(step, noise), y: from.y + (to.y - from.y) * along + wobble(step + 30, noise) }
  })
}

function arrow(): Point[] {
  const shaft = line({ x: 100, y: 300 }, { x: 400, y: 300 }, 1.5)
  const head = [
    { x: 370, y: 270 },
    { x: 400, y: 300 },
    { x: 370, y: 330 },
  ]
  return [...shaft, ...head]
}

function arc(cx: number, cy: number, r: number, fromDeg: number, toDeg: number): Point[] {
  return Array.from({ length: 30 }, (_, step) => {
    const angle = ((fromDeg + ((toDeg - fromDeg) * step) / 29) * Math.PI) / 180
    const radius = r * (1 + wobble(step, 0.015))
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }
  })
}

function scribble(): Point[] {
  return Array.from({ length: 60 }, (_, step) => ({
    x: 200 + Math.sin(step * 0.9) * 80 + wobble(step, 30),
    y: 200 + Math.cos(step * 1.7) * 60 + wobble(step + 99, 30),
  }))
}

describe('resample', () => {
  it('spaces the points evenly along the path', () => {
    const path = resample(line({ x: 0, y: 0 }, { x: 100, y: 0 }, 0), 11)
    expect(path).toHaveLength(11)
    expect(path[5].x).toBeCloseTo(50, 5)
  })
})

describe('recognise', () => {
  it('sees a rough circle as a circle — equal sides, centred where it was', () => {
    const shape = recognise(circle(300, 300, 100))!
    expect(shape.type).toBe('ellipse')
    expect(shape.to.x - shape.from.x).toBeCloseTo(shape.to.y - shape.from.y, 5)
    expect((shape.from.x + shape.to.x) / 2).toBeCloseTo(300, -1)
  })

  it('keeps an oval an oval', () => {
    const shape = recognise(oval(300, 300, 160, 70))!
    expect(shape.type).toBe('ellipse')
    expect(shape.to.x - shape.from.x).toBeGreaterThan((shape.to.y - shape.from.y) * 1.8)
  })

  it('sees a rough rectangle as a rectangle', () => {
    const shape = recognise(rectangle(100, 100, 300, 160))!
    expect(shape.type).toBe('rect')
    expect(shape.from.x).toBeCloseTo(100, -1)
    expect(shape.to.y).toBeCloseTo(260, -1)
  })

  it('makes a near-square square', () => {
    const shape = recognise(rectangle(100, 100, 200, 190))!
    expect(shape.type).toBe('rect')
    expect(shape.to.x - shape.from.x).toBeCloseTo(shape.to.y - shape.from.y, 5)
  })

  it('sees a wobbly line as a line, and levels one that is nearly level', () => {
    const shape = recognise(line({ x: 100, y: 200 }, { x: 500, y: 208 }))!
    expect(shape.type).toBe('line')
    expect(shape.heads).toBe('none')
    expect(shape.to.y).toBe(shape.from.y)
  })

  it('leaves a clearly diagonal line diagonal', () => {
    const shape = recognise(line({ x: 100, y: 100 }, { x: 400, y: 300 }))!
    expect(shape.type).toBe('line')
    expect(shape.to.y).toBeGreaterThan(280)
  })

  it('sees a shaft with a head as a line with a head at the tip', () => {
    const shape = recognise(arrow())!
    expect(shape.type).toBe('line')
    expect(shape.heads).toBe('end')
    expect(shape.bend).toBeUndefined()
    // Resampled, so the tip lands within a sample of the true corner.
    expect(Math.abs(shape.to.x - 400)).toBeLessThan(6)
  })

  it('sees an arc as a bent line, bowing the way it was drawn', () => {
    // A quarter turn of a circle centred below the chord: the bow goes up.
    const shape = recognise(arc(300, 500, 200, -140, -40))!
    expect(shape.type).toBe('line')
    expect(shape.bend).toBeDefined()
    expect(shape.bend!.y).toBeLessThan(Math.min(shape.from.y, shape.to.y))
    expect(shape.heads).toBe('none')
  })

  it('leaves an S-curve as ink', () => {
    const s = Array.from({ length: 40 }, (_, step) => ({ x: 100 + step * 8, y: 300 + Math.sin(step / 6) * 60 }))
    expect(recognise(s)).toBeNull()
  })

  it('leaves a scribble alone', () => {
    expect(recognise(scribble())).toBeNull()
  })

  it('leaves something tiny alone', () => {
    expect(recognise(circle(10, 10, 5))).toBeNull()
    expect(recognise([{ x: 0, y: 0 }, { x: 3, y: 1 }])).toBeNull()
  })
})
