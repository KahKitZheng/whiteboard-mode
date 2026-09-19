import { useEffect, useState, type KeyboardEvent } from 'react'
import { useWhiteboardMode } from './WhiteboardMode'
import './widget.scss'

type Props = {
  text: string
  color: string
  fontSize: number
  /** Called once per edit, when the note loses focus with its words changed. */
  onText: (text: string) => void
}

/**
 * A sticky note: coloured paper with a textarea on it while the whiteboard is
 * armed, and the same words as plain text while it is off. The words live in
 * the shape; typing is local until the note is left, so one edit is one undo.
 * The strip along the top is not a control, so the select tool has somewhere
 * to take hold of it — a tap on the paper itself is a tap on the textarea.
 */
export function Note({ text, color, fontSize, onText }: Props) {
  const { active } = useWhiteboardMode()
  const [draft, setDraft] = useState(text)

  // Undo, or another client, changed the stored words: show those.
  useEffect(() => setDraft(text), [text])

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Typing is the note's, not the surface's: Backspace must not delete the
    // shape, and the arrows must not turn the slide.
    event.stopPropagation()
    if (event.key === 'Escape') event.currentTarget.blur()
  }

  return (
    <div className="widget note" style={{ fontSize, '--note': color } as React.CSSProperties}>
      <div className="note-bar" />
      {active ? (
        <textarea
          className="note-text"
          value={draft}
          placeholder="Type here"
          aria-label="Sticky note"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft !== text && onText(draft)}
        />
      ) : (
        // Off, annotations are inert: the words are shown, not offered for editing.
        <div className="note-text">{text}</div>
      )}
    </div>
  )
}
