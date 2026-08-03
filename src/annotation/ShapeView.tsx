import { scaleFor, type Point } from './coords'
import { TINT_OPACITY } from './style'
import { strokePath } from './stroke'
import { Timer } from './Timer'
import type { BorderStyle, FillStyle, Shape } from './types'

const ARROWHEAD = 4

/**
 * Dash lengths are multiples of the line's own width, so a dashed thin line and
 * a dashed thick one read as the same pattern rather than the thick one looking
 * nearly solid. A dot is a zero-length dash relying on the round cap the layer
 * already sets.
 */
function dashes(border: BorderStyle, width: number): string | undefined {
  if (border === 'dashed') return `${width * 2.5} ${width * 1.75}`
  if (border === 'dotted') return `0 ${width * 2}`
  return undefined
}

/** A tinted shape is a wash, so lesson text underneath stays readable. */
function fillOf(fill: FillStyle | undefined, color: string) {
  if (fill === 'solid') return { fill: color }
  if (fill === 'tinted') return { fill: color, fillOpacity: TINT_OPACITY }
  return { fill: 'none' }
}

/** One render branch per shape type — the only place shape types are drawn. */
export function ShapeView({ shape, width }: { shape: Shape; width: number }) {
  const scale = scaleFor(width)
  const at = (point: Point): Point => ({ x: point.x * scale, y: point.y * scale })

  switch (shape.type) {
    case 'stroke':
      return (
        <path
          d={strokePath(shape.points, width, shape.weight)}
          fill={shape.color}
          opacity={shape.opacity}
        />
      )

    case 'rect': {
      const from = at(shape.from)
      const to = at(shape.to)
      const line = shape.weight * scale
      return (
        <rect
          x={Math.min(from.x, to.x)}
          y={Math.min(from.y, to.y)}
          width={Math.abs(to.x - from.x)}
          height={Math.abs(to.y - from.y)}
          stroke={shape.color}
          strokeWidth={line}
          strokeDasharray={dashes(shape.border, line)}
          opacity={shape.opacity}
          {...fillOf(shape.fill, shape.color)}
        />
      )
    }

    case 'ellipse': {
      const from = at(shape.from)
      const to = at(shape.to)
      const line = shape.weight * scale
      return (
        <ellipse
          cx={(from.x + to.x) / 2}
          cy={(from.y + to.y) / 2}
          rx={Math.abs(to.x - from.x) / 2}
          ry={Math.abs(to.y - from.y) / 2}
          stroke={shape.color}
          strokeWidth={line}
          strokeDasharray={dashes(shape.border, line)}
          opacity={shape.opacity}
          {...fillOf(shape.fill, shape.color)}
        />
      )
    }

    case 'line': {
      const from = at(shape.from)
      const to = at(shape.to)
      const line = shape.weight * scale
      return (
        <line
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          fill="none"
          stroke={shape.color}
          strokeWidth={line}
          strokeDasharray={dashes(shape.border, line)}
          opacity={shape.opacity}
        />
      )
    }

    case 'arrow': {
      const from = at(shape.from)
      const to = at(shape.to)
      const line = shape.weight * scale
      const angle = Math.atan2(to.y - from.y, to.x - from.x)
      // Proportional to the line, so a thick arrow gets a head to match rather
      // than the same small one on every weight.
      const head = ARROWHEAD * line
      const wing = (spread: number) => ({
        x: to.x - Math.cos(angle + spread) * head,
        y: to.y - Math.sin(angle + spread) * head,
      })
      const left = wing(Math.PI / 7)
      const right = wing(-Math.PI / 7)

      return (
        <g fill="none" stroke={shape.color} strokeWidth={line} opacity={shape.opacity}>
          {/* The shaft carries the dash; a dashed arrowhead just looks broken. */}
          <line
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            strokeDasharray={dashes(shape.border, line)}
          />
          <polyline points={`${left.x},${left.y} ${to.x},${to.y} ${right.x},${right.y}`} />
        </g>
      )
    }

    case 'text': {
      const at_ = at(shape.at)
      return (
        <text
          x={at_.x}
          y={at_.y}
          fontSize={shape.size * scale}
          fill={shape.color}
          opacity={shape.opacity}
          xmlSpace="preserve"
        >
          {shape.text}
        </text>
      )
    }

    case 'timer': {
      // A foreignObject is what lets live React render inside the same layer as
      // the ink — one layer, one coordinate system, as ADR 0003 requires.
      const from = at(shape.from)
      const to = at(shape.to)
      const height = Math.abs(to.y - from.y)

      return (
        <foreignObject
          x={Math.min(from.x, to.x)}
          y={Math.min(from.y, to.y)}
          width={Math.abs(to.x - from.x)}
          height={height}
          opacity={shape.opacity}
        >
          <Timer fontSize={Math.max(8, height * 0.18)} />
        </foreignObject>
      )
    }
  }
}
