import { BOARDBOOKS } from './boardbook/fixtures'
import { LESSONS } from './Lesson'

export type Slide = { path: string; title: string; kind: 'lesson' | 'boardbook' }

/** Every page as one deck, in the order the buttons step through. */
export const SLIDES: Slide[] = [
  ...LESSONS.map((lesson) => ({ path: `/lesson/${lesson.slug}`, title: lesson.title, kind: 'lesson' as const })),
  ...BOARDBOOKS.map((page) => ({ path: `/boardbook/${page.slug}`, title: page.title, kind: 'boardbook' as const })),
]
