import type { AssignmentBoardBookEntity } from '../boardbook/types'

/**
 * A boardbook with pop-ups and no focus areas: the shape the assignment API
 * hands the viewer, so a page saved by the editor here would load there.
 */
export type InteractivePage = {
  slug: string
  title: string
  boardbook: AssignmentBoardBookEntity
}

export const INTERACTIVE: InteractivePage[] = [
  {
    slug: 'reis-rond-de-wereld',
    title: 'Reis rond de wereld',
    boardbook: {
      images: { background: '/interactive/wereld.svg' },
      focusAreas: [],
      answers: { answers: [] },
      items: [
        {
          id: 'p1',
          x: 18,
          y: 26,
          width: 4,
          height: 6.4,
          theme: 'dark',
          itemIcon: '1',
          title: 'Noord-Amerika',
          text: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'Het derde continent in grootte. De ' },
                  { type: 'text', text: 'Grand Canyon', marks: [{ type: 'bold' }] },
                  { type: 'text', text: ' is op sommige plekken 1800 meter diep.' },
                ],
              },
            ],
          },
        },
        {
          id: 'p2',
          x: 48,
          y: 18,
          width: 4,
          height: 6.4,
          theme: 'light',
          itemIcon: '2',
          title: 'Europa',
          img: '/boardbook/wolk.svg',
          text: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  { type: 'text', text: 'Klein, maar met meer dan veertig landen. Nederland ligt aan de ' },
                  { type: 'text', text: 'Noordzee', marks: [{ type: 'italic' }] },
                  { type: 'text', text: '.' },
                ],
              },
            ],
          },
        },
        {
          id: 'p3',
          x: 68,
          y: 24,
          width: 4,
          height: 6.4,
          theme: 'dark',
          itemIcon: 'plus',
          itemText: 'Azië',
          title: 'Azië',
          text: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Het grootste continent: meer dan de helft van alle mensen op aarde woont hier.' }],
              },
            ],
          },
        },
      ],
    },
  },
]
