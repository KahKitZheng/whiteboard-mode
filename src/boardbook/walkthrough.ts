import type { BoardBookFocusAreaEntity } from './types'

/**
 * What to call an area in the chrome. The CMS numbers areas and defaults the
 * name to that number; a name that is only the number again says nothing the
 * badge on the area doesn't.
 */
export function areaLabel(area: BoardBookFocusAreaEntity): string {
  return area.name && area.name !== String(area.order) ? area.name : `Focus area ${area.order}`
}

/** The walkthrough's order, whatever order the editor happened to save them in. */
export function byOrder(areas: BoardBookFocusAreaEntity[]): BoardBookFocusAreaEntity[] {
  return [...areas].sort((a, b) => a.order - b.order)
}

/**
 * The area one step from the current one, or null at either end. With nothing
 * current, "next" starts the walkthrough and "previous" has nowhere to go.
 */
export function neighbour(
  ordered: BoardBookFocusAreaEntity[],
  currentId: string | null,
  direction: 'previous' | 'next',
): BoardBookFocusAreaEntity | null {
  const index = ordered.findIndex((area) => area.id === currentId)
  if (index === -1) return direction === 'next' ? (ordered[0] ?? null) : null

  return ordered[direction === 'next' ? index + 1 : index - 1] ?? null
}
