import type { Point } from './coords'
import type { Style } from './style'
import type { Tool } from './WhiteboardMode'

/** Icons are one size everywhere: a row that varies reads as a mistake. */
export const ICON_SIZE = 22

/** Tools that put ink on the surface, and so have a colour and a weight. */
const INK_TOOLS: Tool[] = ['pen', 'rect', 'ellipse', 'line', 'arrow']

/** Tools that draw a stroked line, which is what a dash pattern needs. */
const BORDER_TOOLS: Tool[] = ['rect', 'ellipse', 'line', 'arrow']

/** Tools that draw a closed shape, which is what a fill needs. */
const FILL_TOOLS: Tool[] = ['rect', 'ellipse']

/** Tools that leave a shape behind, all of which can be made more or less solid. */
const SHAPE_TOOLS: Tool[] = [...INK_TOOLS, 'text', 'timer']

/**
 * Which settings mean anything right now. A weight means nothing to the text
 * tool, a fill means nothing to a line, a dash means nothing to freehand ink —
 * showing any of them would be offering a control that does nothing.
 *
 * A selection wins over the tool: its own settings are what the controls edit,
 * so what it reports is what gets shown.
 */
export function settingsFor(tool: Tool, selected: Partial<Style> | null) {
  if (selected) {
    return {
      color: selected.color !== undefined,
      weight: selected.weight !== undefined,
      textSize: selected.textSize !== undefined,
      border: selected.border !== undefined,
      fill: selected.fill !== undefined,
      opacity: selected.opacity !== undefined,
    }
  }

  const inkTool = INK_TOOLS.includes(tool)

  return {
    color: inkTool || tool === 'text',
    weight: inkTool,
    textSize: tool === 'text',
    border: BORDER_TOOLS.includes(tool),
    fill: FILL_TOOLS.includes(tool),
    opacity: SHAPE_TOOLS.includes(tool),
  }
}

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
