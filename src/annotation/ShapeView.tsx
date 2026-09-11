import { scaleFor, type Point } from './coords'
import { TINT_OPACITY } from './style'
import { strokePath } from './stroke'
import { Timer } from './Timer'
import type { BorderStyle, FillStyle, Shape } from './types'

const ARROWHEAD = 4

/**
 * A pen's underline or strikethrough is a fraction of the pen's weight: at the
 * pen's full width it covered the descenders. Still follows the weight
 * setting, so a teacher can have it thicker.
 */
const MARK_WEIGHT = 0.35
/** Where in the line box each mark's line runs, top to bottom. */
const MARK_LINE = { highlight: 0.5, strikethrough: 0.55, underline: 0.92 }

/** Points along a mark's line, with a hand's slight waver — deterministic per shape. */
const MARK_STEPS = 6

function waver(seed: string, x0: number, x1: number, y: number, amplitude: number): Point[] {
  const phase = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 7
  return Array.from({ length: MARK_STEPS + 1 }, (_, step) => ({
    x: x0 + ((x1 - x0) * step) / MARK_STEPS,
    y: y + Math.sin(step * 1.9 + phase) * amplitude,
  }))
}

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
          d={strokePath(shape.points, width, shape.weight, shape.highlight ? 'highlighter' : 'pen')}
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
      const bend = shape.bend ? at(shape.bend) : null
      const line = shape.weight * scale
      const heads = shape.heads ?? 'none'
      // Proportional to the line, so a thick arrow gets a head to match rather
      // than the same small one on every weight.
      const head = ARROWHEAD * line
      const wings = (tip: Point, towards: Point) => {
        const angle = Math.atan2(tip.y - towards.y, tip.x - towards.x)
        const wing = (spread: number) => ({
          x: tip.x - Math.cos(angle + spread) * head,
          y: tip.y - Math.sin(angle + spread) * head,
        })
        const left = wing(Math.PI / 7)
        const right = wing(-Math.PI / 7)
        return `${left.x},${left.y} ${tip.x},${tip.y} ${right.x},${right.y}`
      }

      return (
        <g fill="none" stroke={shape.color} strokeWidth={line} opacity={shape.opacity}>
          {/* The shaft carries the dash; a dashed arrowhead just looks broken. */}
          <path
            d={bend ? `M ${from.x} ${from.y} Q ${bend.x} ${bend.y} ${to.x} ${to.y}` : `M ${from.x} ${from.y} L ${to.x} ${to.y}`}
            strokeDasharray={dashes(shape.border, line)}
          />
          {heads !== 'none' && <polyline points={wings(to, bend ?? from)} />}
          {heads === 'both' && <polyline points={wings(from, bend ?? to)} />}
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

    case 'mark': {
      /*
        Drawn from the words' line boxes, as ink: a highlighter's chisel stroke
        through each line, or a pen's line under it. Nothing here is stored —
        wrap the words and the boxes change, and so does this.
      */
      return (
        <g fill={shape.color} opacity={shape.opacity}>
          {shape.boxes.map((box, index) => {
            const highlight = shape.kind === 'highlight'
            const y = box.y + box.height * MARK_LINE[shape.kind]
            const weight = highlight ? box.height * 0.95 : Math.min(shape.weight * MARK_WEIGHT, box.height * 0.2)
            // The round caps add half the weight at each end; pull the line in
            // by that much so the ink covers the words and not their neighbours.
            const inset = Math.min(weight / 2, box.width / 2)
            const points = waver(`${shape.id}${index}`, box.x + inset, box.x + box.width - inset, y, weight * (highlight ? 0.03 : 0.25))
            return <path key={index} d={strokePath(points, width, weight, 'mark')} />
          })}
        </g>
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
