import type { RichTextDocument } from './richText'

/*
  Field for field the shapes app-react stores under an assignment block of type
  'boardbook' (src/typings/Redux/Assignment.d.ts there). Same names on purpose:
  a fixture written here drops into the real viewer unchanged, and vice versa.

  Positions and sizes are percentages of the background image's box, not
  pixels — the image is uploaded at whatever size it comes in.
*/

export type AssignmentBoardBookEntity = {
  images: {
    background: string
    answers?: string
  }
  items: BoardBookItemEntity[]
  focusAreas: BoardBookFocusAreaEntity[]
  answers: {
    answers: BoardBookAnswerEntity[]
    theme?: {
      fontFamily: string
      color: string
    }
  }
}

export type BoardBookFocusAreaEntity = {
  id: string
  x: number
  y: number
  height: number
  width: number
  order: number
  name?: string
}

export type BoardBookAnswerEntity = {
  id: string
  x: number
  y: number
  height: number
  width: number
  value: string
}

export type BoardBookItemEntity = {
  id: string
  x: number
  y: number
  height: number
  width: number
  theme: string
  itemIcon: string
  itemText?: string
  img?: string
  title?: string
  text?: RichTextDocument
  url?: {
    url: string
    text: string
  }
  audio?: string
}
