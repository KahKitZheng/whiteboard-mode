import { describe, expect, it } from 'vitest'
import { clampToWindow } from './toolbar'

const VIEWPORT = { width: 1000, height: 800 }

/** A box of the given size, positioned by its top-left corner. */
function box(left: number, top: number, width = 400, height = 60) {
  return { left, top, right: left + width, bottom: top + height }
}

describe('clampToWindow', () => {
  it('leaves an offset alone while the box is fully inside', () => {
    expect(clampToWindow({ x: 120, y: -40 }, box(300, 700), VIEWPORT)).toEqual({ x: 120, y: -40 })
  })

  it('touching an edge exactly still counts as inside', () => {
    expect(clampToWindow({ x: 0, y: 0 }, box(0, 740), VIEWPORT)).toEqual({ x: 0, y: 0 })
    expect(clampToWindow({ x: 0, y: 0 }, box(600, 0), VIEWPORT)).toEqual({ x: 0, y: 0 })
  })

  it('pushes back by exactly the overflow past the near edges', () => {
    expect(clampToWindow({ x: -500, y: -300 }, box(-80, -25), VIEWPORT)).toEqual({
      x: -420,
      y: -275,
    })
  })

  it('pulls back by exactly the overflow past the far edges', () => {
    // right = 1050, bottom = 860 — 50 and 60 past the window.
    expect(clampToWindow({ x: 200, y: 100 }, box(650, 800), VIEWPORT)).toEqual({ x: 150, y: 40 })
  })

  /*
    This is the case that made the whole function necessary: the toolbar sat on
    the left edge collapsed, then arming whiteboard mode widened it, and because
    it is centred on half its own width both edges moved out.
  */
  it('recovers a toolbar that grew off the left edge', () => {
    const grown = box(-343, 654, 880)
    const fixed = clampToWindow({ x: -496, y: -80 }, grown, VIEWPORT)

    expect(fixed).toEqual({ x: -153, y: -80 })
    expect(grown.left + (fixed.x - -496)).toBe(0)
  })

  it('pins the near edge when the box is wider than the window', () => {
    const fixed = clampToWindow({ x: 0, y: 0 }, box(-60, 700, 1200), VIEWPORT)

    // Both ends overflow and cannot both be satisfied. The handle is on the
    // left, so the left edge is the one that has to be reachable.
    expect(fixed).toEqual({ x: 60, y: 0 })
  })
})
