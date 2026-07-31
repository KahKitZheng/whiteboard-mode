/**
 * Shape coordinates are stored against a fixed reference width and scaled on
 * render, so a surface renders the same annotations at any board resolution.
 * See docs/adr/0002-reference-width-normalized-coordinates.md.
 */
export const REFERENCE_WIDTH = 1280

export type Point = { x: number; y: number }

/** How far stored coordinates are stretched to fit a surface of this width. */
export function scaleFor(surfaceWidth: number): number {
  return surfaceWidth / REFERENCE_WIDTH
}

/** Surface-relative pixels -> stored reference space. */
export function toReference(point: Point, surfaceWidth: number): Point {
  const scale = scaleFor(surfaceWidth)
  return { x: point.x / scale, y: point.y / scale }
}

/** Stored reference space -> surface-relative pixels. */
export function toScreen(point: Point, surfaceWidth: number): Point {
  const scale = scaleFor(surfaceWidth)
  return { x: point.x * scale, y: point.y * scale }
}
