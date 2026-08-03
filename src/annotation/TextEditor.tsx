import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { scaleFor } from './coords'
import { textMetrics } from './geometry'
import type { Text } from './types'

type Props = {
  shape: Text
  /** Surface width, for scaling reference-space coordinates. */
  width: number
  onChange: (shape: Text) => void
  onCommit: () => void
  onCancel: () => void
}

/**
 * A real input, positioned over where the text will render.
 *
 * Typing used to be a window keydown listener appending characters, which
 * meant no caret placement, no selection, no word deletion, no clipboard, no
 * IME, and no on-screen keyboard on a touch panel. None of that is worth
 * reimplementing — an input has it all, and it is the same foreignObject
 * mechanism the widgets already use.
 */
export function TextEditor({ shape, width, onChange, onCommit, onCancel }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const scale = scaleFor(width)
  const { ascent, descent } = textMetrics(shape.text, shape.size)

  const top = (shape.at.y - ascent) * scale
  const height = (ascent + descent) * scale
  const left = shape.at.x * scale

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [])

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Everything else — arrows, word jumps, select-all — belongs to the input.
    if (event.key === 'Enter') onCommit()
    if (event.key === 'Escape') onCancel()
    event.stopPropagation()
  }

  return (
    <foreignObject
      x={left}
      y={top}
      width={Math.max(40, width - left)}
      height={height}
      // Otherwise the pointer press that places the caret is also read by the
      // surface as the start of a new shape.
      onPointerDown={(event: PointerEvent) => event.stopPropagation()}
      onPointerMove={(event: PointerEvent) => event.stopPropagation()}
      onPointerUp={(event: PointerEvent) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <input
        ref={input}
        className="text-input"
        value={shape.text}
        // Its colour is the shape's, so what you type looks like what you get.
        style={{
          fontSize: shape.size * scale,
          height,
          lineHeight: `${height}px`,
          color: shape.color,
        }}
        onChange={(event) => onChange({ ...shape, text: event.target.value })}
        onKeyDown={onKeyDown}
        onBlur={onCommit}
        aria-label="Annotation text"
      />
    </foreignObject>
  )
}
