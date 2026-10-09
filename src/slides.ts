import { BOARDBOOKS } from './boardbook/fixtures'
import { INTERACTIVE } from './interactive/fixtures'
import { LESSONS } from './Lesson'

export type Slide = { path: string; title: string; kind: 'lesson' | 'boardbook' | 'interactive' }

/** Every page as one deck, in the order the buttons step through. */
export const SLIDES: Slide[] = [
  ...LESSONS.map((lesson) => ({ path: `/lesson/${lesson.slug}`, title: lesson.title, kind: 'lesson' as const })),
  ...BOARDBOOKS.map((page) => ({ path: `/boardbook/${page.slug}`, title: page.title, kind: 'boardbook' as const })),
  ...INTERACTIVE.map((page) => ({ path: `/interactive/${page.slug}`, title: page.title, kind: 'interactive' as const })),
]
