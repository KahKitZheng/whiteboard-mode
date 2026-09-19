import type { Point } from './annotation/coords'
import { DEFAULT_STYLE } from './annotation/style'
import type { Shape } from './annotation/types'

// Generated rather than thirty hand-typed points: a seeded circle around the title.
function ellipse(cx: number, cy: number, rx: number, ry: number): Point[] {
  return Array.from({ length: 33 }, (_, step) => {
    const angle = (step / 32) * Math.PI * 2
    return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry }
  })
}

/** A paragraph, or one that opens with a lead-in the eye can find from across the room. */
export type Paragraph = string | { lead: string; text: string }

export type Lesson = {
  slug: string
  title: string
  body: Paragraph[]
  /** The second column — the thing that moves when the columns stack. */
  aside: { title: string; body: string[] }
  /** Seeded, so a page can open with marks already on it. */
  shapes: Shape[]
}

export const LESSONS: Lesson[] = [
  {
    slug: 'one',
    title: 'Try the board',
    body: [
      'This page is a tour of the whiteboard. Press any tool on the bar below to arm it; press the switch to put the pen down and hand the page back.',
      {
        lead: 'Highlight words.',
        text: 'Pick the highlighter and, in the bubble above it, turn Snap to words on. Drag across a sentence: the mark takes the words, not the pixels. Make the window narrower and it re-wraps with them. With Snap off, the highlighter is plain ink.',
      },
      {
        lead: 'Underline and strike through.',
        text: 'The pen has the same option under Words. An underline drawn over a phrase follows that phrase wherever the text goes.',
      },
      {
        lead: 'Draw a shape.',
        text: 'With the pen, turn Tidy shapes on and draw a rough circle or a box; it becomes a clean one when you lift. Or leave it off and hold the pen still at the end of a stroke: the shape is previewed while you hold, and drawn when you let go.',
      },
      {
        lead: 'Point at things.',
        text: 'The line tool draws straight, or with an arrowhead from its Heads setting. Draw a curve and it bends; select a line and drag the handle at its middle to bend it by hand.',
      },
      {
        lead: 'Select, restyle, delete.',
        text: 'With the select tool, tap a shape. Its colour and weight appear in the bubble, and so do bring to front, send to back and delete. Drag it to move it, or a corner to resize it.',
      },
      {
        lead: 'Every layer keeps its own marks.',
        text: 'Open the diagram below, or go fullscreen, and draw there. Those marks belong to the popup or the stage, and the page underneath is untouched.',
      },
    ],
    aside: {
      title: 'Annotations follow the content',
      body: [
        'Circle a word here, then make the window narrower until this column drops below the other one. The circle drops with it.',
        'A shape remembers what was under it — the words, or the picture — and is placed against wherever that is now, not against a fraction of the page.',
      ],
    },
    // One mark already on the page, so it opens looking used: a circle around the title.
    shapes: [{ id: 'one-title', type: 'stroke', points: ellipse(255, 120, 245, 58), color: DEFAULT_STYLE.color, weight: DEFAULT_STYLE.weight, opacity: 1 }],
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
