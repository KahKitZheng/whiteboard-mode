import type { Style } from './style'
import type { Tool } from './WhiteboardMode'

/** Icons are one size everywhere: a row that varies reads as a mistake. */
export const ICON_SIZE = 20

/** Tools that put ink on the surface, and so have a colour and a weight. */
const INK_TOOLS: Tool[] = ['pen', 'highlighter', 'rect', 'ellipse', 'line']

/** Tools that draw a stroked line, which is what a dash pattern needs. */
const BORDER_TOOLS: Tool[] = ['rect', 'ellipse', 'line']

/** Tools that draw a closed shape, which is what a fill needs. */
const FILL_TOOLS: Tool[] = ['rect', 'ellipse']

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
      highlightWeight: selected.highlightWeight !== undefined,
      textSize: selected.textSize !== undefined,
      border: selected.border !== undefined,
      fill: selected.fill !== undefined,
      heads: selected.heads !== undefined,
      // A mark's kind is what it is; these only steer the next one.
      snap: false,
      penMark: false,
      tidy: false,
    }
  }

  const inkTool = INK_TOOLS.includes(tool)

  return {
    color: inkTool || tool === 'text' || tool === 'note',
    weight: inkTool && tool !== 'highlighter',
    highlightWeight: tool === 'highlighter',
    textSize: tool === 'text',
    border: BORDER_TOOLS.includes(tool),
    fill: FILL_TOOLS.includes(tool),
    heads: tool === 'line',
    snap: tool === 'highlighter',
    penMark: tool === 'pen',
    tidy: tool === 'pen',
  }
}
