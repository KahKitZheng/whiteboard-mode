import type { Point } from './coords'

export type Box = { left: number; right: number; top: number; bottom: number }
export type Viewport = { width: number; height: number }

/**
 * dnd-kit clamps the toolbar to the window while it is being dragged, and that
 * is the only time it clamps. But the toolbar changes size on its own too —
 * arming whiteboard mode reveals nine tools, selecting a shape reveals three
 * more — and it is centred on a percentage of its own width, so growing moves
 * *both* of its edges outward. Dragged against an edge and then expanded, it
 * walks off screen taking the drag handle and the on/off switch with it, and
 * there is then no way to reach either.
 *
 * So the offset is re-clamped whenever the box changes, not only on drop.
 */
export function clampToWindow(offset: Point, box: Box, viewport: Viewport): Point {
  return {
    x: offset.x + correction(box.left, box.right, viewport.width),
    y: offset.y + correction(box.top, box.bottom, viewport.height),
  }
}

/**
 * How far one axis has to be pulled back inside. A box larger than the window
 * overflows both ends at once and cannot satisfy both; the near edge wins,
 * because that is the end the drag handle and the on/off switch are on.
 */
function correction(start: number, end: number, size: number): number {
  const before = Math.max(0, -start)
  if (before > 0) return before

  return -Math.max(0, end - size)
}
