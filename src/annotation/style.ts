import type { BorderStyle, FillStyle, Shape } from './types'

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
export type Style = {
  color: string
  weight: number
  /** Cap height for text, in reference space. */
  textSize: number
  border: BorderStyle
  fill: FillStyle
  opacity: number
}

export type Swatch = { name: string; value: string }

/**
 * Chosen to stay legible on a projector and on both light and dark board
 * themes, which rules out anything approaching either end of the range.
 */
export const COLORS: Swatch[] = [
  { name: 'Red', value: '#e5484d' },
  { name: 'Orange', value: '#f76808' },
  { name: 'Green', value: '#30a46c' },
  { name: 'Blue', value: '#3e63dd' },
  { name: 'Violet', value: '#8e4ec6' },
  { name: 'Slate', value: '#8b8d98' },
]

export const WEIGHTS: { name: string; value: number }[] = [
  { name: 'Thin', value: 4 },
  { name: 'Medium', value: 9 },
  { name: 'Thick', value: 18 },
]

export const TEXT_SIZES: { name: string; value: number }[] = [
  { name: 'Small', value: 20 },
  { name: 'Medium', value: 30 },
  { name: 'Large', value: 46 },
]

export const BORDERS: { name: string; value: BorderStyle }[] = [
  { name: 'Solid', value: 'solid' },
  { name: 'Dashed', value: 'dashed' },
  { name: 'Dotted', value: 'dotted' },
]

export const FILLS: { name: string; value: FillStyle }[] = [
  { name: 'No fill', value: 'none' },
  { name: 'Tinted', value: 'tinted' },
  { name: 'Solid fill', value: 'solid' },
]

/**
 * A tinted shape has to stay readable over lesson text, so the lightest option
 * is a wash rather than a colour.
 */
export const TINT_OPACITY = 0.18

export const OPACITIES: { name: string; value: number }[] = [
  { name: 'Faint', value: 0.25 },
  { name: 'Half', value: 0.5 },
  { name: 'Full', value: 1 },
]

export const DEFAULT_STYLE: Style = {
  color: COLORS[0].value,
  weight: WEIGHTS[1].value,
  textSize: TEXT_SIZES[1].value,
  border: 'solid',
  fill: 'none',
  opacity: 1,
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
      }
  }
}

/** What a shape's settings currently are, for the toolbar to show. */
export function styleOf(shape: Shape): Partial<Style> {
  switch (shape.type) {
    case 'timer':
      return { opacity: shape.opacity }

    case 'text':
      return { color: shape.color, textSize: shape.size, opacity: shape.opacity }

    case 'stroke':
      return { color: shape.color, weight: shape.weight, opacity: shape.opacity }

    default:
      return {
        color: shape.color,
        weight: shape.weight,
        opacity: shape.opacity,
        border: shape.border,
        ...(canFill(shape) ? { fill: shape.fill ?? 'none' } : {}),
      }
  }
}
