import getStroke from 'perfect-freehand'
import { scaleFor, type Point } from './coords'

const OPTIONS = {
  thinning: 0.6,
  smoothing: 0.5,
  streamline: 0.5,
}

/**
 * A highlighter is a chisel tip, not a nib: it lays down the same width however
 * fast it is moved. Thinned like a pen, a highlight tapered away at both ends
 * and the first and last words of the phrase came out barely covered.
 */
const HIGHLIGHT_OPTIONS = { ...OPTIONS, thinning: 0 }

/**
 * A mark's line is computed, not drawn: its ends are exactly where the words
 * end. Streamlining — which drags each point toward the one before it, and
 * makes a live pen feel steady — would pull those ends a word short.
 */
const MARK_OPTIONS = { ...HIGHLIGHT_OPTIONS, streamline: 0 }

export type Nib = 'pen' | 'highlighter' | 'mark'

function optionsFor(nib: Nib) {
  if (nib === 'mark') return MARK_OPTIONS
  return nib === 'highlighter' ? HIGHLIGHT_OPTIONS : OPTIONS
}

/**
 * Reference-space input points -> an SVG path describing the stroke's filled
 * outline, in surface pixels. The thickness scales with the surface too,
 * otherwise a stroke drawn on a laptop looks like a marker on a 4K panel.
 */
export function strokePath(points: Point[], surfaceWidth: number, weight: number, nib: Nib = 'pen'): string {
  if (points.length === 0) return ''

  const scale = scaleFor(surfaceWidth)
  const outline = getStroke(
    points.map((point) => [point.x * scale, point.y * scale]),
    { ...optionsFor(nib), size: weight * scale },
  )

  return pathFromOutline(outline)
}

/**
 * perfect-freehand returns a polygon. Joining its points with quadratic curves
 * rather than straight lines keeps slow strokes — which produce few points —
 * from looking faceted.
 */
function pathFromOutline(outline: number[][]): string {
  if (outline.length === 0) return ''

  const path = outline.reduce<(string | number)[]>(
    (parts, [x0, y0], index, all) => {
      const [x1, y1] = all[(index + 1) % all.length]
      parts.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return parts
    },
    ['M', ...outline[0], 'Q'],
  )

  path.push('Z')
  return path.join(' ')
}
