import type { BoardBookItemEntity } from '../boardbook/types'

/** What the panel edits — what its save and cancel are about. Position is the stage's. */
const FIELDS = ['title', 'text', 'img', 'audio', 'itemIcon', 'theme', 'itemText'] as const

export function snapshot(item: BoardBookItemEntity): string {
  return JSON.stringify(Object.fromEntries(FIELDS.map((field) => [field, item[field]])))
}
