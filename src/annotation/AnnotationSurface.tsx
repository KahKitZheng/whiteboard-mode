import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { toReference, type Point } from './coords'
import {
  aspectOf,
  bounds,
  cornerAt,
  cornerPoint,
  keepAspect,
  oppositeCorner,
  scaleAbout,
  translate,
  uniformFactors,
  type Corner,
} from './geometry'
import * as timeline from './history'
import { shapeAt, shapeNear, shapesAlong } from './hit'
import { SelectionOverlay } from './Selection'
import { ShapeView } from './ShapeView'
import { TextEditor } from './TextEditor'
import { load, save } from './storage'
import { restyle, styleOf, type Style } from './style'
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

/**
 * A highlight starts broader and fainter than the pen it borrows its weight
 * from. Faint enough that the lesson text reads through it, broad enough to
 * cover a line of it in one pass.
 *
 * ponytail: a flat opacity rather than a multiply blend. Multiply is what makes
 * two overlapping highlights deepen instead of doubling up, but it turns
 * invisible on a dark theme — worth doing per-theme if it ever comes up.
 */
const HIGHLIGHT_WEIGHT = 3
const HIGHLIGHT_OPACITY = 0.35

/** Guards a resize against dividing by a zero-width box. */
function factor(moved: number, original: number): number {
  return Math.abs(original) < 0.001 ? 1 : moved / original
}

/**
 * How far a resize has dragged each axis. A shape with fixed proportions gets
 * one magnitude for both, otherwise the handle would squash it.
 */
function resizeFactors(
  gesture: Extract<Gesture, { kind: 'resize' }>,
  point: Point,
): [number, number] {
  const fx = factor(point.x - gesture.anchor.x, gesture.startCorner.x - gesture.anchor.x)
  const fy = factor(point.y - gesture.anchor.y, gesture.startCorner.y - gesture.anchor.y)

  return aspectOf(gesture.original) ? uniformFactors(fx, fy) : [fx, fy]
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
  /** How the host sizes the surface. Its box is what gets annotated. */
  className?: string
  initialShapes?: Shape[]
  children: ReactNode
}


/**
 * An annotatable region, declared by the host app. The annotation layer renders
 * *inside* this element, so it scrolls with the content it annotates and stacks
 * above or below other surfaces exactly as the host's own elements do.
 * See docs/adr/0001-host-declared-surfaces.md.
 */
export function AnnotationSurface(props: Props) {
  /*
    Remount whenever the surface id changes. Shapes are seeded once, at mount,
    so reusing one instance across two ids carries the first surface's
    annotations into the second — the router keeps the element in the same slot
    across routes, so this happens on every navigation. Keying here rather than
    at the call site means the host app cannot forget to.
  */
  return <Surface key={props.id} {...props} />
}

