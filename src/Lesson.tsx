import type { Point } from './annotation/coords'
import { COLORS, DEFAULT_STYLE } from './annotation/style'
import { mapPoints } from './annotation/geometry'
import type { Mark, Shape } from './annotation/types'

// Generated rather than thirty hand-typed points. `wobble` makes it a hand's
// circle rather than a compass's.
function ellipse(cx: number, cy: number, rx: number, ry: number, wobble = 0): Point[] {
  return Array.from({ length: 33 }, (_, step) => {
    const angle = (step / 32) * Math.PI * 2
    const r = 1 + Math.sin(step * 2.3) * wobble
    return { x: cx + Math.cos(angle) * rx * r, y: cy + Math.sin(angle) * ry * r }
  })
}

/**
 * A highlight, underline or strikethrough already on the page's words. Named
 * the way the surface names them itself — the nth paragraph of the article,
 * the words quoted — so it is found and drawn at first layout like one a
 * teacher made (ADR 0008). `boxes` is empty on purpose: placement fills it.
 */
function mark(id: string, kind: Mark['kind'], paragraph: number, exact: string, color: string): Mark {
  return {
    id,
    type: 'mark',
    kind,
    anchor: {
      target: {
        path: `:scope > div:nth-of-type(1) > article:nth-of-type(1) > p:nth-of-type(${paragraph})`,
        snippet: '',
        quote: { exact, prefix: '', suffix: '' },
      },
      origin: { x: 0, y: 0 },
      basis: { kind: 'font', value: 18 },
      surfaceWidth: 1280,
    },
    boxes: [],
    color,
    weight: DEFAULT_STYLE.weight,
    opacity: kind === 'highlight' ? 0.35 : 1,
  }
}

/** A paragraph, or one that opens with a lead-in the eye can find from across the room. */
export type Paragraph = string | { lead: string; text: string }

export type Lesson = {
  slug: string
  title: string
  body: Paragraph[]
  /** The second column — the thing that moves when the columns stack. */
  aside: {
    title: string
    body: string[]
    /** A picture above the text: something a shape can anchor to and scale with. */
    figure?: boolean
  }
  /** The popup and the fullscreen stage below the columns, each a surface of its own. */
  extras?: boolean
  /** Seeded, so a page can open with marks already on it. */
  shapes: Shape[]
}

const ink = { color: DEFAULT_STYLE.color, weight: DEFAULT_STYLE.weight, opacity: 1 }

/*
  The seeds below are authored against the card — 1280 units across it — and
  the surface is the whole slide, so they are mapped once here: the card is
  68% of the screen, centred, 32px down. Exact up to the width where the
  card's pixel cap takes over; elsewhere a seed lands a few pixels off and anchoring takes it from
  there.
*/
const CARD = { left: 205, top: 32, scale: 0.68 }

function onCard(shapes: Shape[]): Shape[] {
  return shapes.map((shape) => {
    const moved = mapPoints(shape, (point) => ({ x: CARD.left + point.x * CARD.scale, y: CARD.top + point.y * CARD.scale }))
    if (moved.type === 'text') return { ...moved, size: moved.size * CARD.scale }
    if ('weight' in moved) return { ...moved, weight: moved.weight * CARD.scale }
    return moved
  })
}

