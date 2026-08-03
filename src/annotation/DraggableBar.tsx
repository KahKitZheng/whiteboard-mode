import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { GripVertical } from 'lucide-react'
import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
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
  children: ReactNode
}

/**
 * A floating bar the teacher can move. Wherever a bar sits it covers lesson
 * content, and which content that is depends on the lesson, so only the
 * teacher can decide. Clamped to the window, so there is no off-screen
 * position to recover from.
 */
export function DraggableBar({ id, label, className, offset, onOffsetChange, children }: Props) {
  function onDragEnd({ delta }: DragEndEvent) {
    onOffsetChange({ x: offset.x + delta.x, y: offset.y + delta.y })
  }

  const reclamp = useCallback(
    (box: DOMRect) => {
      onOffsetChange(clampToWindow(offset, box, { width: innerWidth, height: innerHeight }))
    },
    [offset, onOffsetChange],
  )

  return (
    <DndContext modifiers={[restrictToWindowEdges]} onDragEnd={onDragEnd}>
      <Bar id={id} label={label} className={className} offset={offset} onResize={reclamp}>
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
  children: ReactNode
}

function Bar({ id, label, className, offset, onResize, children }: BarProps) {
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
    <div className={className} ref={setRefs} style={style} data-dragging={isDragging ? '' : undefined}>
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

      {children}
    </div>
  )
}
