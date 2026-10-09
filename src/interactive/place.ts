import type { PercentBox, Size } from '../boardbook/coords'
import type { Point } from '../annotation/coords'

/** A pop-up's box on screen, in pixels of the image as the editor shows it. */
export const MIN_SIZE = 28
export const MAX_SIZE = 140
/** The resize handles sit outside the box; the pointer on one is this far past the edge. */
const HANDLE_GAP = 16

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

/** The box re-centred at `centre`, the centre pulled in so the whole box stays on the image. */
function centred(item: PercentBox, centre: Point, size: Size, stage: Size): PercentBox {
  const cx = clamp(centre.x, size.width / 2, Math.max(size.width / 2, stage.width - size.width / 2))
  const cy = clamp(centre.y, size.height / 2, Math.max(size.height / 2, stage.height - size.height / 2))
  return {
    ...item,
    x: ((cx - size.width / 2) / stage.width) * 100,
    y: ((cy - size.height / 2) / stage.height) * 100,
    width: (size.width / stage.width) * 100,
    height: (size.height / stage.height) * 100,
  }
}

function pixels(item: PercentBox, stage: Size): Size {
  return { width: (item.width / 100) * stage.width, height: (item.height / 100) * stage.height }
}

/** The box moved so its centre is under the pointer. `pointer` and `stage` are in the same pixels. */
export function moveTo<T extends PercentBox>(item: T, pointer: Point, stage: Size): T {
  return { ...item, ...centred(item, pointer, pixels(item, stage), stage) }
}

/**
 * The box resized about its centre to reach the pointer, square, within
 * bounds. Dragging a corner out grows it; whichever axis the pointer went
 * further along wins, so the box follows the hand rather than the corner.
 */
export function resizeTo<T extends PercentBox>(item: T, pointer: Point, stage: Size): T {
  const size = pixels(item, stage)
  const centre = { x: (item.x / 100) * stage.width + size.width / 2, y: (item.y / 100) * stage.height + size.height / 2 }
  const reach = 2 * Math.max(Math.abs(pointer.x - centre.x), Math.abs(pointer.y - centre.y)) - HANDLE_GAP
  const side = Math.round(clamp(reach, MIN_SIZE, Math.min(MAX_SIZE, stage.width, stage.height)))
  return { ...item, ...centred(item, centre, { width: side, height: side }, stage) }
}

/** A new box of `side` pixels in the middle of the image. */
export function centredBox(side: number, stage: Size): PercentBox {
  return centred({ x: 0, y: 0, width: 0, height: 0 }, { x: stage.width / 2, y: stage.height / 2 }, { width: side, height: side }, stage)
}
