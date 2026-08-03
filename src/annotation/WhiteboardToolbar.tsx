import { Toggle } from '@base-ui-components/react/toggle'
import { ToggleGroup } from '@base-ui-components/react/toggle-group'
import { Toolbar } from '@base-ui-components/react/toolbar'
import {
  ArrowUpRight,
  Circle,
  Eraser,
  MousePointer2,
  Pen,
  Presentation,
  Slash,
  Square,
  Timer,
  Trash2,
  Type,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { ContextualBar } from './ContextualBar'
import { DraggableBar, type Offset } from './DraggableBar'
import { ICON_SIZE } from './toolbar'
import { ToolGroup, type ToolChoice } from './ToolGroup'
import { useWhiteboardMode, type Tool } from './WhiteboardMode'
import './toolbar.scss'

/**
 * A glyph rather than a word, because a teacher picks a tool from across the
 * room — the tool's name is the accessible one, on the button.
 */
const TOOLS: { name: Tool; label: string; Icon: LucideIcon }[] = [
  { name: 'select', label: 'Select', Icon: MousePointer2 },
  { name: 'pen', label: 'Pen', Icon: Pen },
  { name: 'text', label: 'Text', Icon: Type },
  { name: 'eraser', label: 'Eraser', Icon: Eraser },
]

/** Siblings of each other, rather than of the pen. */
const SHAPES: ToolChoice[] = [
  { name: 'rect', label: 'Rectangle', Icon: Square },
  { name: 'ellipse', label: 'Ellipse', Icon: Circle },
  { name: 'line', label: 'Line', Icon: Slash },
  { name: 'arrow', label: 'Arrow', Icon: ArrowUpRight },
]

/** A timer is not a drawing tool; it only shares the tray with them. */
const WIDGETS: ToolChoice[] = [{ name: 'timer', label: 'Timer', Icon: Timer }]

/**
 * The controls a teacher reaches for constantly: which tool, and undo. Anything
 * that only matters some of the time lives on the contextual bar, so this one
 * keeps the same size and the same place whatever is going on — and so the
 * tool tray has room to grow.
 */
export function WhiteboardToolbar() {
  const { active, setActive, tool, setTool, actions } = useWhiteboardMode()

  // ponytail: positions are not persisted. Store them against a key here if
  // teachers turn out to re-drag the bars every lesson.
  const [main, setMain] = useState<Offset>({ x: 0, y: 0 })
  // Held here rather than inside the bar, so one that comes and goes with the
  // selection returns to where it was put.
  const [contextual, setContextual] = useState<Offset>({ x: 0, y: 0 })

  /*
    The contextual bar rests above this one, so it has to know how tall this one
    actually is. A fixed number was wrong the moment the toolbar wrapped onto a
    second row: it sat 58px up, inside a bar three rows tall.
  */
  const measure = useCallback((box: DOMRect) => {
    document.documentElement.style.setProperty('--main-bar-height', `${box.height}px`)
  }, [])

  return (
    <>
      {active && <ContextualBar offset={contextual} onOffsetChange={setContextual} />}

      <DraggableBar
        id="whiteboard-toolbar"
        label="Move toolbar"
        className="whiteboard-toolbar"
        offset={main}
        onOffsetChange={setMain}
        onMeasure={measure}
      >
        {(vertical) => (
          <Toolbar.Root
            className="toolbar-controls"
            orientation={vertical ? 'vertical' : 'horizontal'}
          >
            <Toolbar.Button
              className="whiteboard-switch"
            render={<Toggle pressed={active} onPressedChange={setActive} />}
          >
            <Presentation size={ICON_SIZE} />
            {/* Hidden when the bar stands up, where a word would set the width. */}
            <span className="switch-label">Whiteboard</span>
          </Toolbar.Button>

          {active && (
            <>
              <Toolbar.Separator />

              <div className="tools">
                <ToggleGroup
                  value={[tool]}
                  onValueChange={([next]) => next && setTool(next as Tool)}
                  className="tool-toggles"
                >
                  {TOOLS.slice(0, 2).map(({ name, label, Icon }) => (
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

                <ToolGroup label="Shapes" choices={SHAPES} />

                <ToggleGroup
                  value={[tool]}
                  onValueChange={([next]) => next && setTool(next as Tool)}
                  className="tool-toggles"
                >
                  {TOOLS.slice(2).map(({ name, label, Icon }) => (
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

                <ToolGroup label="Widgets" choices={WIDGETS} />
              </div>

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
              <Toolbar.Button
                className="clear-button"
                aria-label="Clear all"
                title="Clear all"
                onClick={() => actions?.clear()}
              >
                <span className="switch-label">Clear all</span>
                <Trash2 className="clear-icon" size={ICON_SIZE} />
              </Toolbar.Button>
            </>
          )}
          </Toolbar.Root>
        )}
      </DraggableBar>
    </>
  )
}
