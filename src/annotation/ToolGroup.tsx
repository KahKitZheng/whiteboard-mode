import { Popover } from '@base-ui-components/react/popover'
import { Toolbar } from '@base-ui-components/react/toolbar'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { ICON_SIZE } from './toolbar'
import { useWhiteboardMode, type Tool } from './WhiteboardMode'

export type ToolChoice = { name: Tool; label: string; Icon: LucideIcon }

type Props = {
  label: string
  choices: ToolChoice[]
  onPick: (tool: Tool) => void
  /** The one button on the bar that stands for every tool in the group; the settings bubble anchors to it. */
  buttonRef: (element: HTMLButtonElement | null) => void
}

/**
 * Several tools behind one button, for the ones that are not drawing tools:
 * the widgets. The button wears whichever was last used, so the one a teacher
 * keeps reaching for stays a single press away — and pressing it picks that
 * tool there and then, as well as offering the others.
 */
export function ToolGroup({ label, choices, onPick, buttonRef }: Props) {
  const { tool } = useWhiteboardMode()
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState<Tool>(choices[0].name)

  const active = choices.some((choice) => choice.name === tool)
  const showing = choices.find((choice) => choice.name === (active ? tool : last)) ?? choices[0]

  function choose(name: Tool) {
    setLast(name)
    onPick(name)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Toolbar.Button
        className="icon-button tool-group"
        aria-label={label}
        title={label}
        data-pressed={active ? '' : undefined}
        ref={buttonRef}
        onClick={() => onPick(showing.name)}
        render={<Popover.Trigger />}
      >
        <showing.Icon size={ICON_SIZE} />
        <ChevronDown className="tool-group-caret" size={12} aria-hidden="true" />
      </Toolbar.Button>

      <Popover.Portal>
        <Popover.Positioner side="top" sideOffset={22}>
          <Popover.Popup className="tool-menu">
            {choices.map(({ name, label: choiceLabel, Icon }) => (
              <button
                key={name}
                type="button"
                className="icon-button"
                aria-label={choiceLabel}
                title={choiceLabel}
                data-pressed={tool === name ? '' : undefined}
                onClick={() => choose(name)}
              >
                <Icon size={ICON_SIZE} />
              </button>
            ))}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
