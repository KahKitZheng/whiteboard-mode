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
}

/**
 * Several tools behind one button. Nine buttons in a row was already most of
 * the tray's width, and the tool list is meant to keep growing — a widget is
 * not a sibling of the pen, and shapes are siblings of each other rather than
 * of anything else.
 *
 * The button wears whichever of its tools was last used, so the one a teacher
 * keeps reaching for stays a single press away.
 */
export function ToolGroup({ label, choices }: Props) {
  const { tool, setTool } = useWhiteboardMode()
  const [open, setOpen] = useState(false)
  const [last, setLast] = useState<Tool>(choices[0].name)

  const active = choices.some((choice) => choice.name === tool)
  const showing = choices.find((choice) => choice.name === (active ? tool : last)) ?? choices[0]

  function choose(name: Tool) {
    setLast(name)
    setTool(name)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Toolbar.Button
        className="icon-button tool-group"
        aria-label={label}
        title={label}
        data-pressed={active ? '' : undefined}
        render={<Popover.Trigger />}
      >
        <showing.Icon size={ICON_SIZE} />
        <ChevronDown className="tool-group-caret" size={12} />
      </Toolbar.Button>

      <Popover.Portal>
        <Popover.Positioner sideOffset={8}>
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
