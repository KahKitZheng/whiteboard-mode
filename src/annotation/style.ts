import type { BorderStyle, FillStyle, Heads, Shape } from './types'

/**
 * What a shape looks like, as opposed to where it is. Kept apart from geometry
 * because every tool shares it: a colour means the same thing to a stroke, a
 * rectangle and a label, so the toolbar offers one control rather than one per
 * tool.
 *
 * Weight is a full stroke width in reference space, which is what makes a thick
 * pen stroke and a thick rectangle border read as the same thickness —
 * perfect-freehand's `size` and SVG's `stroke-width` both mean the same thing.
 */
/**
 * What the pen does over words. Free is ink; the other two turn the stroke
 * into a mark on the words it passes over (ADR 0008).
 */
export type PenMark = 'none' | 'underline' | 'strikethrough'

export type Style = {
  color: string
  weight: number
  /** The highlighter's own width: a chisel tip is a different instrument from a nib, on its own scale. */
  highlightWeight: number
  /** Cap height for text, in reference space. */
  textSize: number
  border: BorderStyle
  fill: FillStyle
  /** Lines: arrowheads at neither end, the far end, or both. */
  heads: Heads
  opacity: number
  /** Highlighter: mark the words under the drag rather than laying ink over them. */
  snap: boolean
  penMark: PenMark
  /** Pen: a stroke that was nearly a circle, box, line, curve or arrow becomes one (ADR 0009). */
  tidy: boolean
}

/** `labelKey` is a key in the whiteboard locale files, translated where the option is shown. */
export type Swatch = { labelKey: string; value: string }

/**
 * Chosen to stay legible on a projector and on both light and dark board
 * themes, which rules out anything approaching either end of the range.
 */
export const COLORS: Swatch[] = [
  { labelKey: 'style.colour.red', value: '#e5484d' },
  { labelKey: 'style.colour.orange', value: '#f76808' },
  { labelKey: 'style.colour.amber', value: '#ffb224' },
  { labelKey: 'style.colour.green', value: '#30a46c' },
  { labelKey: 'style.colour.teal', value: '#12a594' },
  { labelKey: 'style.colour.cyan', value: '#00a2c7' },
  { labelKey: 'style.colour.blue', value: '#3e63dd' },
  { labelKey: 'style.colour.indigo', value: '#5b5bd6' },
  { labelKey: 'style.colour.violet', value: '#8e4ec6' },
  { labelKey: 'style.colour.pink', value: '#e93d82' },
  { labelKey: 'style.colour.brown', value: '#ad7f58' },
  { labelKey: 'style.colour.slate', value: '#8b8d98' },
]

/*
  Four to a row, matching the colour grid above them. Three left every settings
  row a different width from the twelve swatches, and a panel of rows that each
  stop somewhere else reads as unfinished.
*/
export const WEIGHTS: { labelKey: string; value: number }[] = [
  { labelKey: 'style.weight.thin', value: 4 },
  { labelKey: 'style.weight.medium', value: 9 },
  { labelKey: 'style.weight.thick', value: 15 },
  { labelKey: 'style.weight.extraThick', value: 22 },
]

/**
 * The highlighter's widths, in reference units: a line of body text is about
 * 26 tall, so the second covers a line, the third a heading's, and the top is
 * a fat marker without being a paint roller.
 */
export const HIGHLIGHT_WEIGHTS: { labelKey: string; value: number }[] = [
  { labelKey: 'style.weight.thin', value: 16 },
  { labelKey: 'style.weight.medium', value: 26 },
  { labelKey: 'style.weight.thick', value: 38 },
  { labelKey: 'style.weight.extraThick', value: 52 },
]

export const TEXT_SIZES: { labelKey: string; value: number }[] = [
  { labelKey: 'style.textSize.small', value: 20 },
  { labelKey: 'style.textSize.medium', value: 30 },
  { labelKey: 'style.textSize.large', value: 46 },
  { labelKey: 'style.textSize.extraLarge', value: 64 },
]

export const BORDERS: { labelKey: string; value: BorderStyle }[] = [
  { labelKey: 'style.border.solid', value: 'solid' },
  { labelKey: 'style.border.dashed', value: 'dashed' },
  { labelKey: 'style.border.dotted', value: 'dotted' },
]

export const HEADS: { labelKey: string; value: Heads }[] = [
  { labelKey: 'style.heads.none', value: 'none' },
  { labelKey: 'style.heads.end', value: 'end' },
  { labelKey: 'style.heads.both', value: 'both' },
]

export const FILLS: { labelKey: string; value: FillStyle }[] = [
  { labelKey: 'style.fill.none', value: 'none' },
  { labelKey: 'style.fill.tinted', value: 'tinted' },
  { labelKey: 'style.fill.solid', value: 'solid' },
]

