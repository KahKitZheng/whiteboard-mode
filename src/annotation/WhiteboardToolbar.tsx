import { Toggle } from '@base-ui-components/react/toggle'
import { Toolbar } from '@base-ui-components/react/toolbar'
import { useWhiteboardMode } from './WhiteboardMode'
import './toolbar.scss'

export function WhiteboardToolbar() {
  const { active, setActive } = useWhiteboardMode()

  return (
    <Toolbar.Root className="whiteboard-toolbar">
      <Toolbar.Button render={<Toggle pressed={active} onPressedChange={setActive} />}>
        Whiteboard
      </Toolbar.Button>

      {/*
        Tools only exist while the mode is on, and pen is the only one. It shows
        as a label rather than a button because a control with nothing to switch
        to is a lie — #7 turns this into a real ToggleGroup.
      */}
      {active && (
        <>
          <Toolbar.Separator />
          <span className="current-tool">Pen</span>
        </>
      )}
    </Toolbar.Root>
  )
}
