import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { anchorShape, markOver, placeShape, unanchored, wordAt, wordsBetween, type Frame } from './anchor'
import { toReference, type Point } from './coords'
import {
  aspectOf,
  bounds,
  bendFor,
  cornerAt,
  cornerPoint,
  keepAspect,
  onBendHandle,
  oppositeCorner,
  scaleAbout,
  translate,
  uniformFactors,
  type Corner,
} from './geometry'
import * as timeline from './history'
import { shapeAt, shapeNear, shapesAlong } from './hit'
import { interactiveAncestor } from './interactive'
import { SelectionOverlay } from './Selection'
import { ShapeView } from './ShapeView'
import { TextEditor } from './TextEditor'
import { recognise, type Recognised } from './recognise'
import { load, save } from './storage'
import { restyle, styleOf, type Style } from './style'
import type { Mark, Primitive, Shape, Stroke, Text } from './types'
import { useWhiteboardMode, type Tool } from './WhiteboardMode'
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
  | { kind: 'bend' }
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

/**
 * How far, in screen pixels, a press may wander and still be a tap. A mouse
 * barely moves; a finger on a board moves a lot, and a tap that comes out as
 * a dot on the button it meant to press is the worse mistake.
 */
const TAP_SLOP: Record<string, number> = { mouse: 6, pen: 8, touch: 12 }
const DEFAULT_TAP_SLOP = 8

/**
 * Tools for which a tap on content means something — pick this shape, erase
 * that one, put a label here. Every other tool draws nothing on a tap, so a
 * tap can be left to the host wherever it lands. See ADR 0006.
 */
const TAP_TOOLS: ReadonlySet<Tool> = new Set<Tool>(['select', 'eraser', 'text'])

/*
  Hold the pen still this long before lifting and a stroke that was nearly a
  shape becomes one — previewed while you hold, undone if you move on. A
  hand is never quite still; movement under the jitter counts as holding.
*/
const HOLD_MS = 600
const HOLD_JITTER = 3

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

/** The gesture's shape as the pointer has it now. */
function transform(gesture: Gesture, point: Point): Shape {
  if (gesture.kind === 'move') {
    return translate(gesture.original, point.x - gesture.origin.x, point.y - gesture.origin.y)
  }
  if (gesture.kind === 'bend') {
    return gesture.original.type === 'line' ? { ...gesture.original, bend: bendFor(gesture.original, point) } : gesture.original
  }
  return scaleAbout(gesture.original, gesture.anchor, ...resizeFactors(gesture, point))
}

/** A tap that never moved, or an empty string, is not worth storing. */
function worthKeeping(shape: Shape): boolean {
  if (shape.type === 'stroke') return shape.points.length >= 2
  if (shape.type === 'text') return shape.text.length > 0
  if (shape.type === 'mark') return shape.boxes.length > 0
  return Math.hypot(shape.to.x - shape.from.x, shape.to.y - shape.from.y) > 4
}

