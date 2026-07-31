import { Toggle } from '@base-ui-components/react/toggle'
import { ToggleGroup } from '@base-ui-components/react/toggle-group'
import { Toolbar } from '@base-ui-components/react/toolbar'
import { useWhiteboardMode, type Tool } from './WhiteboardMode'
import './toolbar.scss'

const TOOLS: { name: Tool; label: string }[] = [
  { name: 'pen', label: 'Pen' },
  { name: 'rect', label: 'Rect' },
  { name: 'ellipse', label: 'Ellipse' },
  { name: 'line', label: 'Line' },
  { name: 'arrow', label: 'Arrow' },
  { name: 'text', label: 'Text' },
  { name: 'eraser', label: 'Eraser' },
]

export function WhiteboardToolbar() {
  const { active, setActive, tool, setTool, actions } = useWhiteboardMode()

  return (
    <Toolbar.Root className="whiteboard-toolbar">
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

          <Toolbar.Button disabled={!actions?.canUndo} onClick={() => actions?.undo()}>
            Undo
          </Toolbar.Button>
          <Toolbar.Button onClick={() => actions?.clear()}>Clear</Toolbar.Button>
        </>
      )}
    </Toolbar.Root>
  )
}
