import type { Point } from './annotation/coords'
import { DEFAULT_STYLE } from './annotation/style'
import type { Shape } from './annotation/types'

// ponytail: generated rather than thirty hand-typed points. These stand in for
// real input until #2 lands the pen tool, then they go.
function ellipse(cx: number, cy: number, rx: number, ry: number): Point[] {
  return Array.from({ length: 33 }, (_, step) => {
    const angle = (step / 32) * Math.PI * 2
    return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry }
  })
}

function underline(from: number, to: number, y: number): Point[] {
  return Array.from({ length: 25 }, (_, step) => {
    const progress = step / 24
    return {
      x: from + (to - from) * progress,
      y: y + Math.sin(progress * Math.PI * 3) * 4,
    }
  })
}

export type Lesson = {
  slug: string
  title: string
  body: string[]
  /** The second column — the thing that moves when the columns stack. */
  aside: { title: string; body: string[] }
  /** Hardcoded until #2 — proves placement, scaling and scrolling. */
  shapes: Shape[]
}

const PARAGRAPHS = [
  'A whiteboard is only useful if what you draw stays where you drew it. Scroll this page and watch the annotation travel with the text underneath it, rather than staying stuck to the glass.',
  'Coordinates are stored against a fixed reference width and scaled on render, so the same annotation lands in the same place on a 1080p panel and a 4K one. Resize the window to see the stroke scale with the content.',
  'The annotation layer is rendered inside the surface element rather than over the whole app. Scroll position therefore needs no special handling at all — the browser moves the layer along with everything else in the document.',
  'Because the layer sits inside the element it annotates, stacking is free too. A surface declared inside a dialog paints above one declared on the page, for the same reason the dialog itself does.',
  'Nothing here captures pointer input yet. The layer is inert, so every link and button on this page still works normally with an annotation sitting on top of it.',
  'Drag across the red stroke to select the text underneath it. The annotation is painted over these words and the selection still works, because the layer never receives the event.',
]

export const LESSONS: Lesson[] = [
  {
    slug: 'one',
    title: 'Lesson one',
    body: PARAGRAPHS,
    aside: {
      title: 'Why annotations follow the words',
      body: [
        'Circle a word here, then make the window narrower until this column drops below the other one. The circle drops with it.',
        'A shape remembers what was under it — the words, or the picture — and is placed against wherever that is now, not against a fraction of the page.',
      ],
    },
    shapes: [
      { id: 'one-title', type: 'stroke', points: ellipse(215, 120, 195, 58), color: DEFAULT_STYLE.color, weight: DEFAULT_STYLE.weight, opacity: 1 },
      { id: 'one-body', type: 'stroke', points: underline(60, 640, 505), color: DEFAULT_STYLE.color, weight: DEFAULT_STYLE.weight, opacity: 1 },
    ],
  },
  {
    slug: 'two',
    title: 'Lesson two',
    body: [...PARAGRAPHS].reverse(),
    aside: {
      title: 'The same, reversed',
      body: ['Same page, paragraphs in the other order. Annotations belong to the lesson, so the two pages start empty of each other.'],
    },
    shapes: [
      { id: 'two-body', type: 'stroke', points: underline(60, 900, 330), color: DEFAULT_STYLE.color, weight: DEFAULT_STYLE.weight, opacity: 1 },
    ],
  },
]
