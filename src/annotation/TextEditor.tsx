import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { scaleFor } from './coords'
import { TEXT_LINE, textLines, textMetrics } from './geometry'
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
 * A real textarea, positioned over where the text will render, one row per
 * line. Enter finishes the label and Shift+Enter starts a new line, so a
 * label is usually one line and can be two when a diagram wants it.
 *
 * Typing used to be a window keydown listener appending characters, which
 * meant no caret placement, no selection, no word deletion, no clipboard, no
 * IME, and no on-screen keyboard on a touch panel. None of that is worth
 * reimplementing — a textarea has it all, and it is the same foreignObject
 * mechanism the widgets already use.
 */
export function TextEditor({ shape, width, onChange, onCommit, onCancel }: Props) {
  const input = useRef<HTMLTextAreaElement>(null)
  const scale = scaleFor(width)
  const { ascent, descent } = textMetrics(shape.text, shape.size)
  const lines = textLines(shape.text).length
  const lineHeight = shape.size * TEXT_LINE * scale

  const top = (shape.at.y - ascent) * scale
  const height = (ascent + descent) * scale
  const left = shape.at.x * scale
  // A textarea centres each line's glyph box in its line box; the label's
  // first baseline is at the top of the font box. Push down by the difference
  // when the line box is the shorter, so the two baselines meet.
  const glyphBox = (ascent + descent - (lines - 1) * shape.size * TEXT_LINE) * scale
  const paddingTop = Math.max(0, (glyphBox - lineHeight) / 2)

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [])

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Everything else — arrows, word jumps, select-all — belongs to the textarea.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onCommit()
    }
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
      <textarea
        ref={input}
        className="text-input"
        value={shape.text}
        rows={lines}
        // Its colour is the shape's, so what you type looks like what you get.
        style={{
          fontSize: shape.size * scale,
          height,
          lineHeight: `${lineHeight}px`,
          paddingTop,
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
