import { Popover } from '@base-ui-components/react/popover'
import { Toggle } from '@base-ui-components/react/toggle'
import { ToggleGroup } from '@base-ui-components/react/toggle-group'
import { Toolbar } from '@base-ui-components/react/toolbar'
import {
  BringToFront,
  Eraser,
  Highlighter,
  MousePointer2,
  Pen,
  Presentation,
  Redo2,
  SendToBack,
  Slash,
  Timer,
  Trash2,
  Type,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ICON_SIZE, settingsFor } from './toolbar'
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
  // Next to the pen, because it is one: the same gesture, laid over the words
  // rather than beside them.
  { name: 'highlighter', label: 'Highlighter', Icon: Highlighter },
  { name: 'eraser', label: 'Eraser', Icon: Eraser },
  { name: 'text', label: 'Text', Icon: Type },
  // Straight, bent, arrowed — reached for as often as the pen, to point at
  // things. Boxes and circles have no tool: the pen's Tidy setting makes them.
  { name: 'line', label: 'Line', Icon: Slash },
  // Not a drawing tool; it only shares the row with them.
  { name: 'timer', label: 'Timer', Icon: Timer },
]

/**
 * One pill, fixed along the bottom: the switch, the tools, and undo. Whatever
 * only matters for the tool in hand — its colour, its weight, what to do with
 * the selected shape — is a bubble above that tool's button, so the pill keeps
 * one size and one place whatever is going on. See ADR 0010.
 */
export function WhiteboardToolbar() {
  const { active, setActive, tool, setTool, actions } = useWhiteboardMode()
  const buttons = useRef<Partial<Record<Tool, HTMLButtonElement | null>>>({})
  const [open, setOpen] = useState(false)

  const hasSelection = actions?.hasSelection ?? false
  const hasSettings = Object.values(settingsFor(tool, actions?.selectedStyle ?? null)).some(Boolean)
  // A selection holds the bubble up: its controls are the only way to restyle
  // or delete it from the toolbar.
  const showing = active && (open || hasSelection) && (hasSettings || hasSelection)

  function pick(next: Tool) {
    // Off, no tool is in hand; picking one arms the whiteboard with it.
    if (!active) {
      setActive(true)
      setTool(next)
      setOpen(true)
      return
    }
    // Picking a tool shows its settings; pressing it again puts them away.
    if (next === tool) setOpen((was) => !was)
    else {
      setTool(next)
      setOpen(true)
    }
  }

  // A press anywhere else — the lesson, most of all — puts the bubble away.
  // Capture phase, because the surface stops its presses from bubbling.
  useEffect(() => {
    if (!showing) return
    function onPress(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest('.whiteboard-toolbar, .tool-bubble')) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPress, true)
    return () => document.removeEventListener('pointerdown', onPress, true)
  }, [showing])

  return (
    <Toolbar.Root className="whiteboard-toolbar">
      <Toolbar.Button className="whiteboard-switch" render={<Toggle pressed={active} onPressedChange={setActive} />}>
        <Presentation size={ICON_SIZE} />
        <span className="switch-label">Whiteboard</span>
      </Toolbar.Button>

      {/* Every tool, always: off, none is in hand, and a press on one arms the whiteboard. */}
      <ToggleGroup value={active ? [tool] : []} onValueChange={([next]) => next && pick(next as Tool)} className="tools">
        {TOOLS.map(({ name, label, Icon }) => (
          <Toolbar.Button
            key={name}
            className="icon-button"
            aria-label={label}
            title={label}
            ref={(element) => {
              buttons.current[name] = element
            }}
            // The group only reports a change; a press on the tool in hand
            // has to reach here too, to toggle its settings.
            onClick={() => active && name === tool && pick(name)}
            render={<Toggle value={name} />}
          >
            <Icon size={ICON_SIZE} />
          </Toolbar.Button>
        ))}
      </ToggleGroup>

      {/* They undo work rather than make it, so they keep apart from the tools. */}
      <div className="history" role="group" aria-label="History">
        <Toolbar.Button className="icon-button" aria-label="Undo" title="Undo" disabled={!actions?.canUndo} onClick={() => actions?.undo()}>
          <Undo2 size={ICON_SIZE} />
        </Toolbar.Button>
        <Toolbar.Button className="icon-button" aria-label="Redo" title="Redo" disabled={!actions?.canRedo} onClick={() => actions?.redo()}>
          <Redo2 size={ICON_SIZE} />
        </Toolbar.Button>
        <Toolbar.Button className="icon-button clear-button" aria-label="Clear all" title="Clear all" disabled={!actions} onClick={() => actions?.clear()}>
          <Trash2 size={ICON_SIZE} />
        </Toolbar.Button>
      </div>

      <Popover.Root open={showing} onOpenChange={(next) => !next && setOpen(false)}>
        <Popover.Portal>
          <Popover.Positioner anchor={buttons.current[tool] ?? null} side="top" sideOffset={12} collisionPadding={16}>
            <Popover.Popup className="tool-bubble" initialFocus={false}>
              <Popover.Arrow className="tool-bubble-arrow">
                <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden="true">
                  <path d="M0 0 L10 10 L20 0" />
                </svg>
              </Popover.Arrow>
              <Toolbar.Root className="bubble-controls">
                <ToolSettings />
                {hasSelection && actions && (
                  <div className="setting" role="group" aria-label="Shape">
                    <span className="setting-label">Shape</span>
                    <div className="choices">
                      <Toolbar.Button className="icon-button" aria-label="Bring to front" title="Bring to front" onClick={() => actions.bringToFront()}>
                        <BringToFront size={ICON_SIZE} />
                      </Toolbar.Button>
                      <Toolbar.Button className="icon-button" aria-label="Send to back" title="Send to back" onClick={() => actions.sendToBack()}>
                        <SendToBack size={ICON_SIZE} />
                      </Toolbar.Button>
                      <Toolbar.Button className="icon-button clear-button" aria-label="Delete shape" title="Delete shape" onClick={() => actions.removeSelected()}>
                        <Trash2 size={ICON_SIZE} />
                      </Toolbar.Button>
                    </div>
                  </div>
                )}
              </Toolbar.Root>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </Toolbar.Root>
  )
}
