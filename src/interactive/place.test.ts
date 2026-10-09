import { describe, expect, it } from 'vitest'
import { centredBox, MAX_SIZE, MIN_SIZE, moveTo, resizeTo } from './place'

const stage = { width: 800, height: 500 }
// A 40px square at (100, 100).
const item = { x: 12.5, y: 20, width: 5, height: 8 }

describe('moveTo', () => {
  it('puts the centre under the pointer', () => {
    const moved = moveTo(item, { x: 400, y: 250 }, stage)
    expect(moved).toMatchObject({ x: 47.5, y: 46, width: 5, height: 8 })
  })

  it('keeps the whole box on the image', () => {
    expect(moveTo(item, { x: -50, y: -50 }, stage)).toMatchObject({ x: 0, y: 0 })
    expect(moveTo(item, { x: 900, y: 900 }, stage)).toMatchObject({ x: 95, y: 92 })
  })
})

describe('resizeTo', () => {
  it('grows square about the centre, to the further axis', () => {
    // Centre at (120, 120); pointer 60 right and 20 down, less the handle gap.
    const grown = resizeTo(item, { x: 180, y: 140 }, stage)
    expect(grown.width).toBeCloseTo((104 / 800) * 100)
    expect(grown.height).toBeCloseTo((104 / 500) * 100)
    expect(grown.x + grown.width / 2).toBeCloseTo(15)
    expect(grown.y + grown.height / 2).toBeCloseTo(24)
  })

  it('stays between the smallest and largest size', () => {
    expect(resizeTo(item, { x: 120, y: 120 }, stage).width).toBeCloseTo((MIN_SIZE / 800) * 100)
    expect(resizeTo(item, { x: 800, y: 500 }, stage).width).toBeCloseTo((MAX_SIZE / 800) * 100)
  })
})

it('centredBox is a square in the middle', () => {
  expect(centredBox(48, stage)).toEqual({ x: 47, y: 45.2, width: 6, height: 9.6 })
})
