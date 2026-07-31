import { Toggle } from '@base-ui-components/react/toggle'
import { ToggleGroup } from '@base-ui-components/react/toggle-group'
import { Toolbar } from '@base-ui-components/react/toolbar'
import { useWhiteboardMode, type Tool } from './WhiteboardMode'
import './toolbar.scss'

const TOOLS: Tool[] = ['pen', 'eraser']

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
            {TOOLS.map((name) => (
              <Toolbar.Button key={name} render={<Toggle value={name} />}>
                {name === 'pen' ? 'Pen' : 'Eraser'}
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
