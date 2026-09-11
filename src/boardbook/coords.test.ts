import { describe, expect, it } from 'vitest'
import { fitWidth, imageToPercent, percentToImage, zoomRatio } from './coords'

const IMAGE = { width: 1600, height: 1200 }

describe('boardbook coords', () => {
  it('maps a percentage box onto image pixels', () => {
    expect(percentToImage({ x: 25, y: 50, width: 10, height: 20 }, IMAGE)).toEqual({
      x: 400,
      y: 600,
      width: 160,
      height: 240,
    })
  })

  it('round-trips through percentages', () => {
    const box = { x: 123, y: 456, width: 78, height: 90 }
    const back = percentToImage(imageToPercent(box, IMAGE), IMAGE)

    expect(back.x).toBeCloseTo(box.x)
    expect(back.y).toBeCloseTo(box.y)
    expect(back.width).toBeCloseTo(box.width)
    expect(back.height).toBeCloseTo(box.height)
  })

  it('fits a wide image to the container width and a tall one to its height', () => {
    const container = { width: 1000, height: 500 }

    expect(fitWidth(container, { width: 1600, height: 400 })).toBe(1000)
    expect(fitWidth(container, { width: 400, height: 1600 })).toBe(125)
  })

  it('is 1 at home zoom and grows with the zoom', () => {
    expect(zoomRatio(0.8, 0.8)).toBe(1)
    expect(zoomRatio(3.2, 0.8)).toBe(4)
  })

  it('tolerates a home zoom that has not been computed yet', () => {
    expect(zoomRatio(2, 0)).toBe(1)
  })
})
