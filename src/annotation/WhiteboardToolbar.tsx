import { Toggle } from '@base-ui-components/react/toggle'
import { ToggleGroup } from '@base-ui-components/react/toggle-group'
import { Toolbar } from '@base-ui-components/react/toolbar'
import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import {
  ArrowUpRight,
  BringToFront,
  Circle,
  Eraser,
  GripVertical,
  MousePointer2,
  Pen,
  Presentation,
  SendToBack,
  Slash,
  Square,
  Timer,
  Trash2,
  Type,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { clampToWindow } from './toolbar'
import { ToolSettings } from './ToolSettings'
import { useWhiteboardMode, type Tool } from './WhiteboardMode'
import './toolbar.scss'

/**
 * A glyph rather than a word, because a teacher picks a tool from across the
 * room — the tool's name is the accessible one, on the button.
 */
const TOOLS: { name: Tool; label: string; Icon: LucideIcon }[] = [
  { name: 'select', label: 'Select', Icon: MousePointer2 },
  { name: 'pen', label: 'Pen', Icon: Pen },
  { name: 'rect', label: 'Rectangle', Icon: Square },
  { name: 'ellipse', label: 'Ellipse', Icon: Circle },
  { name: 'line', label: 'Line', Icon: Slash },
  { name: 'arrow', label: 'Arrow', Icon: ArrowUpRight },
  { name: 'text', label: 'Text', Icon: Type },
  { name: 'timer', label: 'Timer', Icon: Timer },
  { name: 'eraser', label: 'Eraser', Icon: Eraser },
]

const ICON_SIZE = 22
const DRAG_ID = 'whiteboard-toolbar'

/**
 * The toolbar moves rather than sitting fixed, because wherever it sits it
 * covers lesson content — and which content that is depends on the lesson, so
 * only the teacher can decide. It is clamped to the window, so there is no
 * off-screen position to recover from.
 */
export function WhiteboardToolbar() {
  // ponytail: the position is not persisted. Store it against a key here if
  // teachers turn out to re-drag it every lesson.
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  function onDragEnd({ delta }: DragEndEvent) {
    setOffset((at) => ({ x: at.x + delta.x, y: at.y + delta.y }))
  }

  const reclamp = useCallback((box: DOMRect) => {
    setOffset((at) => clampToWindow(at, box, { width: innerWidth, height: innerHeight }))
  }, [])

  return (
    <DndContext modifiers={[restrictToWindowEdges]} onDragEnd={onDragEnd}>
      <Bar offset={offset} onResize={reclamp} />
    </DndContext>
  )
}

type BarProps = {
  offset: { x: number; y: number }
  /** Called with the toolbar's box whenever it, or the window, changes size. */
  onResize: (box: DOMRect) => void
}

function Bar({ offset, onResize }: BarProps) {
  const { active, setActive, tool, setTool, actions } = useWhiteboardMode()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useDraggable({ id: DRAG_ID })

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
      className="whiteboard-toolbar"
      ref={setRefs}
      style={style}
      data-dragging={isDragging ? '' : undefined}
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
        aria-label="Move toolbar"
        title="Move toolbar"
        {...listeners}
        {...attributes}
      >
        <GripVertical size={ICON_SIZE} />
      </button>

      <Toolbar.Root className="toolbar-controls">
        <Toolbar.Button
          className="whiteboard-switch"
          render={<Toggle pressed={active} onPressedChange={setActive} />}
        >
          <Presentation size={ICON_SIZE} />
          Whiteboard
        </Toolbar.Button>

        {active && (
          <>
            <Toolbar.Separator />

            <ToggleGroup
              value={[tool]}
              onValueChange={([next]) => next && setTool(next as Tool)}
              className="tools"
            >
              {TOOLS.map(({ name, label, Icon }) => (
                <Toolbar.Button
                  key={name}
                  className="icon-button"
                  aria-label={label}
                  title={label}
                  render={<Toggle value={name} />}
                >
                  <Icon size={ICON_SIZE} />
                </Toolbar.Button>
              ))}
            </ToggleGroup>

            <ToolSettings />

            {actions?.hasSelection && (
              <>
                <Toolbar.Separator />

                <Toolbar.Button
                  className="icon-button"
                  aria-label="Bring to front"
                  title="Bring to front"
                  onClick={() => actions.bringToFront()}
                >
                  <BringToFront size={ICON_SIZE} />
                </Toolbar.Button>
                <Toolbar.Button
                  className="icon-button"
                  aria-label="Send to back"
                  title="Send to back"
                  onClick={() => actions.sendToBack()}
                >
                  <SendToBack size={ICON_SIZE} />
                </Toolbar.Button>
                <Toolbar.Button
                  className="icon-button"
                  aria-label="Delete shape"
                  title="Delete shape"
                  onClick={() => actions.removeSelected()}
                >
                  <Trash2 size={ICON_SIZE} />
                </Toolbar.Button>
              </>
            )}

            <Toolbar.Separator />

            <Toolbar.Button
              className="icon-button"
              aria-label="Undo"
              title="Undo"
              disabled={!actions?.canUndo}
              onClick={() => actions?.undo()}
            >
              <Undo2 size={ICON_SIZE} />
            </Toolbar.Button>
            {/* Wiping a surface is rare and cannot be taken back past one undo,
                so it says so in words rather than hiding behind a glyph. */}
            <Toolbar.Button className="clear-button" onClick={() => actions?.clear()}>
              Clear all
            </Toolbar.Button>
          </>
        )}
      </Toolbar.Root>
    </div>
  )
}
