import { scaleFor } from './coords'
import { bounds, cornerPoint, CORNERS, HANDLE_REACH } from './geometry'
import type { Shape } from './types'

export function SelectionOverlay({ shape, width }: { shape: Shape; width: number }) {
  const scale = scaleFor(width)
  const box = bounds(shape)
  const size = HANDLE_REACH * scale

  return (
    <g className="selection" aria-hidden="true">
      <rect
        x={box.minX * scale}
        y={box.minY * scale}
        width={(box.maxX - box.minX) * scale}
        height={(box.maxY - box.minY) * scale}
        strokeWidth={Math.max(1, 1.5 * scale)}
      />
      {CORNERS.map((corner) => {
        const at = cornerPoint(box, corner)
        return (
          <rect
            key={corner}
            className="handle"
            x={at.x * scale - size / 2}
            y={at.y * scale - size / 2}
            width={size}
            height={size}
          />
        )
      })}
    </g>
  )
}
