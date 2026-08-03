import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { GripVertical } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { clampToWindow, ICON_SIZE } from './toolbar'

export type Offset = { x: number; y: number }

type Props = {
  /** Unique per bar — dnd-kit keys the drag on it. */
  id: string
  label: string
  className: string
  /*
    Where it has been dragged to is held by the caller, so a bar that comes and
    goes with the selection returns to where it was put rather than snapping
    back to the middle each time.
  */
  offset: Offset
  onOffsetChange: (offset: Offset) => void
  /** Called with the bar's box whenever it changes, for anything stacked on it. */
  onMeasure?: (box: DOMRect) => void
  /** Given the orientation, because Base UI needs telling as well as CSS. */
  children: (vertical: boolean) => ReactNode
}

/**
 * How near a side counts as being at it, as a fraction of the window.
 *
 * Judged by where the pointer was let go, not by where the bar ended up. A wide
 * bar is clamped on screen, so it can never *get* near an edge while it is
 * wide — and measuring the bar itself would have it stand up, become narrow,
 * measure as no longer near the edge, and lie back down. Where the teacher
 * dropped it does not move.
 */
const EDGE_FRACTION = 0.25

/**
 * A floating bar the teacher can move. Wherever a bar sits it covers lesson
 * content, and which content that is depends on the lesson, so only the
 * teacher can decide. Clamped to the window, so there is no off-screen
 * position to recover from.
 */
export function DraggableBar({
  id,
  label,
  className,
  offset,
  onOffsetChange,
  onMeasure,
  children,
}: Props) {
  /*
    Dragged near a side, a bar stands up. A row of controls along the bottom is
    right where a lesson's text is; the same controls in a column at the edge
    sit over the margin instead.
  */
  const [vertical, setVertical] = useState(false)

  /*
    The pointer's own position, tracked rather than reconstructed from the
    drag's delta: restrictToWindowEdges clamps that delta to keep the bar on
    screen, so once the bar is against a side the delta stops growing while the
    teacher's finger carries on. Reconstructed, a drag to the far right read as
    a drag to the middle.
  */
  const pointerX = useRef<number | null>(null)

  const trackPointer = useCallback((event: PointerEvent) => {
    pointerX.current = event.clientX
  }, [])

  function onDragStart() {
    pointerX.current = null
    window.addEventListener('pointermove', trackPointer)
  }

  function onDragEnd({ delta, activatorEvent }: DragEndEvent) {
    window.removeEventListener('pointermove', trackPointer)

    const droppedAt = pointerX.current ?? (activatorEvent as PointerEvent).clientX + delta.x
    const nextVertical = Number.isFinite(droppedAt)
      ? droppedAt < innerWidth * EDGE_FRACTION || droppedAt > innerWidth * (1 - EDGE_FRACTION)
      : vertical

    setVertical(nextVertical)

    /*
      Turning takes the bar from a wide row to a narrow column, and the offset
      it had was clamped for the old width — kept, a bar dropped against the
      right edge stood up somewhere near the middle. So on turning it re-anchors
      on where it was actually dropped; the clamp then pulls it fully on screen.
    */
    onOffsetChange({
      x: nextVertical === vertical ? offset.x + delta.x : droppedAt - innerWidth / 2,
      y: offset.y + delta.y,
    })
  }

  function onDragCancel() {
    window.removeEventListener('pointermove', trackPointer)
  }

  const reclamp = useCallback(
    (box: DOMRect) => {
      onMeasure?.(box)
      onOffsetChange(clampToWindow(offset, box, { width: innerWidth, height: innerHeight }))
    },
    [offset, onOffsetChange, onMeasure],
  )

  return (
    <DndContext
      modifiers={[restrictToWindowEdges]}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <Bar
        id={id}
        label={label}
        className={className}
        offset={offset}
        onResize={reclamp}
        vertical={vertical}
      >
        {children}
      </Bar>
    </DndContext>
  )
}

type BarProps = {
  id: string
  label: string
  className: string
  offset: Offset
  /** Called with the bar's box whenever it, or the window, changes size. */
  onResize: (box: DOMRect) => void
  vertical: boolean
  children: (vertical: boolean) => ReactNode
}

function Bar({ id, label, className, offset, onResize, vertical, children }: BarProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useDraggable({ id })

  // dnd-kit wants the node too, and it only takes one ref.
  const element = useRef<HTMLDivElement | null>(null)
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      element.current = node
      setNodeRef(node)
    },
    [setNodeRef],
  )

  useEffect(() => {
    const node = element.current
    // Mid-drag the box already carries the drag transform, so folding it into
    // the offset would count the drag twice. The drop clamps anyway.
    if (!node || isDragging) return

    function reclamp() {
      if (node) onResize(node.getBoundingClientRect())
    }

    const observer = new ResizeObserver(reclamp)
    observer.observe(node)
    window.addEventListener('resize', reclamp)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', reclamp)
    }
  }, [isDragging, onResize])

  /*
    Where it has been dragged to lives in the CSS `translate` property, next to
    the centering it has to survive; the in-flight drag lives in `transform`.
    Keeping the two apart is what lets restrictToWindowEdges clamp correctly — it
    measures the box where it already sits, so all it has to reason about is the
    delta of the current drag.
  */
  const style = {
    '--offset-x': `${offset.x}px`,
    '--offset-y': `${offset.y}px`,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  } as CSSProperties

  return (
    <div
      className={className}
      ref={setRefs}
      style={style}
      data-dragging={isDragging ? '' : undefined}
      data-orientation={vertical ? 'vertical' : undefined}
    >
      {/*
        The handle sits outside Toolbar.Root on purpose: Base UI gives a toolbar
        roving arrow-key focus, which would eat the arrow keys dnd-kit's keyboard
        sensor needs to move the panel without a pointer.
      */}
      <button
        type="button"
        className="drag-handle"
        ref={setActivatorNodeRef}
        aria-label={label}
        title={label}
        {...listeners}
        {...attributes}
      >
        <GripVertical size={ICON_SIZE} />
      </button>

      {children(vertical)}
    </div>
  )
}
