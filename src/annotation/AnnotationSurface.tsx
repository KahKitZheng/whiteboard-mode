import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { toReference, type Point } from './coords'
import {
  bounds,
  cornerAt,
  cornerPoint,
  oppositeCorner,
  scaleAbout,
  translate,
  withinBounds,
  type Corner,
} from './geometry'
import { shapeAt } from './hit'
import { SelectionOverlay } from './Selection'
import { ShapeView } from './ShapeView'
import { load, save } from './storage'
import type { Shape, Text } from './types'
import { useWhiteboardMode } from './WhiteboardMode'
import './annotation.scss'

/**
 * A transform in progress. It holds the shape as it was when the gesture
 * started, so every pointer move recomputes from the original rather than
 * compounding rounding on the previous frame.
 */
type Gesture = {
  shapeId: string
  original: Shape
  /** All shapes as they were, pushed onto history once the gesture ends. */
  before: Shape[]
} & (
  | { kind: 'move'; origin: Point }
  | { kind: 'resize'; anchor: Point; startCorner: Point }
)

/** Guards a resize against dividing by a zero-width box. */
function factor(moved: number, original: number): number {
  return Math.abs(original) < 0.001 ? 1 : moved / original
}

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
  const [selected, setSelected] = useState<string | null>(null)
  const gesture = useRef<Gesture | null>(null)

  const selectedShape = state.shapes.find((shape) => shape.id === selected) ?? null

  useLayoutEffect(() => {
    const observed = element.current
    if (!observed) return

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    observer.observe(observed)
    return () => observer.disconnect()
  }, [])

  // The debounce earns its keep during a move or resize, where shapes change on
  // every pointer frame.
  useEffect(() => {
    const timer = setTimeout(() => save(id, state.shapes), 500)
    return () => clearTimeout(timer)
  }, [id, state.shapes])

  // ...but a debounce still pending when the surface goes away would be
  // cancelled, losing the last edit. Closing a popup within half a second of
  // drawing in it did exactly that. Flush on unmount and on the page going
  // away instead.
  const latestShapes = useRef(state.shapes)
  latestShapes.current = state.shapes

  useEffect(() => {
    function flush() {
      save(id, latestShapes.current)
    }

    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [id])

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

  /** Edits mid-gesture: history is pushed once, when the gesture ends. */
  function replace(update: (shapes: Shape[]) => Shape[]) {
    setState(({ shapes, history }) => ({ shapes: update(shapes), history }))
  }

  function clear() {
    commit(() => [])
  }

  function removeSelected() {
    if (!selected) return
    commit((shapes) => shapes.filter((shape) => shape.id !== selected))
    setSelected(null)
  }

  function reorder(toEnd: boolean) {
    if (!selected) return
    commit((shapes) => {
      const picked = shapes.filter((shape) => shape.id === selected)
      const rest = shapes.filter((shape) => shape.id !== selected)
      // Later shapes paint on top, so "front" is the end of the array.
      return toEnd ? [...rest, ...picked] : [...picked, ...rest]
    })
  }

  // Republished whenever the surface's own state changes, so the toolbar's
  // buttons know whether there is anything to act on.
  useEffect(() => {
    publish(id, {
      undo,
      clear,
      canUndo: state.history.length > 0,
      hasSelection: selected !== null,
      removeSelected,
      bringToFront: () => reorder(true),
      sendToBack: () => reorder(false),
    })
    return () => publish(id, null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, publish, state.history.length, selected])

  // A selection only means anything while the select tool is active.
  useEffect(() => {
    if (tool !== 'select') setSelected(null)
  }, [tool])

  useEffect(() => {
    if (!selected || !active) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') return setSelected(null)
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removeSelected()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, active])

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

  function pointFrom(event: { clientX: number; clientY: number }, box: DOMRect): Point {
    return toReference({ x: event.clientX - box.left, y: event.clientY - box.top }, width)
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    claim(id)
    const point = pointFrom(event, event.currentTarget.getBoundingClientRect())

    if (tool === 'select') {
      // A handle on the current selection beats picking something else up.
      const corner = selectedShape ? cornerAt(selectedShape, point) : null
      if (selectedShape && corner) {
        event.currentTarget.setPointerCapture(event.pointerId)
        const box = bounds(selectedShape)
        gesture.current = {
          kind: 'resize',
          shapeId: selectedShape.id,
          original: selectedShape,
          before: state.shapes,
          anchor: oppositeCorner(box, corner as Corner),
          startCorner: cornerPoint(box, corner as Corner),
        }
        return
      }

      // Picking uses the shape's outline; a shape already selected can also be
      // grabbed anywhere inside its box, which is how you move a thin one.
      const hit =
        shapeAt(state.shapes, point) ??
        (selectedShape && withinBounds(selectedShape, point) ? selectedShape : null)

      setSelected(hit?.id ?? null)
      if (!hit) return

      event.currentTarget.setPointerCapture(event.pointerId)
      gesture.current = { kind: 'move', shapeId: hit.id, original: hit, before: state.shapes, origin: point }
      return
    }

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
    const active_ = gesture.current
    if (active_) {
      const point = pointFrom(event, event.currentTarget.getBoundingClientRect())

      const transformed =
        active_.kind === 'move'
          ? translate(active_.original, point.x - active_.origin.x, point.y - active_.origin.y)
          : scaleAbout(
              active_.original,
              active_.anchor,
              factor(point.x - active_.anchor.x, active_.startCorner.x - active_.anchor.x),
              factor(point.y - active_.anchor.y, active_.startCorner.y - active_.anchor.y),
            )

      replace((shapes) => shapes.map((shape) => (shape.id === active_.shapeId ? transformed : shape)))
      return
    }

    const shape = inProgress.current.get(event.pointerId)
    if (!shape) return

    const box = event.currentTarget.getBoundingClientRect()
    const next = grow(shape, event, box)

    inProgress.current.set(event.pointerId, next)
    setDraft(next)
  }

  function grow(shape: Shape, event: ReactPointerEvent<SVGSVGElement>, box: DOMRect): Shape {
    if (shape.type === 'text') return shape

    if (shape.type === 'stroke') {
      // Boards fire pointer events faster than frames render; the coalesced
      // ones are the difference between a smooth curve and a chain of lines.
      const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? []
      const moves = coalesced.length > 0 ? coalesced : [event.nativeEvent]
      // ponytail: copies the array per move. Fine at annotation lengths; if a
      // very long stroke ever stutters, accumulate in a ref and copy on commit.
      return { ...shape, points: [...shape.points, ...moves.map((move) => pointFrom(move, box))] }
    }

    // Everything else is dragged from one corner to the other.
    return { ...shape, to: pointFrom(event, box) }
  }

  function endShape(event: ReactPointerEvent<SVGSVGElement>) {
    if (gesture.current) {
      // One history entry for the whole gesture, not one per pointer move.
      const { before } = gesture.current
      gesture.current = null
      setState(({ shapes, history }) => ({ shapes, history: [...history, before] }))
      return
    }

    const shape = inProgress.current.get(event.pointerId)
    if (!shape) return

    inProgress.current.delete(event.pointerId)
    setDraft(null)

    if (worthKeeping(shape)) commit((shapes) => [...shapes, shape])
  }

  function cancelShape(event: ReactPointerEvent<SVGSVGElement>) {
    if (gesture.current) {
      // Put the shape back where it was; a cancelled gesture is not an edit.
      const { before } = gesture.current
      gesture.current = null
      replace(() => before)
      return
    }

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
          /*
            Not aria-hidden. It was, while the layer held only ink — but a
            widget puts real controls in here, and hiding the subtree took the
            timer's buttons out of the accessibility tree with it. The shapes
            themselves carry no accessible name, so they stay invisible to
            assistive tech either way.
          */
          role="presentation"
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
          {tool === 'select' && selectedShape && (
            <SelectionOverlay shape={selectedShape} width={width} />
          )}
        </svg>
      )}
    </div>
  )
}
