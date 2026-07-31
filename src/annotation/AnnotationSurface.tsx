import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { toReference, type Point } from './coords'
import { shapeAt } from './hit'
import { ShapeView } from './ShapeView'
import { load, save } from './storage'
import type { Shape, Text } from './types'
import { useWhiteboardMode } from './WhiteboardMode'
import './annotation.scss'

/** A tap that never moved, or an empty string, is not worth storing. */
function worthKeeping(shape: Shape): boolean {
  if (shape.type === 'stroke') return shape.points.length >= 2
  if (shape.type === 'text') return shape.text.length > 0
  return Math.hypot(shape.to.x - shape.from.x, shape.to.y - shape.from.y) > 4
}

type Props = {
  /** Stable across reloads — this is what annotations are persisted against. */
  id: string
  initialShapes?: Shape[]
  children: ReactNode
}

/** Shapes and their history move together, so undo can never fall out of step. */
type SurfaceState = {
  shapes: Shape[]
  history: Shape[][]
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
  const { active, tool, claim, publish } = useWhiteboardMode()

  // What was saved wins over the seed — the seed only furnishes a surface
  // nobody has annotated yet.
  const [state, setState] = useState<SurfaceState>(() => ({
    shapes: load(id) ?? initialShapes,
    history: [],
  }))

  // Shapes still being drawn, keyed by pointer. Only one pointer draws at a
  // time today, but keying by id is what makes multi-pointer a Map lookup later
  // rather than a rewrite.
  const inProgress = useRef(new Map<number, Shape>())
  const [draft, setDraft] = useState<Shape | null>(null)
  const [editing, setEditing] = useState<Text | null>(null)

  useLayoutEffect(() => {
    const observed = element.current
    if (!observed) return

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    observer.observe(observed)
    return () => observer.disconnect()
  }, [])

  // `shapes` only changes when an edit completes, so this never fires
  // mid-stroke. The debounce is for the bursts undo and erase produce.
  useEffect(() => {
    const timer = setTimeout(() => save(id, state.shapes), 500)
    return () => clearTimeout(timer)
  }, [id, state.shapes])

  function commit(update: (shapes: Shape[]) => Shape[]) {
    setState(({ shapes, history }) => ({ shapes: update(shapes), history: [...history, shapes] }))
  }

  function undo() {
    setState(({ shapes, history }) =>
      history.length === 0
        ? { shapes, history }
        : { shapes: history[history.length - 1], history: history.slice(0, -1) },
    )
  }

  function clear() {
    commit(() => [])
  }

  // Republished whenever the surface's own state changes, so the toolbar's
  // undo button knows whether there is anything to undo.
  useEffect(() => {
    publish(id, { undo, clear, canUndo: state.history.length > 0 })
    return () => publish(id, null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, publish, state.history.length])

  // Text is typed onto the surface directly. Enter keeps it, Escape drops it.
  useEffect(() => {
    if (!editing) return

    function onKeyDown(event: KeyboardEvent) {
      const current = editing
      if (!current) return
      event.preventDefault()

      if (event.key === 'Escape') return setEditing(null)

      if (event.key === 'Enter') {
        if (current.text.length > 0) commit((shapes) => [...shapes, current])
        return setEditing(null)
      }

      if (event.key === 'Backspace') {
        return setEditing({ ...current, text: current.text.slice(0, -1) })
      }

      if (event.key.length === 1) {
        setEditing({ ...current, text: current.text + event.key })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  function pointFrom(event: { clientX: number; clientY: number }, bounds: DOMRect): Point {
    return toReference({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }, width)
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    claim(id)
    const point = pointFrom(event, event.currentTarget.getBoundingClientRect())

    if (tool === 'eraser') {
      const hit = shapeAt(state.shapes, point)
      if (hit) commit((shapes) => shapes.filter((shape) => shape.id !== hit.id))
      return
    }

    if (tool === 'text') {
      // Typed straight onto the surface rather than through window.prompt: a
      // native dialog is unreliable while an element is fullscreen, which is
      // exactly where a board spends its time.
      setEditing({ id: crypto.randomUUID(), type: 'text', at: point, text: '' })
      return
    }

    if (inProgress.current.size > 0) return

    event.currentTarget.setPointerCapture(event.pointerId)
    const shape: Shape =
      tool === 'pen'
        ? { id: crypto.randomUUID(), type: 'stroke', points: [point] }
        : { id: crypto.randomUUID(), type: tool, from: point, to: point }

    inProgress.current.set(event.pointerId, shape)
    setDraft(shape)
  }

  function extendShape(event: ReactPointerEvent<SVGSVGElement>) {
    const shape = inProgress.current.get(event.pointerId)
    if (!shape) return

    const bounds = event.currentTarget.getBoundingClientRect()
    const next = grow(shape, event, bounds)

    inProgress.current.set(event.pointerId, next)
    setDraft(next)
  }

  function grow(shape: Shape, event: ReactPointerEvent<SVGSVGElement>, bounds: DOMRect): Shape {
    if (shape.type === 'text') return shape

    if (shape.type === 'stroke') {
      // Boards fire pointer events faster than frames render; the coalesced
      // ones are the difference between a smooth curve and a chain of lines.
      const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? []
      const moves = coalesced.length > 0 ? coalesced : [event.nativeEvent]
      // ponytail: copies the array per move. Fine at annotation lengths; if a
      // very long stroke ever stutters, accumulate in a ref and copy on commit.
      return { ...shape, points: [...shape.points, ...moves.map((move) => pointFrom(move, bounds))] }
    }

    // Everything else is dragged from one corner to the other.
    return { ...shape, to: pointFrom(event, bounds) }
  }

  function endShape(event: ReactPointerEvent<SVGSVGElement>) {
    const shape = inProgress.current.get(event.pointerId)
    if (!shape) return

    inProgress.current.delete(event.pointerId)
    setDraft(null)

    if (worthKeeping(shape)) commit((shapes) => [...shapes, shape])
  }

  function cancelShape(event: ReactPointerEvent<SVGSVGElement>) {
    inProgress.current.delete(event.pointerId)
    setDraft(null)
  }

  return (
    <div className="annotation-surface" ref={element} data-surface-id={id}>
      {children}
      {/* Width 0 means layout hasn't settled; scaling by it would misplace every shape. */}
      {width > 0 && (
        <svg
          className="annotation-layer"
          data-active={active ? '' : undefined}
          data-tool={active ? tool : undefined}
          aria-hidden="true"
          onPointerDown={active ? handlePointerDown : undefined}
          onPointerMove={active ? extendShape : undefined}
          onPointerUp={active ? endShape : undefined}
          onPointerCancel={active ? cancelShape : undefined}
        >
          {state.shapes.map((shape) => (
            <ShapeView key={shape.id} shape={shape} width={width} />
          ))}
          {draft && <ShapeView shape={draft} width={width} />}
          {/* A trailing bar stands in for a caret while typing. */}
          {editing && (
            <ShapeView shape={{ ...editing, text: `${editing.text}|` }} width={width} />
          )}
        </svg>
      )}
    </div>
  )
}
