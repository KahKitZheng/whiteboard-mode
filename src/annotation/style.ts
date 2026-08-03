import type { Shape } from './types'

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

export const DEFAULT_STYLE: Style = {
  color: COLORS[0].value,
  weight: WEIGHTS[1].value,
  textSize: TEXT_SIZES[1].value,
}

/**
 * Applying a style to a shape that has one. Not every setting means something
 * to every shape — a label has no border weight, a timer draws itself — so a
 * patch only touches what applies.
 */
export function restyle(shape: Shape, patch: Partial<Style>): Shape {
  switch (shape.type) {
    case 'timer':
      return shape

    case 'text':
      return {
        ...shape,
        ...(patch.color === undefined ? {} : { color: patch.color }),
        ...(patch.textSize === undefined ? {} : { size: patch.textSize }),
      }

    default:
      return {
        ...shape,
        ...(patch.color === undefined ? {} : { color: patch.color }),
        ...(patch.weight === undefined ? {} : { weight: patch.weight }),
      }
  }
}

/** What a shape's settings currently are, for the toolbar to show. */
export function styleOf(shape: Shape): Partial<Style> | null {
  switch (shape.type) {
    case 'timer':
      return null
    case 'text':
      return { color: shape.color, textSize: shape.size }
    default:
      return { color: shape.color, weight: shape.weight }
  }
}
