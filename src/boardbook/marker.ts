import type { CSSProperties } from 'react'
import { percentToImage, type Size } from './coords'
import type { BoardBookItemEntity } from './types'

/**
 * The real viewer draws an icon marker at 80% of its authored box, round, and
 * a text marker filling the box. Same here, so a page authored there lands
 * here with its markers the same size — except that a text marker may grow
 * past its box to fit its label, since the editor here sizes boxes square.
 */
const ICON_FRACTION = 0.8

export function markerKind(item: BoardBookItemEntity): 'text' | 'icon' {
  return item.itemText ? 'text' : 'icon'
}

/**
 * Where a marker sits and how big it is, in CSS: placed by percentage of the
 * image's box, like the data says; sized in pixels from that percentage at
 * `homeWidth`, how wide the image is on screen at rest.
 */
export function markerStyle(item: BoardBookItemEntity, image: Size, homeWidth: number): CSSProperties {
  const box = percentToImage(item, image)
  const scale = homeWidth / image.width
  const side = Math.min(box.width, box.height) * scale * ICON_FRACTION
  const size = markerKind(item) === 'icon' ? { width: side, height: side } : { minWidth: box.width * scale, height: box.height * scale }
  return { ...size, fontSize: size.height * 0.5, left: `${item.x + item.width / 2}%`, top: `${item.y + item.height / 2}%` }
}

export function markerLabel(item: BoardBookItemEntity): string {
  return item.title ?? item.itemText ?? `Item ${item.itemIcon}`
}
