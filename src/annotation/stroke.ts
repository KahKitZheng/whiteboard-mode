import getStroke from 'perfect-freehand'
import { scaleFor, type Point } from './coords'

/*
  One width from end to end. Thinning — width following the pen's speed — is
  what makes ink look like ink, but on a board it read as ragged: a stroke
  thinned wherever the hand moved fast and tapered away at both ends, so the
  first and last words under a highlight came out barely covered. A felt tip,
  not a nib. Smoothing rounds the corners a hand cannot; streamlining steadies
  the live line by dragging each point a little toward the one before.
*/
const OPTIONS = {
  thinning: 0,
  smoothing: 0.65,
  streamline: 0.5,
}

/**
 * A mark's line is computed, not drawn: its ends are exactly where the words
 * end. Streamlining would pull those ends a word short.
 */
const MARK_OPTIONS = { ...OPTIONS, streamline: 0 }

export type Nib = 'pen' | 'highlighter' | 'mark'

function optionsFor(nib: Nib) {
  return nib === 'mark' ? MARK_OPTIONS : OPTIONS
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
