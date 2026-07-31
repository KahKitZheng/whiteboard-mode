import { REFERENCE_WIDTH } from './coords'
import { mapPoints } from './geometry'
import type { Shape } from './types'

/**
 * Every read and write goes through these two functions. Swapping
 * sessionStorage for an API is a change to this file and nothing else.
 * See docs/adr/0002-reference-width-normalized-coordinates.md for `refWidth`.
 */
const VERSION = 1

export type StoredSurface = {
  version: number
  refWidth: number
  shapes: Shape[]
}

function key(surfaceId: string): string {
  return `wb:${surfaceId}`
}

// ponytail: sessionStorage until #3's follow-up puts this behind an API. Absent
// in tests and during SSR, so every call tolerates it missing.
function store(): Storage | null {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage
}

export function load(surfaceId: string): Shape[] | null {
  const raw = store()?.getItem(key(surfaceId))
  if (!raw) return null

  let stored: StoredSurface
  try {
    stored = JSON.parse(raw)
  } catch {
    return null
  }

  if (stored.version !== VERSION || !Array.isArray(stored.shapes)) return null

  // A stored reference width that isn't the current one would silently misplace
  // every shape. Rescale instead.
  if (stored.refWidth !== REFERENCE_WIDTH) {
    const factor = REFERENCE_WIDTH / stored.refWidth
    return stored.shapes.map((shape) =>
      mapPoints(shape, (point) => ({ x: point.x * factor, y: point.y * factor })),
    )
  }

  return stored.shapes
}

export function save(surfaceId: string, shapes: Shape[]): void {
  const stored: StoredSurface = { version: VERSION, refWidth: REFERENCE_WIDTH, shapes }
  try {
    store()?.setItem(key(surfaceId), JSON.stringify(stored))
  } catch {
    // Quota exceeded or storage disabled. Losing a save is better than losing
    // the stroke the teacher is drawing.
  }
}
