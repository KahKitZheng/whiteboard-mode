import { scaleFor } from './coords'
import { bendHandle, bounds, cornerPoint, CORNERS, HANDLE_REACH } from './geometry'
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
      {/* A line bends from its middle; the round handle says "this one is different". */}
      {shape.type === 'line' && (
        <circle className="handle" cx={bendHandle(shape).x * scale} cy={bendHandle(shape).y * scale} r={size / 2} />
      )}
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
