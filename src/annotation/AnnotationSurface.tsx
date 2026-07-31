import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { toReference, type Point } from './coords'
import { strokePath } from './stroke'
import type { Shape } from './types'
import { useWhiteboardMode } from './WhiteboardMode'
import './annotation.scss'

type Props = {
  /** Stable across reloads — this is what annotations are persisted against. */
  id: string
  initialShapes?: Shape[]
  children: ReactNode
}

/**
 * An annotatable region, declared by the host app. The annotation layer renders
 * *inside* this element, so it scrolls with the content it annotates and stacks
 * above or below other surfaces exactly as the host's own elements do.
 * See docs/adr/0001-host-declared-surfaces.md.
 */
export function AnnotationSurface({ id, initialShapes = [], children }: Props) {
  const element = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [shapes, setShapes] = useState<Shape[]>(initialShapes)
  const { active } = useWhiteboardMode()

  // Points of strokes still being drawn, keyed by pointer. Only one pointer
  // draws at a time today, but keying by id is what makes multi-pointer a Map
  // lookup later rather than a rewrite.
  const inProgress = useRef(new Map<number, Point[]>())
  const [live, setLive] = useState<Point[]>([])

  useLayoutEffect(() => {
    const observed = element.current
    if (!observed) return

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    observer.observe(observed)
    return () => observer.disconnect()
  }, [])

  function pointFrom(event: { clientX: number; clientY: number }, bounds: DOMRect): Point {
    return toReference({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, width)
  }

  function startStroke(event: ReactPointerEvent<SVGSVGElement>) {
    if (inProgress.current.size > 0) return

    event.currentTarget.setPointerCapture(event.pointerId)
    const points = [pointFrom(event, event.currentTarget.getBoundingClientRect())]
    inProgress.current.set(event.pointerId, points)
    setLive([...points])
  }

  function extendStroke(event: ReactPointerEvent<SVGSVGElement>) {
    const points = inProgress.current.get(event.pointerId)
    if (!points) return

    const bounds = event.currentTarget.getBoundingClientRect()
    // Boards fire pointer events faster than frames render; the coalesced ones
    // are the difference between a smooth curve and a chain of straight lines.
    const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? []
    const moves = coalesced.length > 0 ? coalesced : [event.nativeEvent]

    for (const move of moves) points.push(pointFrom(move, bounds))
    setLive([...points])
  }

  function endStroke(event: ReactPointerEvent<SVGSVGElement>) {
    const points = inProgress.current.get(event.pointerId)
    if (!points) return

    inProgress.current.delete(event.pointerId)
    setLive([])

    // A tap is not a stroke.
    if (points.length < 2) return
    setShapes((current) => [...current, { id: crypto.randomUUID(), type: 'stroke', points }])
  }

  function cancelStroke(event: ReactPointerEvent<SVGSVGElement>) {
    inProgress.current.delete(event.pointerId)
    setLive([])
  }

  return (
    <div className="annotation-surface" ref={element} data-surface-id={id}>
      {children}
      {/* Width 0 means layout hasn't settled; scaling by it would misplace every shape. */}
      {width > 0 && (
        <svg
          className="annotation-layer"
          data-active={active ? '' : undefined}
          aria-hidden="true"
          onPointerDown={active ? startStroke : undefined}
          onPointerMove={active ? extendStroke : undefined}
          onPointerUp={active ? endStroke : undefined}
          onPointerCancel={active ? cancelStroke : undefined}
        >
          {shapes.map((shape) => (
            <path key={shape.id} d={strokePath(shape.points, width)} />
          ))}
          {live.length > 0 && <path d={strokePath(live, width)} />}
        </svg>
      )}
    </div>
  )
}
