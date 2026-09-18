import type { TextLine } from './TextLayer'
import type { AssignmentBoardBookEntity } from './types'
import { WATERKRINGLOOP_TEXT } from './waterkringloop.text'

/**
 * What the assignment API would hand a boardbook viewer, minus the editor's
 * filestack URLs. Served from public/ so a test run never leaves localhost.
 */
export type BoardBookPage = {
  slug: string
  title: string
  /** Stands in for the assignment id the real viewer keys everything on. */
  assignmentId: number
  boardbook: AssignmentBoardBookEntity
  /**
   * What a page job would extract from an uploaded PDF (pdf.js
   * `getTextContent`); here, read off the fixture SVG by `npm run text`.
   */
  text?: TextLine[]
}

export const BOARDBOOKS: BoardBookPage[] = [
  {
    slug: 'waterkringloop',
    title: 'De waterkringloop',
    assignmentId: 80042,
    text: WATERKRINGLOOP_TEXT,
    boardbook: {
      images: { background: '/boardbook/tiles/waterkringloop.dzi' },
      items: [
        {
          id: 'i1',
          x: 52,
          y: 55,
          width: 4,
          height: 5.6,
          theme: 'dark',
          itemIcon: '1',
          title: 'Verdamping',
          text: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'De zon verwarmt het zeewater. ' },
                  { type: 'text', text: 'Waterdamp', marks: [{ type: 'bold' }] },
                  { type: 'text', text: ' stijgt op — je ziet het niet, maar het is er wel.' },
                ],
              },
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Op een warme zomerdag verdampt er uit de Noordzee meer water dan er in Nederland aan regen valt.' }],
              },
            ],
          },
        },
        {
          id: 'i2',
          x: 61,
          y: 12,
          width: 4,
          height: 5.6,
          theme: 'light',
          itemIcon: '2',
          title: 'Condensatie',
          img: '/boardbook/wolk.svg',
          text: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'Hoog in de lucht koelt waterdamp af en wordt het weer vloeibaar: ' },
                  { type: 'text', text: 'condensatie', marks: [{ type: 'italic' }] },
                  { type: 'text', text: '. Miljarden druppeltjes samen vormen een wolk.' },
                ],
              },
            ],
          },
        },
        {
          id: 'i3',
          x: 84,
          y: 2.5,
          width: 4,
          height: 5.6,
          theme: 'dark',
          itemIcon: 'play',
          title: 'Video: de waterkringloop',
          url: { url: 'https://schooltv.nl/video/de-waterkringloop', text: 'Bekijk de video (3 min)' },
        },
        {
          id: 'i4',
          x: 5,
          y: 68.5,
          width: 14.4,
          height: 4.2,
          theme: 'dark',
          itemIcon: 'book',
          itemText: 'Woordenlijst',
          title: 'Woordenlijst',
          text: {
            type: 'doc',
            content: [
              {
                type: 'bulletList',
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          { type: 'text', text: 'verdampen', marks: [{ type: 'bold' }] },
                          { type: 'text', text: ' — van vloeistof in gas veranderen' },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          { type: 'text', text: 'condenseren', marks: [{ type: 'bold' }] },
                          { type: 'text', text: ' — van gas in vloeistof veranderen' },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          { type: 'text', text: 'neerslag', marks: [{ type: 'bold' }] },
                          { type: 'text', text: ' — regen, hagel of sneeuw' },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
      focusAreas: [
        // Stored out of order on purpose — the walkthrough sorts by `order`.
        { id: 'f3', x: 4, y: 76.5, width: 92, height: 19.5, order: 3, name: 'Opdracht 3' },
        { id: 'f1', x: 48.5, y: 11.5, width: 48, height: 58, order: 1, name: 'De kringloop' },
        { id: 'f2', x: 4, y: 32, width: 43, height: 31, order: 2, name: 'Verdamping en neerslag' },
      ],
      answers: { answers: [] },
    },
  },
]
