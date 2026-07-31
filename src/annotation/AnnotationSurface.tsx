import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { scaleFor, toScreen } from './coords'
import type { Shape } from './types'
import './annotation.scss'

const STROKE_WIDTH = 4

type Props = {
  /** Stable across reloads — this is what annotations are persisted against. */
  id: string
  shapes: Shape[]
  children: ReactNode
}

/**
 * An annotatable region, declared by the host app. The annotation layer renders
 * *inside* this element, so it scrolls with the content it annotates and stacks
 * above or below other surfaces exactly as the host's own elements do.
 * See docs/adr/0001-host-declared-surfaces.md.
 */
export function AnnotationSurface({ id, shapes, children }: Props) {
  const element = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const observed = element.current
    if (!observed) return

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    observer.observe(observed)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="annotation-surface" ref={element} data-surface-id={id}>
      {children}
      {/* Width 0 means layout hasn't settled; scaling by it would misplace every shape. */}
      {width > 0 && <AnnotationLayer shapes={shapes} width={width} />}
    </div>
  )
}

function AnnotationLayer({ shapes, width }: { shapes: Shape[]; width: number }) {
  return (
    <svg className="annotation-layer" aria-hidden="true">
      {shapes.map((shape) => (
        <polyline
          key={shape.id}
          points={shape.points
            .map((point) => {
              const { x, y } = toScreen(point, width)
              return `${x},${y}`
            })
            .join(' ')}
          strokeWidth={STROKE_WIDTH * scaleFor(width)}
        />
      ))}
    </svg>
  )
}