function Surface({ id, className, initialShapes = [], children }: Props) {
  const element = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const { active, tool, style, claim, publish } = useWhiteboardMode()

  // What was saved wins over the seed — the seed only furnishes a surface
  // nobody has annotated yet.
  const [state, setState] = useState<timeline.Timeline>(() => ({
    shapes: load(id) ?? initialShapes,
    history: [],
    future: [],
  }))

  // Shapes still being drawn, keyed by pointer. Only one pointer draws at a
  // time today, but keying by id is what makes multi-pointer a Map lookup later
  // rather than a rewrite.
  const inProgress = useRef(new Map<number, Shape>())
  const [draft, setDraft] = useState<Shape | null>(null)
  const [editing, setEditing] = useState<Text | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const gesture = useRef<Gesture | null>(null)
  const erasing = useRef<{ pointerId: number; last: Point } | null>(null)
  const [marked, setMarked] = useState<string[]>([])

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
    setState((state) => timeline.commit(state, update))
  }

  /** Edits mid-gesture: history is pushed once, when the gesture ends. */
  function replace(update: (shapes: Shape[]) => Shape[]) {
    setState((state) => timeline.amend(state, update))
  }

  function clear() {
    commit(() => [])
  }

  function removeSelected() {
    if (!selected) return
    commit((shapes) => shapes.filter((shape) => shape.id !== selected))
    setSelected(null)
  }

  function restyleSelected(patch: Partial<Style>) {
    if (!selected) return
    commit((shapes) => shapes.map((shape) => (shape.id === selected ? restyle(shape, patch) : shape)))
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
      undo: () => setState(timeline.undo),
      redo: () => setState(timeline.redo),
      clear,
      canUndo: state.history.length > 0,
      canRedo: state.future.length > 0,
      hasSelection: selected !== null,
      selectedStyle: selectedShape ? styleOf(selectedShape) : null,
      restyleSelected,
      removeSelected,
      bringToFront: () => reorder(true),
      sendToBack: () => reorder(false),
    })
    return () => publish(id, null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, publish, state.history.length, state.future.length, selected, state.shapes])

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

  /** Finishing one label before starting another, so neither is lost. */
  function beginEditing(next: Text | null) {
    if (editing && worthKeeping(editing)) commitText(editing)
    setEditing(next)
  }

  function commitText(label: Text) {
    commit((shapes) =>
      shapes.some((shape) => shape.id === label.id)
        ? shapes.map((shape) => (shape.id === label.id ? label : shape))
        : [...shapes, label],
    )
  }

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
      const hit = shapeNear(state.shapes, point)

      setSelected(hit?.id ?? null)
      if (!hit) return

      event.currentTarget.setPointerCapture(event.pointerId)
      gesture.current = { kind: 'move', shapeId: hit.id, original: hit, before: state.shapes, origin: point }
      return
    }

    if (tool === 'eraser') {
      // Shapes are marked while the pointer sweeps and deleted together on
      // release, so a scribble across five strokes is one undo, not five.
      event.currentTarget.setPointerCapture(event.pointerId)
      erasing.current = { pointerId: event.pointerId, last: point }

      const hit = shapeAt(state.shapes, point)
      setMarked(hit ? [hit.id] : [])
      return
    }

    if (tool === 'text') {
      // Without this the press moves focus as it normally would, which blurs
      // the editor the instant it mounts — and blur commits, so an empty label
      // vanished in the same tick it appeared.
      event.preventDefault()

      // Aiming at existing text retypes it rather than stacking a second label
      // on top of the first.
      const existing = shapeNear(state.shapes, point)
      if (existing?.type === 'text') return beginEditing(existing)

      // Typed straight onto the surface rather than through window.prompt: a
      // native dialog is unreliable while an element is fullscreen, which is
      // exactly where a board spends its time.
      beginEditing({
        id: crypto.randomUUID(),
        type: 'text',
        at: point,
        text: '',
        size: style.textSize,
        color: style.color,
        opacity: style.opacity,
      })
      return
    }

    if (inProgress.current.size > 0) return

    event.currentTarget.setPointerCapture(event.pointerId)
    const ink = { color: style.color, weight: style.weight, opacity: style.opacity }
    const shape: Shape =
      tool === 'pen'
        ? { id: crypto.randomUUID(), type: 'stroke', points: [point], ...ink }
        : tool === 'highlighter'
          ? {
              id: crypto.randomUUID(),
              type: 'stroke',
              points: [point],
              ...ink,
              highlight: true,
              // Broad and see-through, whatever the pen was last set to. The
              // weight control still moves it from here; this is where it starts.
              weight: style.weight * HIGHLIGHT_WEIGHT,
              opacity: HIGHLIGHT_OPACITY,
            }
        : tool === 'timer'
          ? { id: crypto.randomUUID(), type: 'timer', from: point, to: point, opacity: style.opacity }
          : {
              id: crypto.randomUUID(),
              type: tool,
              from: point,
              to: point,
              ...ink,
              border: style.border,
              // A line has no inside, so it is left without one rather than
              // carrying a fill nothing will ever read.
              ...(tool === 'rect' || tool === 'ellipse' ? { fill: style.fill } : {}),
            }

    inProgress.current.set(event.pointerId, shape)
    setDraft(shape)
  }

  /** Double-click with the select tool retypes a label in place. */
  function retypeText(event: ReactMouseEvent<SVGSVGElement>) {
    if (tool !== 'select') return

    const hit = shapeNear(state.shapes, pointFrom(event, event.currentTarget.getBoundingClientRect()))
    if (hit?.type !== 'text') return

    setSelected(null)
    beginEditing(hit)
  }

  function extendShape(event: ReactPointerEvent<SVGSVGElement>) {
    const erase = erasing.current
    if (erase && erase.pointerId === event.pointerId) {
      const box = event.currentTarget.getBoundingClientRect()
      const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? []
      const moves = coalesced.length > 0 ? coalesced : [event.nativeEvent]
      const swept: string[] = []

      for (const move of moves) {
        const next = pointFrom(move, box)
        for (const shape of shapesAlong(state.shapes, erase.last, next)) swept.push(shape.id)
        erase.last = next
      }

      if (swept.length > 0) setMarked((current) => [...new Set([...current, ...swept])])
      return
    }

    const active_ = gesture.current
    if (active_) {
      const point = pointFrom(event, event.currentTarget.getBoundingClientRect())

      const transformed =
        active_.kind === 'move'
          ? translate(active_.original, point.x - active_.origin.x, point.y - active_.origin.y)
          : scaleAbout(active_.original, active_.anchor, ...resizeFactors(active_, point))

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

    // Everything else is dragged from one corner to the other, snapped to the
    // type's proportions where it has any.
    const ratio = aspectOf(shape)
    const to = pointFrom(event, box)

    return { ...shape, to: ratio ? keepAspect(shape.from, to, ratio) : to }
  }

  function endShape(event: ReactPointerEvent<SVGSVGElement>) {
    if (erasing.current) {
      erasing.current = null
      if (marked.length > 0) {
        commit((shapes) => shapes.filter((shape) => !marked.includes(shape.id)))
      }
      setMarked([])
      return
    }

    if (gesture.current) {
      // One history entry for the whole gesture, not one per pointer move.
      const { before } = gesture.current
      gesture.current = null
      setState((state) => timeline.record(state, before))
      return
    }

    const shape = inProgress.current.get(event.pointerId)
    if (!shape) return

    inProgress.current.delete(event.pointerId)
    setDraft(null)

    if (worthKeeping(shape)) commit((shapes) => [...shapes, shape])
  }

  function cancelShape(event: ReactPointerEvent<SVGSVGElement>) {
    if (erasing.current) {
      // A cancelled sweep deletes nothing.
      erasing.current = null
      setMarked([])
      return
    }

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
    <div
      className={className ? `annotation-surface ${className}` : 'annotation-surface'}
      ref={element}
      data-surface-id={id}
    >
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
          onDoubleClick={active ? retypeText : undefined}
        >
          {state.shapes
            .filter((shape) => shape.id !== editing?.id)
            .map((shape) => (
            /* Marked shapes fade rather than vanish, so a sweep can be seen
               before the pointer lifts and can still be cancelled. */
              <g key={shape.id} data-marked={marked.includes(shape.id) ? '' : undefined}>
                <ShapeView shape={shape} width={width} />
              </g>
            ))}
          {draft && <ShapeView shape={draft} width={width} />}
          {editing && (
            <TextEditor
              shape={editing}
              width={width}
              onChange={setEditing}
              onCommit={() => {
                if (worthKeeping(editing)) commitText(editing)
                setEditing(null)
              }}
              onCancel={() => setEditing(null)}
            />
          )}
          {tool === 'select' && selectedShape && (
            <SelectionOverlay shape={selectedShape} width={width} />
          )}
        </svg>
      )}
    </div>
  )
}