/*
  One slide per thing the board does, in the order a demo would show them,
  each with content made for it. The tools' own names are used as they appear
  on the bar.
*/
export const LESSONS: Lesson[] = [
  {
    slug: 'highlight',
    title: 'Highlight words',
    body: [
      {
        lead: 'Try it.',
        text: 'Pick the highlighter. In the bubble above it, turn Snap to words on. Then drag across a few words of the text below.',
      },
      'Honeybees do not see red. Their eyes are tuned to blue, green and ultraviolet, and many flowers that look plain to us carry ultraviolet patterns that point straight at the nectar. A bee reads a flower the way we read a sign.',
      'A single hive visits millions of flowers in a summer. Each worker bee makes about a twelfth of a teaspoon of honey in her whole life, and lives for around six weeks.',
      'When a bee finds a good patch of flowers she flies home and dances. The angle of the dance says which way to fly, and how long it lasts says how far.',
    ],
    aside: {
      title: 'What to notice',
      body: [
        'The mark takes the words, not the pixels. Make the window narrower: the text re-wraps, and the highlight wraps with it.',
        'Turn Snap off and the highlighter is ink again — broad, see-through, and stays exactly where it was drawn.',
      ],
    },
    // One already there, across a line break at most widths.
    shapes: onCard([mark('highlight-example', 'highlight', 2, 'ultraviolet patterns that point straight at the nectar', COLORS[2].value)]),
  },
  {
    slug: 'underline',
    title: 'Underline and strike through',
    body: [
      {
        lead: 'Try it.',
        text: 'Pick the pen. Under Words in its bubble, choose Strikethrough, and cross out the statements below that are false. Then choose Underline and underline the true ones.',
      },
      'Sound travels faster through water than through air.',
      'Lightning never strikes the same place twice.',
      'A day on Venus is longer than a year on Venus.',
      'Humans use only ten percent of their brains.',
      'The Great Wall of China is visible from the Moon with the naked eye.',
      'Octopuses have three hearts.',
    ],
    aside: {
      title: 'What to notice',
      body: [
        'A strikethrough sits through the middle of the words and an underline just under them, whatever the size of the text.',
        'Both follow their words: resize the window and they move with the line.',
        'Three of the six are false.',
      ],
    },
    // One of each, so the rest can be done by hand.
    shapes: onCard([
      mark('underline-example', 'underline', 2, 'Sound travels faster through water than through air.', COLORS[3].value),
      mark('strike-example', 'strikethrough', 3, 'Lightning never strikes the same place twice.', COLORS[0].value),
    ]),
  },
  {
    slug: 'shapes',
    title: 'Draw a shape',
    body: [
      {
        lead: 'Try it.',
        text: 'Pick the pen and, under Shapes in its bubble, turn Tidy shapes on. Draw a rough circle in the space below. Lift, and it is a circle.',
      },
      {
        lead: 'Or hold still.',
        text: 'Turn Tidy off again. Draw a box, and at the last corner hold the pen still for a moment. The clean box appears while you hold; let go to keep it, move to get your ink back.',
      },
      {
        lead: 'What it knows.',
        text: 'Circles, boxes, straight lines, single curves and arrows drawn in one stroke. Anything else stays as you drew it.',
      },
    ],
    aside: {
      title: 'What to notice',
      figure: true,
      body: [
        'A near-square becomes a square and a near-circle a circle, centred where you drew them.',
        'The shape keeps your colour and weight. Select it afterwards to change its border or give it a fill.',
      ],
    },
    // Before and after: a hand's circle, and what Tidy makes of one.
    shapes: onCard([
      { id: 'shapes-rough', type: 'stroke', points: ellipse(210, 760, 110, 92, 0.06), ...ink },
      { id: 'shapes-tidy', type: 'ellipse', from: { x: 440, y: 668 }, to: { x: 660, y: 852 }, ...ink, border: 'solid', fill: 'none' },
      { id: 'shapes-label-rough', type: 'text', at: { x: 170, y: 895 }, text: 'drawn', size: 18, color: DEFAULT_STYLE.color, opacity: 1 },
      { id: 'shapes-label-tidy', type: 'text', at: { x: 510, y: 895 }, text: 'tidied', size: 18, color: DEFAULT_STYLE.color, opacity: 1 },
    ]),
  },
  {
    slug: 'lines',
    title: 'Point at things',
    body: [
      {
        lead: 'Try it.',
        text: 'Pick the line tool. Under Heads in its bubble, choose Arrow at end. Draw from the word "overlap" to where the two circles meet in the picture.',
      },
      {
        lead: 'Bend it.',
        text: 'Draw a line, then pick the select tool and tap it. Drag the round handle at its middle and the line curves. Drag it back onto the line to straighten it.',
      },
      'Two sets can overlap. Everything in the middle belongs to both.',
    ],
    aside: {
      title: 'What to notice',
      figure: true,
      body: [
        'Each end of a line remembers what it points at. Resize the window: the text end follows the word and the picture end follows the picture.',
      ],
    },
    // Already pointing from the word to the picture, bent under the text on
    // its way; each end anchors at first layout.
    shapes: onCard([
      { id: 'lines-example', type: 'line', from: { x: 268, y: 466 }, to: { x: 790, y: 212 }, bend: { x: 760, y: 700 }, ...ink, color: COLORS[6].value, border: 'solid', heads: 'end' },
    ]),
  },
  {
    slug: 'select',
    title: 'Select and restyle',
    body: [
      {
        lead: 'Try it.',
        text: 'Pick the select tool and tap one of the shapes below. Its colour and weight show in the bubble; change them. Drag the shape to move it, or a corner handle to resize it.',
      },
      {
        lead: 'Stack them.',
        text: 'Drag the box over the circle, then use Bring to front and Send to back in the bubble to choose which is on top.',
      },
      {
        lead: 'Undo.',
        text: 'Every step is one undo. Delete a shape from the bubble, then undo from the bar.',
      },
    ],
    aside: {
      title: 'What to notice',
      body: ['A change to a selected shape also becomes the setting for the next one you draw, so you never pick a colour twice.'],
    },
    // Three shapes to find, in three colours, below the text.
    shapes: onCard([
      { id: 'select-circle', type: 'ellipse', from: { x: 70, y: 540 }, to: { x: 250, y: 690 }, ...ink, color: COLORS[6].value, border: 'solid', fill: 'none' },
      { id: 'select-box', type: 'rect', from: { x: 320, y: 550 }, to: { x: 540, y: 680 }, ...ink, color: COLORS[3].value, border: 'dashed', fill: 'tinted' },
      { id: 'select-arrow', type: 'line', from: { x: 600, y: 670 }, to: { x: 780, y: 560 }, ...ink, color: COLORS[1].value, border: 'solid', heads: 'end' },
    ]),
  },
  {
    slug: 'layers',
    title: 'Layers',
    extras: true,
    body: [
      {
        lead: 'Try it.',
        text: 'Draw something here on the page. Then open the diagram below and draw on it. Close it and open it again: the diagram has its marks, the page has yours, and neither has the other’s.',
      },
      {
        lead: 'Fullscreen too.',
        text: 'The stage at the bottom is a surface of its own. Go fullscreen, draw, come back — the marks stay with the stage.',
      },
      {
        lead: 'Why.',
        text: 'Marks belong to the thing they were drawn on: the page, a popup, a fullscreen view. A popup that opens over a lesson in a different place still shows its own marks.',
      },
    ],
    aside: {
      title: 'What to notice',
      body: ['With the whiteboard armed, a tap on Close still closes the popup — a tap is the page’s, a drag is the pen’s.'],
    },
    shapes: [],
  },
  {
    slug: 'reflow',
    title: 'Ink follows the text',
    body: [
      {
        lead: 'Try it.',
        text: 'Circle a word, underline a phrase, box the picture. Then make the window narrower until the right column drops under this one. Everything you drew goes with what it was drawn on.',
      },
      {
        lead: 'Why it matters.',
        text: 'A digital board is not the size of a laptop, and a lesson reflows between them. Marks stored as a place on the screen end up on the wrong words; these are stored against the words.',
      },
      'The circle around the title was drawn before this page was ever laid out. It found the title on its own.',
    ],
    aside: {
      title: 'Annotations follow the content',
      figure: true,
      body: [
        'Circle a word here, then make the window narrower until this column drops below the other one. The circle drops with it.',
        'A shape remembers what was under it — the words, or the picture — and is placed against wherever that is now, not against a fraction of the page.',
      ],
    },
    shapes: onCard([{ id: 'reflow-title', type: 'stroke', points: ellipse(300, 120, 300, 62), ...ink }]),
  },
  {
    slug: 'romeinen',
    title: 'De Romeinen in Nederland',
    body: [
      'Rond het jaar 50 voor Christus komen de Romeinen naar het gebied dat nu Nederland is. Ze veroveren het zuiden, tot aan de Rijn. Die rivier wordt de grens van het Romeinse Rijk: de limes.',
      'Langs de limes bouwen de Romeinen forten. Zo’n fort heet een castellum. In een castellum wonen soldaten die de grens bewaken. Bij Utrecht, Alphen aan den Rijn en Nijmegen zijn resten van castella gevonden.',
      'De Romeinen brengen veel nieuwe dingen mee: stenen huizen, wegen van steen, glas, geld en het schrift. Ook eten ze anders. Ze houden van kippen, kersen en wijn — dingen die hier nog niet waren.',
      'De mensen die hier al woonden, de Bataven en de Friezen, handelen met de Romeinen. Soms is er ruzie. In het jaar 69 komen de Bataven onder leiding van Julius Civilis in opstand. De opstand mislukt, maar wordt later een beroemd verhaal.',
      'Rond het jaar 400 vertrekken de Romeinen weer. Het rijk is te groot geworden om te verdedigen. Wat ze achterlaten, vinden we nog steeds terug in de grond: munten, scherven, wapens en zelfs schepen.',
    ],
    aside: {
      title: 'Begrippen',
      body: [
        'Limes — de grens van het Romeinse Rijk. In Nederland was dat de Rijn.',
        'Castellum — een Romeins fort waar soldaten woonden en de grens bewaakten.',
        'Bataven — een volk dat in de Betuwe woonde en met de Romeinen samenwerkte, tot de opstand van 69.',
        'Legioen — een leger van ongeveer vijfduizend Romeinse soldaten.',
      ],
    },
    shapes: [],
  },
]
