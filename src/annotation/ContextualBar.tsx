import { Toolbar } from '@base-ui-components/react/toolbar'
import { BringToFront, SendToBack, Trash2 } from 'lucide-react'
import { DraggableBar, type Offset } from './DraggableBar'
import { ICON_SIZE, settingsFor } from './toolbar'
import { ToolSettings } from './ToolSettings'
import { useWhiteboardMode } from './WhiteboardMode'

/**
 * Everything that only matters some of the time: how the next shape will look,
 * and what can be done to the one that is selected.
 *
 * It lives apart from the main toolbar so that the controls a teacher reaches
 * for constantly — the tools and undo — stay in the same place and the same
 * size whatever else is going on. It is also the room to grow: settings can be
 * added here without the tool tray getting any wider.
 *
 * A column at the low left, and a column wherever it is dragged to. Its
 * contents come and go with the selection, so a panel that also changed shape
 * with its position would move every control it holds twice over — and the
 * settings a teacher is picking from are the ones they are already reaching
 * for, which is an argument for keeping them exactly where they were left.
 */
export function ContextualBar({
  offset,
  onOffsetChange,
}: {
  offset: Offset
  onOffsetChange: (offset: Offset) => void
}) {
  const { tool, actions } = useWhiteboardMode()
  const settings = settingsFor(tool, actions?.selectedStyle ?? null)
  // Every flag, not a hand-picked three — the timer offers only an opacity, and
  // listing them by name meant it offered nothing at all.
  const hasSettings = Object.values(settings).some(Boolean)

  // Nothing to say, so it says nothing rather than sitting there empty.
  if (!hasSettings && !actions?.hasSelection) return null

  return (
    <DraggableBar
      id="whiteboard-settings"
      label="Move settings"
      className="whiteboard-toolbar contextual-bar"
      offset={offset}
      onOffsetChange={onOffsetChange}
      alwaysVertical
    >
      {(vertical) => (
        <Toolbar.Root
          className="toolbar-controls"
          orientation={vertical ? 'vertical' : 'horizontal'}
        >
          <ToolSettings />

        {actions?.hasSelection && (
          <div className="setting" role="group" aria-label="Shape">
            <span className="setting-label">Shape</span>
            <div className="choices">
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
            </div>
          </div>
        )}
        </Toolbar.Root>
      )}
    </DraggableBar>
  )
}