/**
 * A tinted shape has to stay readable over lesson text, so the lightest option
 * is a wash rather than a colour.
 */
export const TINT_OPACITY = 0.18

export const SNAP_MODES: { labelKey: string; value: boolean }[] = [
  { labelKey: 'style.free', value: false },
  { labelKey: 'style.snapToWords', value: true },
]

export const SHAPE_MODES: { labelKey: string; value: boolean }[] = [
  { labelKey: 'style.free', value: false },
  { labelKey: 'style.tidyShapes', value: true },
]

export const PEN_MARKS: { labelKey: string; value: PenMark }[] = [
  { labelKey: 'style.free', value: 'none' },
  { labelKey: 'style.underline', value: 'underline' },
  { labelKey: 'style.strikethrough', value: 'strikethrough' },
]

export const DEFAULT_STYLE: Style = {
  color: COLORS[0].value,
  // Thin, both: a board is big and a fine line reads fine from the back.
  weight: WEIGHTS[0].value,
  highlightWeight: HIGHLIGHT_WEIGHTS[0].value,
  textSize: TEXT_SIZES[1].value,
  border: 'solid',
  fill: 'none',
  heads: 'none',
  opacity: 1,
  // Opt in: a teacher who wants ink gets ink.
  snap: false,
  penMark: 'none',
  tidy: false,
}

/**
 * The next style after a change. Two of the pen's options cannot both hold:
 * a stroke that is tidied into a shape cannot also be an underline of the
 * words it crossed. Turning one on turns the other off.
 */
export function applyStyle(current: Style, patch: Partial<Style>): Style {
  const next = { ...current, ...patch }
  if (patch.tidy) next.penMark = 'none'
  if (patch.penMark && patch.penMark !== 'none') next.tidy = false
  return next
}

/** Closed shapes are the only ones with an inside to fill. */
export function canFill(shape: Shape): boolean {
  return shape.type === 'rect' || shape.type === 'ellipse'
}

/**
 * Applying a style to a shape that has one. Not every setting means something
 * to every shape — a label has no border, a line has no inside, a timer draws
 * itself — so a patch only touches what applies.
 */
export function restyle(shape: Shape, patch: Partial<Style>): Shape {
  const opacity = patch.opacity === undefined ? {} : { opacity: patch.opacity }
  const color = patch.color === undefined ? {} : { color: patch.color }

  switch (shape.type) {
    // A widget draws itself; all it takes is how solid it is.
    case 'timer':
      return { ...shape, ...opacity }

    // A note's colour is its paper.
    case 'note':
      return { ...shape, ...color, ...opacity }

    case 'text':
      return {
        ...shape,
        ...color,
        ...opacity,
        ...(patch.textSize === undefined ? {} : { size: patch.textSize }),
      }

    case 'stroke':
      return {
        ...shape,
        ...color,
        ...opacity,
        // A highlight is on the highlighter's scale, a stroke on the pen's.
        ...(shape.highlight
          ? patch.highlightWeight === undefined
            ? {}
            : { weight: patch.highlightWeight }
          : patch.weight === undefined
            ? {}
            : { weight: patch.weight }),
      }

    case 'mark':
      return {
        ...shape,
        ...color,
        ...opacity,
        ...(patch.weight === undefined ? {} : { weight: patch.weight }),
      }

    default:
      return {
        ...shape,
        ...color,
        ...opacity,
        ...(patch.weight === undefined ? {} : { weight: patch.weight }),
        ...(patch.border === undefined ? {} : { border: patch.border }),
        ...(patch.fill === undefined || !canFill(shape) ? {} : { fill: patch.fill }),
        ...(patch.heads === undefined || shape.type !== 'line' ? {} : { heads: patch.heads }),
      }
  }
}

/** What a shape's settings currently are, for the toolbar to show. */
export function styleOf(shape: Shape): Partial<Style> {
  switch (shape.type) {
    case 'timer':
      return { opacity: shape.opacity }

    case 'note':
      return { color: shape.color, opacity: shape.opacity }

    case 'text':
      return { color: shape.color, textSize: shape.size, opacity: shape.opacity }

    case 'stroke':
      return shape.highlight
        ? { color: shape.color, highlightWeight: shape.weight, opacity: shape.opacity }
        : { color: shape.color, weight: shape.weight, opacity: shape.opacity }

    case 'mark':
      return { color: shape.color, weight: shape.weight, opacity: shape.opacity }

    default:
      return {
        color: shape.color,
        weight: shape.weight,
        opacity: shape.opacity,
        border: shape.border,
        ...(canFill(shape) ? { fill: shape.fill ?? 'none' } : {}),
        ...(shape.type === 'line' ? { heads: shape.heads ?? 'none' } : {}),
      }
  }
}
