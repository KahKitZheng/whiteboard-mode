import { Toggle } from '@base-ui-components/react/toggle'
import { ToggleGroup } from '@base-ui-components/react/toggle-group'
import { Toolbar } from '@base-ui-components/react/toolbar'
import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { useState, type CSSProperties } from 'react'
import { useWhiteboardMode, type Tool } from './WhiteboardMode'
import './toolbar.scss'

const TOOLS: { name: Tool; label: string }[] = [
  { name: 'select', label: 'Select' },
  { name: 'pen', label: 'Pen' },
  { name: 'rect', label: 'Rect' },
  { name: 'ellipse', label: 'Ellipse' },
  { name: 'line', label: 'Line' },
  { name: 'arrow', label: 'Arrow' },
  { name: 'text', label: 'Text' },
  { name: 'timer', label: 'Timer' },
  { name: 'eraser', label: 'Eraser' },
]

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

  return (
    <DndContext modifiers={[restrictToWindowEdges]} onDragEnd={onDragEnd}>
      <Bar offset={offset} />
    </DndContext>
  )
}

function Bar({ offset }: { offset: { x: number; y: number } }) {
  const { active, setActive, tool, setTool, actions } = useWhiteboardMode()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useDraggable({ id: DRAG_ID })

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
      ref={setNodeRef}
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
        <span aria-hidden="true">⠿</span>
      </button>

      <Toolbar.Root className="toolbar-controls">
        <Toolbar.Button render={<Toggle pressed={active} onPressedChange={setActive} />}>
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
              {TOOLS.map(({ name, label }) => (
                <Toolbar.Button key={name} render={<Toggle value={name} />}>
                  {label}
                </Toolbar.Button>
              ))}
            </ToggleGroup>

            <Toolbar.Separator />

            {actions?.hasSelection && (
              <>
                <Toolbar.Button onClick={() => actions.bringToFront()}>Front</Toolbar.Button>
                <Toolbar.Button onClick={() => actions.sendToBack()}>Back</Toolbar.Button>
                <Toolbar.Button onClick={() => actions.removeSelected()}>Delete</Toolbar.Button>
                <Toolbar.Separator />
              </>
            )}

            <Toolbar.Button disabled={!actions?.canUndo} onClick={() => actions?.undo()}>
              Undo
            </Toolbar.Button>
            <Toolbar.Button onClick={() => actions?.clear()}>Clear</Toolbar.Button>
          </>
        )}
      </Toolbar.Root>
    </div>
  )
}