type Props = {
  /** Stable across reloads — this is what annotations are persisted against. */
  id: string
  /** How the host sizes the surface. Its box is what gets annotated. */
  className?: string
  initialShapes?: Shape[]
  /**
   * Lay shapes out in these SVG user units instead of the surface's measured
   * pixel width. For a surface the host scales — an image being zoomed — this
   * is the image's pixel size: shapes are placed once in image space and the
   * browser scales the whole layer, so nothing here has to know the zoom.
   * See docs/adr/0005-osd-overlay-annotation-layer.md.
   */
  viewBox?: { width: number; height: number }
  /**
   * How much larger the surface is on screen than at rest, read as a shape is
   * created. Weight and text size are divided by it, so ink drawn while zoomed
   * in reads as drawn — and then stays anchored to the content at that size.
   */
  inkScale?: () => number
  children?: ReactNode
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

function Surface({ id, className, initialShapes = [], viewBox, inkScale, children }: Props) {
  const element = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  // What shapes are scaled by when drawn. Pointer input is scaled by the box
  // the event arrived in instead — the two only coincide without a viewBox.
  const renderWidth = viewBox?.width ?? width
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
  /*
    A highlight or underline being dragged over words. It grows word by word,
    within the block it started in, and becomes a mark on release — ADR 0008.
  */
  // Hold-to-snap, for the pen stroke in progress. See ADR 0009.
  const holdTimer = useRef(0)
  const lastMove = useRef<Point | null>(null)
  const snapped = useRef<Primitive | null>(null)
  const marking = useRef<{
    pointerId: number
    id: string
    kind: Mark['kind']
    block: Element
    start: Range
    range: Range
  } | null>(null)
  const [marked, setMarked] = useState<string[]>([])
  /*
    A press that may still be the host's. Whether it is a click or the start
    of a stroke is not known until the pointer lifts or moves, so nothing
    happens yet. See docs/adr/0006-taps-go-to-the-host.md.
  */
  const pending = useRef<{ pointerId: number; pointerType: string; clientX: number; clientY: number } | null>(null)
  // Set when a stroke grew out of a pending press: the browser still delivers
  // the control's click on release, and that click is ours to drop.
  const swallowClick = useRef(false)

  /*
    Shapes follow the host content under them (ADR 0007) — except on a surface
    with a viewBox, where the content is one image that scales as a whole and
    the coordinates are already exact. Words are still looked up there, for
    marks: a mark's boxes are reference units, exact under a viewBox like any
    stroke's points, so it needs the words once and never re-placing.
  */
  const anchoring = !viewBox
  const [layoutTick, setLayoutTick] = useState(0)

  useEffect(() => {
    const observed = element.current
    if (!observed || !anchoring) return

    let frame = 0
    function bump() {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        setLayoutTick((tick) => tick + 1)
      })
    }

    // The host can reflow without the surface changing width — an image
    // arriving, a block appearing, a font swapping in. The layer itself
    // mutates on every stroke, and placing again for that would loop.
    const observer = new MutationObserver((mutations) => {
      const host = mutations.some((mutation) => {
        const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement
        return !target?.closest('.annotation-layer')
      })
      if (host) bump()
    })
    observer.observe(observed, { childList: true, subtree: true, characterData: true })
    observed.addEventListener('load', bump, true)
    document.fonts?.ready.then(bump)

    return () => {
      observer.disconnect()
      observed.removeEventListener('load', bump, true)
      cancelAnimationFrame(frame)
    }
  }, [anchoring])

  // Reads layout during render, deliberately: the observers above and the
  // width state make sure a render follows every change worth reading.
  const placed = useMemo(() => {
    const surface = element.current
    if (!anchoring || !surface || width === 0) return state.shapes
    const frame: Frame = { surface, width }
    return state.shapes.map((shape) => placeShape(shape, frame))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.shapes, width, layoutTick, anchoring])

  function currentFrame(): Frame | null {
    const surface = element.current
    if (!surface) return null
    // Under a viewBox the box is what pointer input is scaled by, and it can
    // be a frame ahead of the measured width while the image zooms.
    const boxWidth = viewBox ? surface.getBoundingClientRect().width : width
    return boxWidth > 0 ? { surface, width: boxWidth } : null
  }

  /** A shape as it is stored: remembering what is under it, when there is something. */
  function settle(shape: Shape): Shape {
    const frame = anchoring ? currentFrame() : null
    return frame ? anchorShape(shape, frame) : shape
  }

  /** The shape a stroke was nearly, drawn in the stroke's ink and the tray's border and fill. */
  function primitiveFrom(found: Recognised, stroke: Stroke): Primitive {
    return {
      id: stroke.id,
      type: found.type,
      from: found.from,
      to: found.to,
      color: stroke.color,
      weight: stroke.weight,
      opacity: stroke.opacity,
      border: style.border,
      ...(found.type === 'rect' || found.type === 'ellipse' ? { fill: style.fill } : {}),
      ...(found.type === 'line' ? { heads: found.heads ?? 'none', ...(found.bend ? { bend: found.bend } : {}) } : {}),
    }
  }

  /**
   * Called on every pen move. A move past the jitter restarts the clock and
   * takes back a preview; the clock running out recognises what has been
   * drawn so far and previews it.
   */
  function watchHold(pointerId: number, clientX: number, clientY: number) {
    const last = lastMove.current
    if (last && Math.hypot(clientX - last.x, clientY - last.y) < HOLD_JITTER) return
    lastMove.current = { x: clientX, y: clientY }

    if (snapped.current) {
      snapped.current = null
      setDraft(inProgress.current.get(pointerId) ?? null)
    }

    window.clearTimeout(holdTimer.current)
    holdTimer.current = window.setTimeout(() => {
      const stroke = inProgress.current.get(pointerId)
      const found = stroke?.type === 'stroke' ? recognise(stroke.points) : null
      if (!found || !stroke || stroke.type !== 'stroke') return
      snapped.current = primitiveFrom(found, stroke)
      setDraft(snapped.current)
    }, HOLD_MS)
  }

  function forgetHold() {
    window.clearTimeout(holdTimer.current)
    lastMove.current = null
    snapped.current = null
  }

  /** The mark a drag over words has grown to so far. */
  function markSoFar(): Mark | null {
    const frame = currentFrame()
    const drag = marking.current
    if (!frame || !drag) return null
    return markOver(frame, drag.block, drag.range, {
      id: drag.id,
      kind: drag.kind,
      color: style.color,
      weight: style.weight,
      opacity: drag.kind === 'highlight' ? HIGHLIGHT_OPACITY : style.opacity,
    })
  }

  // Shapes from before anchoring — seeds, or a surface saved by an earlier
  // build — are adopted once, where they sit now. Not a history entry: the
  // teacher did nothing.
  const adopted = useRef(false)
  useEffect(() => {
    if (adopted.current || !anchoring || width === 0) return
    adopted.current = true
    if (!state.shapes.some((shape) => !shape.anchor)) return
    replace((shapes) => shapes.map((shape) => (shape.anchor ? shape : settle(shape))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchoring, width])

  // What the pointer meets, and what is drawn, is the placed shape.
  const selectedShape = placed.find((shape) => shape.id === selected) ?? null

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
    const settled = settle(label)
    commit((shapes) =>
      shapes.some((shape) => shape.id === settled.id)
        ? shapes.map((shape) => (shape.id === settled.id ? settled : shape))
        : [...shapes, settled],
    )
  }

  function pointFrom(event: { clientX: number; clientY: number }, box: DOMRect): Point {
    return toReference({ x: event.clientX - box.left, y: event.clientY - box.top }, box.width)
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    // A surface nested in this one has handled it already. Same in the other three.
    event.stopPropagation()
    swallowClick.current = false
    // Whatever this press turns out to be, the toolbar now acts on this surface.
    claim(id)

    // A drawing tool waits on every press; a tap tool only on a control.
    if (!TAP_TOOLS.has(tool) || interactiveAncestor(event.target as Element)) {
      pending.current = {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        clientX: event.clientX,
        clientY: event.clientY,
      }
      return
    }

    // Otherwise the press moves focus, selects text or starts dragging an
    // image — none of which is what a press on content means here.
    event.preventDefault()
    begin(event.pointerId, event.clientX, event.clientY)
  }

  /** A press that is ours: what the tool does with it. */
  function begin(pointerId: number, clientX: number, clientY: number) {
    const surface = element.current
    if (!surface) return

    const point = pointFrom({ clientX, clientY }, surface.getBoundingClientRect())
    // Ink laid down on a zoomed-in surface would be that many times thicker
    // once the view is back at rest. Divide it out here, once, at creation.
    const zoom = inkScale?.() ?? 1

    // A label being typed is finished by a press anywhere else. The text tool
    // sees to that itself — it may be retyping this very label.
    if (tool !== 'text' && editing) beginEditing(null)

    if (tool === 'select') {
      // A handle on the current selection beats picking something else up.
      const corner = selectedShape && selectedShape.type !== 'mark' ? cornerAt(selectedShape, point) : null
      if (selectedShape && corner) {
        surface.setPointerCapture(pointerId)
        // The gesture transforms the shape from where it is drawn, so that is
        // what goes in the store for its duration; it is anchored afresh at the end.
        replace((shapes) => shapes.map((shape) => (shape.id === selectedShape.id ? unanchored(selectedShape) : shape)))
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

      // A line's bend handle sits on the line, where a grab to move it would
      // land too. The handle wins; move a line by either end instead.
      if (selectedShape && onBendHandle(selectedShape, point)) {
        surface.setPointerCapture(pointerId)
        replace((shapes) => shapes.map((shape) => (shape.id === selectedShape.id ? unanchored(selectedShape) : shape)))
        gesture.current = { kind: 'bend', shapeId: selectedShape.id, original: selectedShape, before: state.shapes }
        return
      }

      // Picking uses the shape's outline; a shape already selected can also be
      // grabbed anywhere inside its box, which is how you move a thin one.
      const hit = shapeNear(placed, point)

      setSelected(hit?.id ?? null)
      // A mark sits where its words are; it can be restyled and deleted, not dragged.
      if (!hit || hit.type === 'mark') return

      surface.setPointerCapture(pointerId)
      replace((shapes) => shapes.map((shape) => (shape.id === hit.id ? unanchored(hit) : shape)))
      gesture.current = { kind: 'move', shapeId: hit.id, original: hit, before: state.shapes, origin: point }
      return
    }

    if (tool === 'eraser') {
      // Shapes are marked while the pointer sweeps and deleted together on
      // release, so a scribble across five strokes is one undo, not five.
      surface.setPointerCapture(pointerId)
      erasing.current = { pointerId, last: point }

      const hit = shapeAt(placed, point)
      setMarked(hit ? [hit.id] : [])
      return
    }

    if (tool === 'text') {
      // Aiming at existing text retypes it rather than stacking a second label
      // on top of the first.
      const existing = shapeNear(placed, point)
      if (existing?.type === 'text') return beginEditing(existing)

      // Typed straight onto the surface rather than through window.prompt: a
      // native dialog is unreliable while an element is fullscreen, which is
      // exactly where a board spends its time.
      beginEditing({
        id: crypto.randomUUID(),
        type: 'text',
        at: point,
        text: '',
        size: style.textSize / zoom,
        color: style.color,
        opacity: style.opacity,
      })
      return
    }

    if (inProgress.current.size > 0) return

    // Set to, these tools mark the words under the drag rather than laying
    // ink over them. Over anything but words they are ink as usual.
    const wants: Mark['kind'] | null =
      tool === 'highlighter' ? (style.snap ? 'highlight' : null) : tool === 'pen' && style.penMark !== 'none' ? style.penMark : null
    if (wants) {
      const frame = currentFrame()
      const word = frame && wordAt(frame, clientX, clientY)
      if (word) {
        surface.setPointerCapture(pointerId)
        marking.current = {
          pointerId,
          id: crypto.randomUUID(),
          kind: wants,
          block: word.block,
          start: word.range,
          range: word.range,
        }
        setDraft(markSoFar())
        return
      }
    }

    surface.setPointerCapture(pointerId)
    const ink = { color: style.color, weight: style.weight / zoom, opacity: style.opacity }
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
              weight: (style.weight * HIGHLIGHT_WEIGHT) / zoom,
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
              ...(tool === 'line' ? { heads: style.heads } : {}),
            }

    inProgress.current.set(pointerId, shape)
    setDraft(shape)
    if (tool === 'pen') watchHold(pointerId, clientX, clientY)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation()

    const wait = pending.current
    if (wait) {
      if (wait.pointerId !== event.pointerId) return
      const slop = TAP_SLOP[wait.pointerType] ?? DEFAULT_TAP_SLOP
      if (Math.hypot(event.clientX - wait.clientX, event.clientY - wait.clientY) < slop) return

      // It moved: a stroke after all, from where the press landed — not from
      // here, or a stroke that starts on a button would be missing its start.
      pending.current = null
      swallowClick.current = true
      begin(wait.pointerId, wait.clientX, wait.clientY)
    }

    extendShape(event)
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation()

    if (pending.current?.pointerId === event.pointerId) {
      // Never moved: a tap. The browser delivers the click to the control.
      pending.current = null
      return
    }

    endShape(event)
  }

  function handlePointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation()

    if (pending.current?.pointerId === event.pointerId) {
      pending.current = null
      return
    }

    cancelShape(event)
  }

  /*
    The press is not prevented any more while it may still be a tap, so a
    stroke that starts on an image would also start dragging the image — and
    the browser's drag takes the pointer with it, killing the stroke.
  */
  function preventNativeDrag(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
  }

  function handleClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!swallowClick.current) return

    swallowClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  /** Double-click with the select tool retypes a label in place. */
  function retypeText(event: ReactMouseEvent<HTMLDivElement>) {
    if (tool !== 'select') return

    const hit = shapeNear(placed, pointFrom(event, event.currentTarget.getBoundingClientRect()))
    if (hit?.type !== 'text') return

    setSelected(null)
    beginEditing(hit)
  }

  function extendShape(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = marking.current
    if (drag && drag.pointerId === event.pointerId) {
      const frame = currentFrame()
      const word = frame && wordAt(frame, event.clientX, event.clientY)
      // Only words in the block it started in: a mark is one block's.
      if (word && word.block === drag.block) {
        drag.range = wordsBetween(drag.start, word.range)
        setDraft(markSoFar())
      }
      return
    }

    const erase = erasing.current
    if (erase && erase.pointerId === event.pointerId) {
      const box = event.currentTarget.getBoundingClientRect()
      const coalesced = event.nativeEvent.getCoalescedEvents?.() ?? []
      const moves = coalesced.length > 0 ? coalesced : [event.nativeEvent]
      const swept: string[] = []

      for (const move of moves) {
        const next = pointFrom(move, box)
        for (const shape of shapesAlong(placed, erase.last, next)) swept.push(shape.id)
        erase.last = next
      }

      if (swept.length > 0) setMarked((current) => [...new Set([...current, ...swept])])
      return
    }

    const active_ = gesture.current
    if (active_) {
      const point = pointFrom(event, event.currentTarget.getBoundingClientRect())

      const transformed = transform(active_, point)

      replace((shapes) => shapes.map((shape) => (shape.id === active_.shapeId ? transformed : shape)))
      return
    }

    const shape = inProgress.current.get(event.pointerId)
    if (!shape) return

    const box = event.currentTarget.getBoundingClientRect()
    const next = grow(shape, event, box)

    inProgress.current.set(event.pointerId, next)
    if (next.type === 'stroke' && !next.highlight) {
      watchHold(event.pointerId, event.clientX, event.clientY)
      // Still holding on a preview: the preview stays, the ink keeps collecting underneath.
      if (snapped.current) return
    }
    setDraft(next)
  }

  function grow(shape: Shape, event: ReactPointerEvent<HTMLDivElement>, box: DOMRect): Shape {
    // A label is placed, a mark grows word by word elsewhere; neither is dragged out.
    if (shape.type === 'text' || shape.type === 'mark') return shape

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

  function endShape(event: ReactPointerEvent<HTMLDivElement>) {
    if (marking.current?.pointerId === event.pointerId) {
      const mark = markSoFar()
      marking.current = null
      setDraft(null)
      if (mark) commit((shapes) => [...shapes, mark])
      return
    }

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
      const { before, shapeId } = gesture.current
      gesture.current = null
      setState((state) => {
        const recorded = timeline.record(state, before)
        // Moved or resized, the shape is over something else now.
        return { ...recorded, shapes: recorded.shapes.map((shape) => (shape.id === shapeId ? settle(shape) : shape)) }
      })
      return
    }

    const shape = inProgress.current.get(event.pointerId)
    if (!shape) return

    inProgress.current.delete(event.pointerId)
    setDraft(null)

    // Held still at the end, or asked for tidy shapes: the stroke becomes
    // what it was nearly — if it was nearly anything.
    const held = snapped.current
    forgetHold()
    if (held) return commit((shapes) => [...shapes, settle(held)])
    if (shape.type === 'stroke' && !shape.highlight && style.tidy) {
      const found = recognise(shape.points)
      if (found) return commit((shapes) => [...shapes, settle(primitiveFrom(found, shape))])
    }

    if (worthKeeping(shape)) commit((shapes) => [...shapes, settle(shape)])
  }

  function cancelShape(event: ReactPointerEvent<HTMLDivElement>) {
    if (marking.current?.pointerId === event.pointerId) {
      marking.current = null
      setDraft(null)
      return
    }

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
    forgetHold()
    setDraft(null)
  }

  return (
    <div
      className={className ? `annotation-surface ${className}` : 'annotation-surface'}
      ref={element}
      data-surface-id={id}
      data-active={active ? '' : undefined}
      data-tool={active ? tool : undefined}
      /*
        The handlers sit here, not on the layer: the layer is never hit-tested,
        so what a press lands on is the host's own element — which is how a
        press can tell a button from a paragraph. See ADR 0006.
      */
      onPointerDown={active ? handlePointerDown : undefined}
      onPointerMove={active ? handlePointerMove : undefined}
      onPointerUp={active ? handlePointerUp : undefined}
      onPointerCancel={active ? handlePointerCancel : undefined}
      onClickCapture={active ? handleClickCapture : undefined}
      onDragStart={active ? preventNativeDrag : undefined}
      onDoubleClick={active ? retypeText : undefined}
    >
      {children}
      {/* Width 0 means layout hasn't settled; scaling by it would misplace every shape. */}
      {width > 0 && (
        <svg
          className="annotation-layer"
          /*
            Not aria-hidden. It was, while the layer held only ink — but a
            widget puts real controls in here, and hiding the subtree took the
            timer's buttons out of the accessibility tree with it. The shapes
            themselves carry no accessible name, so they stay invisible to
            assistive tech either way.
          */
          role="presentation"
          viewBox={viewBox ? `0 0 ${viewBox.width} ${viewBox.height}` : undefined}
          // The host sizes the layer to the image's own aspect, so there is
          // nothing to letterbox; this only stops a sub-pixel mismatch from
          // shifting every shape by half a pixel.
          preserveAspectRatio={viewBox ? 'none' : undefined}
        >
          {placed
            .filter((shape) => shape.id !== editing?.id)
            .map((shape) => (
            /* Marked shapes fade rather than vanish, so a sweep can be seen
               before the pointer lifts and can still be cancelled. */
              <g key={shape.id} data-marked={marked.includes(shape.id) ? '' : undefined}>
                <ShapeView shape={shape} width={renderWidth} />
              </g>
            ))}
          {draft && <ShapeView shape={draft} width={renderWidth} />}
          {editing && (
            <TextEditor
              shape={editing}
              width={renderWidth}
              onChange={setEditing}
              onCommit={() => {
                if (worthKeeping(editing)) commitText(editing)
                setEditing(null)
              }}
              onCancel={() => setEditing(null)}
            />
          )}
          {tool === 'select' && selectedShape && (
            <SelectionOverlay shape={selectedShape} width={renderWidth} />
          )}
        </svg>
      )}
    </div>
  )
}
